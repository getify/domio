"use strict";

// import from Monio
var { isMonad, curry, liftM, } = require("monio/util");
var IO = require("monio/io");
var {
	listFilterInIO,
	iif,
	elif,
	els,
	iNot,
	iReturn,
	getPropIO,
	assignPropIO,
} = require("monio/io-helpers");

// internal imports
var {
	invokeMethod,
	listHead,
	prop,
	compose,
} = require("./fp-helpers.js");
var { waitOnce, } = require("./event-helpers.js");


// **********************************


var whenDOMReady = () => IO.do(
	function *whenDOMReady({ document, } = {}){
		return iif((
			// DOM root object defined
			document &&
			// but DOM not ready yet?
			!(
				document.readyState &&
				document.readyState != "loading"
			)
		),[
			// listen for the DOM-ready event
			waitOnce(document,"DOMContentLoaded")
		]);
	}
);
var getElement = id => (
	IO(({ document, } = {}) => document.getElementById(id))
);
var findElements = invokeMethodIO("querySelectorAll");
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
var setCSSVar = (el,propName,val) => (
	invokeMethodIO("setProperty")
	(
		getPropIO("style",el),
		`--${propName}`,
		val
	)
);
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
	IO(({ window, } = {}) => window.getSelection())
);
var emptySelection = invokeMethodIO("empty");
var removeAllRanges = invokeMethodIO("removeAllRanges");


// **********************************


// adapted from: https://gist.github.com/RavenZZ/f0ce802249056fb55d9effeb8cf0b6c5
function *clearTextSelection({ window, document, } = {}) {
	try {
		yield iif(window.getSelection,function *then(){
			var sel = yield getCurrentSelection();

			// Chrome?
			yield iif(!!sel.empty,emptySelection(IO.of(sel)),
			// Firefox?
			elif(!!sel.removeAllRanges,removeAllRanges(IO.of(sel))));
		},
		// IE?
		elif(document.selection,
			emptySelection(IO.of(document.selection))
		));
	}
	catch (err) {}
}

function invokeMethodIO(methodName) {
	return (obj,...args) => (
		liftM(obj).chain(obj => (
			IO(() => obj[methodName](...args))
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
	setCSSVar,
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
module.exports.setCSSVar = setCSSVar;
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
