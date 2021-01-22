"use strict";

var {
	identity,
	setProp,
	chainAll,
} = require("./fp-helpers.js");

// import from Monio
var IO = require("monio/io");
var {
	iif,
	els,
	iReturn,
} = require("monio/io-helpers");


// **********************************


var log = msg => IO(() => console.log(msg));
var getReader = () => IO(identity);
var getState = prop => (
	IO(({ state: { [prop]: val, } = {}, } = {}) => val)
);
var getStates = (...props) => (
	IO(({ state = {}, } = {}) => (
		props.reduce(
			(list,prop) => [ ...list, state[prop], ],
			[]
		)
	))
);
var getCurrentState = () => IO(({ state = {} } = {}) => state);
var setState = (prop,val) => state => (
	IO(() => setProp(prop,val)(state))
);
var setStates = (...tuples) => state => (
	IO(() => (
		tuples.reduce(
			(state,[ prop, val ]) => setProp(prop,val)(state),
			state
		)
	))
);
var saveCurrentState = state => IO((env = {}) => (env.state = state));
var updateState = (...steps) => (
	chainAll(...steps,saveCurrentState)(getCurrentState())
);

function shareStates(allowedStates) {
	return function *getSharedState(env,state){
		return (
			yield iif(allowedStates.includes(state),[
				iReturn(getState(state)),
			],
			els(
				iReturn(undefined)
			))
		).returned;
	};
}


// **********************************


// expose misc helpers on API
module.exports = {
	log,
	getState,
	getStates,
	getCurrentState,
	setState,
	setStates,
	saveCurrentState,
	updateState,
	shareStates,
};
module.exports.log = log;
module.exports.getState = getState;
module.exports.getStates = getStates;
module.exports.getCurrentState = getCurrentState;
module.exports.setState = setState;
module.exports.setStates = setStates;
module.exports.saveCurrentState = saveCurrentState;
module.exports.updateState = updateState;
module.exports.shareStates = shareStates;
