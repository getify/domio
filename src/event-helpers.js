"use strict";

// import from Monio
var { isMonad, liftM, } = require("monio/util");
var Either = require("monio/either");
var IO = require("monio/io");
var IOx = require("monio/iox");
var {
	log,
	doIO,
	doIOBind,
	match,
	iif,
	iNot,
	iReturn,
	wasReturned,
} = require("monio/io/helpers");
var { waitFor, } = require("monio/iox/helpers");

// internal imports
var { eq, listFilterOut, } = require("./fp-helpers.js");
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
	// lift `el` to an IOx instance
	let m = isMonad(el) ? el : IOx.of(el);
	if (!IOx.is(m)) {
		if (IO.is(m)) {
			m = IOx.fromIO(m);
		}
		else {
			// NOTE: intentional 'chain(..)' instead of 'map(..)',
			// even though a non-IOx monad's chain() is returning
			// an IOx, which is sorta no-no
			m = m.chain(IOx.of);
		}
	}

	return m.chain(el => waitFor(IOx.onceEvent(el,evtName,opts)));
}

function raf(nextFrame = true) {
	return IO(() =>
		new Promise(res => (
			requestAnimationFrame(() => (
				nextFrame ? requestAnimationFrame(res) : res()
			))
		))
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

		var nextDOMEvent = IOx.of.empty();

		// create own reader-env
		env = {
			events,

			nextDOMEvent,

			// local state management
			state: {
				running: true,
				elements: new Map(),
				routers: [],
			},
		};

		// setup IOx to listen for and handle all DOM events
		env.listener = IOx.do(routeDOMEvent,[ nextDOMEvent ]).run(env);

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

function *listenDOMEvent({ nextDOMEvent, },el,evtName,options = false) {
	// unwrap DOM element if monad
	el = yield liftM(el);

	// abort if DOM events are already stopped
	yield doIO(throwIfNotRunning);

	var elements = yield getState("elements");
	// normalize options
	options = (
		(options && typeof options == "object") ? options :
		(typeof options == "boolean") ? { capture: options, } :
		{}
	);
	var capture = options.capture = !!options.capture;
	var bindingLabel = `${evtName}:${capture}`;
	var evtStreams = elements.has(el) ? elements.get(el) : {};

	// new listener?
	return match(
		!evtStreams[bindingLabel], [function *then(env){
			evtStreams = {
				...evtStreams,

				// sets up stream (actual event binding is lazy)
				[bindingLabel]: [
					IOx.onEvent(el,evtName,{ evtOpts: options }),
					/*listenerCount=*/1,
				],
			};
			// connect DOM event listener stream to merged event
			// stream
			evtStreams[bindingLabel][0].chain(evt => (
				IO.of(nextDOMEvent(evt))
			)).run(env);

			elements = new Map(elements);
			elements.set(el,evtStreams);
			yield updateState(setState("elements",elements));
		}],
		[function *otherwise(){
			// increment the listener count
			evtStreams = { ...evtStreams, };
			let [ stream, count, ] = evtStreams[bindingLabel];
			evtStreams[bindingLabel] = [ stream, count + 1, ];
			elements = new Map(elements);
			elements.set(el,evtStreams);
			yield updateState(setState("elements",elements));
		}]
	);
}

function *unlistenDOMEvent(env,el,evtName,options = false) {
	// unwrap DOM element if monad
	el = yield liftM(el);

	// abort if DOM events is already stopped
	yield doIO(throwIfNotRunning);

	var elements = yield getState("elements");
	// normalize options
	options = (
		(options && typeof options == "object") ? options :
		(typeof options == "boolean") ? { capture: options, } :
		{}
	);
	var capture = options.capture = !!options.capture;
	var bindingLabel = `${evtName}:${capture}`;

	return iif(elements.has(el), [function *then(){
		var evtStreams = elements.get(el);
		var [ stream, count, ] = evtStreams[bindingLabel] || [];

		yield iif(!!stream, $=>[
			match(
				// multiple listeners?
				count > 1, [function *then(){
					// decrement the listener count
					evtStreams = { ...evtStreams, };
					let [ stream, count, ] = evtStreams[bindingLabel];
					evtStreams[bindingLabel] = [ stream, count - 1, ];
					elements = new Map(elements);
					elements.set(el,evtStreams);
					yield updateState(setState("elements",elements));
				}],
				// otherwise, last listener should be removed
				[function *otherwise(){
					yield closeStream(stream);

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
				}]
			),
		]);
	}]);
}

function *addDOMRouter(env,updateRouters) {
	// abort if DOM events is already stopped
	yield doIO(throwIfNotRunning);

	var routers = yield getState("routers");
	return updateState(
		setState("routers",updateRouters(routers))
	);
}

function *removeDOMRouter(env,router) {
	// abort if DOM events is already stopped
	yield doIO(throwIfNotRunning);

	var routers = yield getState("routers");
	return updateState(
		setState("routers",listFilterOut(eq(router))(routers))
	);
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

	return iif(running, [function *then(){
		// attempt router delegation (in reverse order)
		for (let router of routers) {
			// still running?
			let matchRes = yield match(
				getState("running"),[function *then(){
					var evtHandled = yield router(evt);
					// was the event handled (completely) by the router?
					return iif(evtHandled === true,
						iReturn()
					);
				}],
				$=>[
					iReturn("break"),
				]
			);

			// did the if/else return a "break" or "return" signal?
			if (wasReturned(matchRes)) {
				if (matchRes.returned == "break") {
					break;
				}
				else {
					return;
				}
			}
		}

		// if we get here (no early return), it's an unhandled event, so emit
		// it for last-ditch tracking/logging purposes
		yield emitEvent("DOM-event",evt);
	}]);
}

function *stopManagingDOMEvents({ nextDOMEvent, }) {
	var [
		running,
		elements,
	] = yield getStates(
		"running",
		"elements",
	);

	return iif(running, [function *then(){
		// teardown all current event streams and
		// unbind their underlying event listeners
		yield closeStream(nextDOMEvent);
		for (let elementBindings of elements) {
			for (let [ stream, ] of Object.values(elementBindings)) {
				yield closeStream(stream);
			}
		}
		elements = null;

		// reset states for cleanup purposes
		return updateState(
			setStates(
				[ "running", false ],
				[ "elements", null ],
				[ "routers", null ],
			)
		);
	}]);
}

function *throwIfNotRunning() {
	return iif(iNot(getState("running")),[function *then(){
		throw new Error("DOM events management already stopped");
	}]);
}

function closeStream(stream) {
	return IO(() => stream.close());
}
