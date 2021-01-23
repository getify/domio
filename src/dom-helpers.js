"use strict";

// import from Monio
var { isMonad, } = require("monio/util");
var IO = require("monio/io");
var {
	listFilterInIO,
	iif,
	elif,
	els,
	iReturn,
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


var whenDOMReady = () => IO((env = {}) => (
	iif(env.document && env.document.readyState && env.document.readyState != "loading",[
		iReturn(),
	],
	els(
		waitOnce(env.document,"DOMContentLoaded")
	)).run(env)
));
var getElement = id => (
	IO(({ document, } = {}) => document.getElementById(id))
);
var findElements = (el,selector) => (
	IO(() => el.querySelectorAll(selector))
);
var findElement = compose(
	invokeMethod("chain",compose(IO.of,listHead)),
	findElements
);
var modifyClassList = (el,methodName,...classNames) => (
	IO(() => (
		compose(
			invokeMethod(methodName,...classNames),
			prop("classList")
		)(el)
	))
);
var addClass = (el,...classNames) => (
	modifyClassList(el,"add",...classNames)
);
var removeClass = (el,...classNames) => (
	modifyClassList(el,"remove",...classNames)
);
var setCSSVar = (el,propName,val) => (
	IO(() => (
		el.style.setProperty(`--${propName}`,val)
	))
);
var matches = (el,selector) => IO(() => el.matches(selector));
var closest = (el,selector) => IO(() => el.closest(selector));
var getRadioValue = (el,name) => IO.do(function *getRadioValue(){
	var radios = yield findElements(el,`[name='${name}']`);
	var checkedRadioEl = listHead(
		yield listFilterInIO(isChecked,[ ...radios ])
	);
	return checkedRadioEl.value;
});
var getHTML = el => IO(() => el.innerHTML);
var setHTML = (el,source) => (
	(
		// lift to monad (if necessary)
		isMonad(source) ? source : IO.of(source)
	)
	.map(html => el.innerHTML = html)
);
var disableElement = el => IO(() => el.disabled = true);
var enableElement = el => IO(() => el.disabled = false);
var isChecked = el => IO(() => !!el.checked);
var isEnabled = el => IO(() => !el.disabled);
var focusElement = el => IO(() => el.focus());
var blurElement = el => IO(() => el.blur());
var getCurrentSelection = () => (
	IO(({ window, } = {}) => window.getSelection())
);
var emptySelection = (sel = getCurrentSelection()) => (
	sel.map(sel => sel.empty())
);
var removeAllRanges = (sel = getCurrentSelection()) => (
	sel.map(sel => sel.removeAllRanges())
);

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
	isEnabled,
	focusElement,
	blurElement,
	getCurrentSelection,
	emptySelection,
	removeAllRanges,
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
module.exports.isEnabled = isEnabled;
module.exports.focusElement = focusElement;
module.exports.blurElement = blurElement;
module.exports.getCurrentSelection = getCurrentSelection;
module.exports.emptySelection = emptySelection;
module.exports.removeAllRanges = removeAllRanges;
module.exports.clearTextSelection = clearTextSelection;
