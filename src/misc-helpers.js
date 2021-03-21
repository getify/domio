"use strict";

// import from Monio
var IO = require("monio/io");
var {
	match,
	iif,
	iReturn,
} = require("monio/io/helpers");

// internal imports
var {
	setProp,
	chainAll,
} = require("./fp-helpers.js");


// **********************************


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
			yield match(
				allowedStates.includes(state), $=>[
					iReturn(getState(state)),
				],
				$=>[
					iReturn(undefined)
				]
			)
		).returned;
	};
}


// **********************************


// expose misc helpers on API
module.exports = {
	getState,
	getStates,
	getCurrentState,
	setState,
	setStates,
	saveCurrentState,
	updateState,
	shareStates,
};
module.exports.getState = getState;
module.exports.getStates = getStates;
module.exports.getCurrentState = getCurrentState;
module.exports.setState = setState;
module.exports.setStates = setStates;
module.exports.saveCurrentState = saveCurrentState;
module.exports.updateState = updateState;
module.exports.shareStates = shareStates;
