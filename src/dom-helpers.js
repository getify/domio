"use strict";

// import from Monio
var {
	isFunction,
	isMonad,
	curry,
	liftM,
} = require("monio/util");
var IO = require("monio/io");
var {
	listFilterInIO,
	match,
	iif,
	iNot,
	iAnd,
	iReturn,
	getPropIO,
	assignPropIO,
} = require("monio/io/helpers");

// internal imports
var {
	invokeMethod,
	listOf,
	listHead,
	prop,
	compose,
} = require("./fp-helpers.js");
var { waitOnce, } = require("./event-helpers.js");


// **********************************


var whenDOMReady = () => IO.do(
	function *whenDOMReady({
		// NOTE: intentionally providing impure default
		// fallback values here, for convenience
		window: win = window,
		document: doc = win.document || document,
	} = {}){
		return iif(iAnd(
			// DOM root object defined
			doc,
			// but DOM not ready yet?
			iNot(iAnd(
				doc.readyState,
				doc.readyState != "loading"
			))
		), $=>[
			// listen for the DOM-ready event
			waitOnce(doc,"DOMContentLoaded")
		]);
	}
);
var getElement = id => (
	IO(({
		// NOTE: intentionally providing impure default
		// fallback values here, for convenience
		window: win = window,
		document: doc = win.document || document,
	} = {}) => doc.getElementById(id))
);
var findElements = compose(
	invokeMethod("map",listOf),
	invokeMethodIO("querySelectorAll")
);
var findElement = compose(
	invokeMethod("map",listHead),
	findElements
);
var modifyClassList = methodName => (
	(el,...args) => (
		invokeMethodIO(methodName)
		(
			getPropIO("classList",el),
			...args
		)
	)
);
var addClass = modifyClassList("add");
var removeClass = modifyClassList("remove");
var getCSSVar = (el,varName) => (
	// NOTE: intentional 'chain(..)' instead of 'map(..)'
	liftM(el).chain(el => (
		IO(({
			// NOTE: intentionally providing impure default
			// fallback values here, for convenience
			window: win = window,
			getComputedStyle = win.getComputedStyle,
		} = {}) => (
			getComputedStyle(el)
			.getPropertyValue(`--${varName}`)
		))
	))
)
var setCSSVar = (el,varName,val) => (
	liftM(val).chain(
		curry(invokeMethodIO("setProperty"),3)
		(
			getPropIO("style",el),
			`--${varName}`,
		)
	)
);
var getDOMAttr = invokeMethodIO("getAttribute");
var assignDOMAttr = (el,attrName,val) => (
	liftM(val).chain(
		curry(invokeMethodIO("setAttribute"),3)
		(
			el,
			attrName,
		)
	)
);
var removeDOMAttr = invokeMethodIO("removeAttribute");
var matches = invokeMethodIO("matches");
var closest = invokeMethodIO("closest");
var getRadioValue = (el,name) => IO.do(function *getRadioValue(){
	el = yield liftM(el);
	var radios = yield findElements(el,`[name='${name}']`);
	var checkedRadioEl = listHead(
		yield listFilterInIO(isChecked,[ ...radios ])
	);
	return checkedRadioEl.value;
});
var getHTML = curry(getPropIO)("innerHTML");
var setHTML = (el,html) => assignPropIO("innerHTML",html,el);
var disableElement = curry(assignPropIO)("disabled",true);
var enableElement = curry(assignPropIO)("disabled",false);
var isChecked = curry(getPropIO)("checked");
var isDisabled = curry(getPropIO)("disabled");
var isEnabled = el => iNot(isDisabled(el));
var focusElement = invokeMethodIO("focus");
var blurElement = invokeMethodIO("blur");


// **********************************


var getCurrentSelection = () => (
	IO(({
		// NOTE: intentionally providing impure default
		// fallback value here, for convenience
		window: win = window,
	} = {}) => win.getSelection())
);
var emptySelection = invokeMethodIO("empty");
var removeAllRanges = invokeMethodIO("removeAllRanges");


// **********************************


// adapted from: https://gist.github.com/RavenZZ/f0ce802249056fb55d9effeb8cf0b6c5
function *clearTextSelection({
	// NOTE: intentionally providing impure default
	// fallback values here, for convenience
	window: win = window,
	document: doc = win.document || document,
} = {}) {
	try {
		yield match(
			win.getSelection, [function *then(){
				var sel = yield getCurrentSelection();

				yield match(
					// Chrome?
					!!sel.empty, $=>[
						emptySelection(IO.of(sel)),
					],
					// Firefox?
					!!sel.removeAllRanges, $=>[
						removeAllRanges(IO.of(sel)),
					]
				);
			}],
			// IE?
			doc.selection, $=>[
				emptySelection(IO.of(doc.selection)),
			]
		);
	}
	catch (err) {}
}

function invokeMethodIO(methodName) {
	return (obj,...args) => (
		// NOTE: intentional 'chain(..)' instead of 'map(..)'
		liftM(obj).chain(obj => (
			IO(() => (
				isFunction(obj[methodName]) ?
					obj[methodName](...args) :
					undefined
			))
		))
	);
}


// **********************************


// expose DOM helpers on API
module.exports = {
	whenDOMReady,
	getElement,
	findElements,
	findElement,
	addClass,
	removeClass,
	getCSSVar,
	setCSSVar,
	getDOMAttr,
	assignDOMAttr,
	removeDOMAttr,
	matches,
	closest,
	getRadioValue,
	getHTML,
	setHTML,
	disableElement,
	enableElement,
	isChecked,
	isDisabled,
	isEnabled,
	focusElement,
	blurElement,
	clearTextSelection,
};
module.exports.whenDOMReady = whenDOMReady;
module.exports.getElement = getElement;
module.exports.findElements = findElements;
module.exports.findElement = findElement;
module.exports.addClass = addClass;
module.exports.removeClass = removeClass;
module.exports.getCSSVar = getCSSVar;
module.exports.setCSSVar = setCSSVar;
module.exports.getDOMAttr = getDOMAttr;
module.exports.assignDOMAttr = assignDOMAttr;
module.exports.removeDOMAttr = removeDOMAttr;
module.exports.matches = matches;
module.exports.closest = closest;
module.exports.getRadioValue = getRadioValue;
module.exports.getHTML = getHTML;
module.exports.setHTML = setHTML;
module.exports.disableElement = disableElement;
module.exports.enableElement = enableElement;
module.exports.isChecked = isChecked;
module.exports.isDisabled = isDisabled;
module.exports.isEnabled = isEnabled;
module.exports.focusElement = focusElement;
module.exports.blurElement = blurElement;
module.exports.clearTextSelection = clearTextSelection;
