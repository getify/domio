"use strict";

// import from Monio
var Either = require("monio/either");
var IO = require("monio/io");
var {
	log,
	applyIO,
	doIO,
	doIOBind,
	iif,
	elif,
	els,
	iNot,
	iReturn,
	wasReturned,
} = require("monio/io-helpers");
var IOEventStream = require("monio/io-event-stream");

// internal imports
var {
	eq,
	listHead,
	listMap,
	listFilterOut,
	listFlatMap,
	compose,
} = require("./fp-helpers.js");
var {
	getState,
	getStates,
	setState,
	setStates,
	updateState,
} = require("./misc-helpers.js");

// expose event helpers on API
module.exports = {
	emitEvent,
	waitOnce,
	raf,
	cancelEvent,
	isKeyboardEvent,
	manageDOMEvents,
};
module.exports.emitEvent = emitEvent;
module.exports.waitOnce = waitOnce;
module.exports.raf = raf;
module.exports.cancelEvent = cancelEvent;
module.exports.isKeyboardEvent = isKeyboardEvent;
module.exports.manageDOMEvents = manageDOMEvents;


// ****************************************


function emitEvent(type,...args) {
	return IO(({ events, } = {}) => (
		events ? events.emit(type,...args) : undefined
	));
}

function waitOnce(el,evtName,opts) {
	return IO(async function waitOnce(){
		var stream = IOEventStream(el,evtName,{ evtOpts: opts, }).run();
		var res = await stream.next();
		await stream.return();
		return res.value;
	});
}

function raf() {
	return IO(() =>
		new Promise(res => requestAnimationFrame(res))
	);
}

function cancelEvent(evt) {
	return IO(() => {
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	});
}

function isKeyboardEvent(evt) {
	return (evt.clientX == 0 && evt.clientY == 0);
}

function manageDOMEvents(evtEmitter) {
	return IO.do(function *manageDOMEvents(env = {}){
		// get the event-emitter (if any)
		var events = env.events || evtEmitter;

		// create own reader-env
		env = {
			events,

			// include the control-stream components
			...(yield doIO(initControlStream)),

			// local state management
			state: {
				running: true,
				elements: new Map(),
				routers: [],
			},
		};

		// run the DOM event router in the background
		// in its new reader-env
		//
		// NOTE: even though we yield here (to indicate
		// side-effects), we aren't waiting on it; it's
		// a persistent background process (IO do-routine)
		// that's only torn down by calling stop()
		yield applyIO(doIOBackground(listenForDOMEvents),env);

		// expose the (env-bound) controller API
		return {
			listen: doIOBind(listenDOMEvent,env),
			unlisten: doIOBind(unlistenDOMEvent,env),
			route: doIOBind(addDOMRouter,env),
			unroute: doIOBind(removeDOMRouter,env),
			stop: doIOBind(stopManagingDOMEvents,env),
		};
	});
}

function *listenDOMEvent({ controlSignal, },el,evtName,options = false) {
	var [
		running,
		elements,
	] = yield getStates(
		"running",
		"elements",
	);
	// normalize options
	options = (
		(options && typeof options == "object") ? options :
		(typeof options == "boolean") ? { capture: options, } :
		{}
	);
	var capture = options.capture = !!options.capture;
	var bindingLabel = `${evtName}:${capture}`;

	var ifres = yield iif(running,function *then(){
		var evtStreams = elements.has(el) ? elements.get(el) : {};

		// new listener?
		yield iif(!evtStreams[bindingLabel],function *then(){
			evtStreams = {
				...evtStreams,

				// sets up stream (actual event binding is lazy)
				[bindingLabel]: [
					yield IOEventStream(el,evtName,{ evtOpts: options, }),
					/*listenerCount=*/1,
				],
			};
			elements = new Map(elements);
			elements.set(el,evtStreams);
			yield updateState(setState("elements",elements));

			// signal that new stream was added to listen to
			yield controlSignal;
		},
		els(function *otherwise(){
			// increment the listener count
			evtStreams = { ...evtStreams, };
			let [ stream, count, ] = evtStreams[bindingLabel];
			evtStreams[bindingLabel] = [ stream, count + 1, ];
			elements = new Map(elements);
			elements.set(el,evtStreams);
			yield updateState(setState("elements",elements));
		}));
	});

	// not running anymore?
	if (!ifres) {
		throw new Error("DOM events management already stopped");
	}
}

function *unlistenDOMEvent({ controlSignal, },el,evtName,options = false) {
	var [
		running,
		elements,
	] = yield getStates(
		"running",
		"elements",
	);
	// normalize options
	options = (
		(options && typeof options == "object") ? options :
		(typeof options == "boolean") ? { capture: options, } :
		{}
	);
	var capture = options.capture = !!options.capture;
	var bindingLabel = `${evtName}:${capture}`;

	var ifres = yield iif(running && elements.has(el),function *then(){
		var evtStreams = elements.get(el);
		var [ stream, count, ] = evtStreams[bindingLabel] || [];

		yield iif(!!stream,[
			// multiple listeners?
			iif(count > 1,function *then(){
				// decrement the listener count
				evtStreams = { ...evtStreams, };
				let [ stream, count, ] = evtStreams[bindingLabel];
				evtStreams[bindingLabel] = [ stream, count - 1, ];
				elements = new Map(elements);
				elements.set(el,evtStreams);
				yield updateState(setState("elements",elements));
			},
			// otherwise, last listener should be removed
			els(function *elsedo(){
				evtStreams = { ...evtStreams, };
				delete evtStreams[bindingLabel];
				elements = new Map(elements);
				if (Object.keys(evtStreams).length > 0) {
					elements.set(el,evtStreams);
				}
				else {
					elements.delete(el);
				}
				yield updateState(setState("elements",elements));

				// unbind event listener and close stream
				yield IOEventStream.close(stream);

				// signal stream should no longer be listened to
				yield controlSignal;
			})),
		]);
	});

	// not running anymore?
	if (!ifres) {
		throw new Error("DOM events management already stopped");
	}
}

function *addDOMRouter(env,updateRouters) {
	var [
		running,
		routers,
	] = yield getStates(
		"running",
		"routers",
	);

	var ifres = yield iif(running,
		updateState(
			setState("routers",updateRouters(routers))
		)
	);

	// not running anymore?
	if (!ifres) {
		throw new Error("DOM events management already stopped");
	}
}

function *removeDOMRouter(env,router) {
	var [
		running,
		routers,
	] = yield getStates(
		"running",
		"routers",
	);

	var ifres = yield iif(running,
		updateState(
			setState("routers",listFilterOut(eq(router))(routers))
		)
	);

	// not running anymore?
	if (!ifres) {
		throw new Error("DOM events management already stopped");
	}
}

function *initControlStream(env) {
	const SIGNAL = Symbol("control signal");
	// bare minimum event-emitter shim
	var control = {
		cb: null,
		on(x,cb) { control.cb = cb; },
		emit(type,...args) {
			if (control.cb) {
				control.cb(...args);
			}
		},
		off(x,cb) {	control.cb = null; },
	};
	var controlStream = yield IOEventStream(control,"signal");

	return {
		controlStream,
		controlSignal: IO(() => control.emit("signal",SIGNAL)),
		SIGNAL,
	};
}

function *getEventStreams(env) {
	var [
		running,
		elements,
	] = yield getStates(
		"running",
		"elements",
	);

	var ifres = yield iif(running,function *then(){
		var collectStreams = listFlatMap(
			compose(listMap(listHead),Object.values)
		);
		return iReturn(
			collectStreams([ ...elements.values(), ])
		);
	},
	els(
		iReturn([])
	));

	// was there an "early return" from inside the if/else
	// branches?
	if (wasReturned(ifres)) {
		return ifres.returned;
	}
}

// listen to all DOM event streams and route out
// any received events
async function *listenForDOMEvents({ SIGNAL, controlStream, }) {
	var streams;
	var streamHeads = new Map();
	streamHeads.set(controlStream,getNextControlSignal());
	var scheduleRRQueue = [];

	try {
		while (true) {
			// have we stopped listening for DOM events?
			if (!(yield getState("running"))) {
				return;
			}

			// need to (re)acquire the list of streams?
			yield iif(!streams,function *then(){
				streams = yield doIO(getEventStreams);

				// check existing scheduled stream heads
				for (let stream of streamHeads.keys()) {
					yield iif((
						// ignore the control-signal stream
						stream != controlStream &&

						// no longer listening to this event stream?
						!streams.includes(stream)
					),
					function then(){
						// remove from schedule queue
						var headPr = streamHeads.get(stream);
						var idx = scheduleRRQueue.indexOf(headPr);
						scheduleRRQueue.splice(idx,1);
						streamHeads.delete(stream);
					});
				}

				// check list of current streams
				for (let stream of streams) {
					// stream not yet in the schedule queue?
					yield iif(!streamHeads.has(stream),function then(){
						// insert promise for head of stream
						// at end of scheduling queue
						var headPr = getStreamHead(stream);
						scheduleRRQueue.push(headPr);
						streamHeads.set(stream,headPr);
					});
				}
			});

			// wait for a signal or DOM event
			let evt = await Promise.race([
				// control signal promise
				streamHeads.get(controlStream),

				// round-robin queue of stream-head promises
				Promise.race([ ...scheduleRRQueue, ]),
			]);

			// control signal received?
			let ifres = yield iif(evt == SIGNAL,function *then(){
				// have we stopped?
				var ifres2 = yield iif(iNot(getState("running")),[
					// send return signal so we can exit
					iReturn()
				],
				elif(function elseif(){
					// throw away (to re-acquire) list of streams
					streams = null;

					// get a promise for the next control signal
					streamHeads.set(controlStream,getNextControlSignal());
				}));

				// was there an "early return" from inside the
				// if/else branches?
				if (wasReturned(ifres2)) {
					return ifres2;
				}
			},
			elif(!!evt,
				// route the DOM event to its handler
				doIO(routeDOMEvent,evt)
			),
			els([
				// should never get here!
				log("undefined value from stream"),
				// send return signal so we can exit
				iReturn(),
			]));

			// was there an "early return" from inside the
			// if/else branches?
			if (wasReturned(ifres)) {
				return ifres.returned;
			}
		}
	}
	finally {
		yield iif(!!streams,function *then(){
			// NOTE: does not wait for the streams
			// to finish closing
			yield IOEventStream.close(controlStream,...streams);
			streamHeads.clear();
			streams = scheduleRRQueue = null;
		});
	}


	// ****************************************

	async function getNextControlSignal() {
		// wait for a control signal
		var res = await controlStream.next();
		// return the received control signal
		return res.value;
	}

	async function getStreamHead(stream) {
		// wait for stream to send an event
		var res = await stream.next();
		// is stream still being listened to?
		if (streamHeads.has(stream)) {
			// remove previous head-promise from scheduling queue
			let oldHeadPr = streamHeads.get(stream);
			streamHeads.delete(stream);
			let idx = scheduleRRQueue.indexOf(oldHeadPr);
			scheduleRRQueue.splice(idx,1);

			if (!res.done) {
				// get a promise for the next stream head, and insert
				// it at end of scheduling queue (round-robin)
				let nextHeadPr = getStreamHead(stream);
				scheduleRRQueue.push(nextHeadPr);
				streamHeads.set(stream,nextHeadPr);
			}
		}
		// return the received stream event
		return res.value;
	}
}

// route events from all streams
function *routeDOMEvent(env,evt) {
	var [
		running,
		routers,
	] = yield getStates(
		"running",
		"routers",
	);

	var ifres = yield iif(running,function *then(){
		// attempt router delegation (in reverse order)
		for (let router of routers) {
			let ifres2 = yield iif(getState("running"),function *then(){
				var evtHandled = yield router(evt);
				// was the event handled (completely) by the router?
				return iif(evtHandled === true,
					// treated like a full early-return
					iReturn()
				);
			},
			els(
				// using "return" mechanism to signal intent to
				// break out of the loop
				//
				// note: this signal will not propagated out as a full
				// early return
				iReturn("break")
			));

			// did the if/else return a "break" or "return" signal?
			if (wasReturned(ifres2)) {
				// "break" out of the loop?
				if (ifres2.returned === "break") {
					return;
				}
				else {
					// propagate the full early-return signal out
					return ifres2.returned;
				}
			}
		}
	});

	// was there an "early return" from inside the if/else
	// branches?
	if (wasReturned(ifres)) {
		return ifres.returned;
	}

	// if we get here, it's an unhandled event, so emit
	// it for last-ditch tracking/logging purposes
	yield emitEvent("DOM-event",evt);
}

function *stopManagingDOMEvents({ controlStream, controlSignal, }) {
	var [
		running,
		elements,
		routers,
	] = yield getStates(
		"running",
		"elements",
		"routers",
	);

	yield iif(running,function *then(){
		// teardown all current event streams and
		// unbind their underlying event listeners
		//
		// NOTE: does not wait for the streams
		// to finish closing
		let streams = yield doIO(getEventStreams);
		yield IOEventStream.close(...streams);

		// reset states for cleanup purposes
		yield updateState(
			setStates(
				[ "running", false ],
				[ "elements", null ],
				[ "routers", null ],
			)
		);

		// tear down the background DOM events handler
		yield controlSignal;

		// NOTE: does not wait for the stream
		// to finish closing
		yield IOEventStream.close(controlStream);
	});
}

function doIOBackground(fn,...args) {
	return (
		(args.length > 0) ?
			IO(env => void(
				IO.do(fn(env,...args))
				.run(env)
				.catch(reportError)
			)) :
			IO(env => void(
				IO.do(fn)
				.run(env)
				.catch(reportError)
			))
	);
}

function reportError(err) {
	if (Either.Left.is(err)) {
		err.fold(console.log,() => {});
	}
	else if (typeof err == "string") {
		console.log(err);
	}
	else if (err.stack) {
		console.log(err.stack);
	}
	else {
		console.log(err.toString());
	}
}
