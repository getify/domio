"use strict";

// import from Monio
var { curry, } = require("monio/util");


// **********************************


var identity = v => v;
var apply = fn => (args => fn(...args));
var unapply = fn => ((...args) => fn(args));
var invokeMethod = (fnName,...args) => (obj => (
	obj[fnName](...args)
));
var prop = key => (obj => obj[key]);
var setProp = (prop,val) => ((obj = {}) => (
	{ ...obj, [prop]: val, }
));
var eq = curry(Object.is,2);
var not = fn => ((...args) => !fn(...args));
var listHead = list => list[0];
var listTail = invokeMethod("slice",1);
var listFilterIn = pred => invokeMethod("filter",pred);
var listFilterOut = pred => invokeMethod("filter",not(pred));
var listMap = fn => invokeMethod("map",fn);
var listFlatMap = fn => invokeMethod("flatMap",fn);
var listReduce = (fn,...args) => (
	args.length > 0 ?
		invokeMethod("reduce",fn,...args) :
		invokeMethod("reduce",fn)
);
var listReduceRight = (fn,...args) => (
	args.length > 0 ?
		invokeMethod("reduceRight",fn,...args) :
		invokeMethod("reduceRight",fn)
);
var listPrepend = v => (list => [ v, ...list, ]);
var listAppend = v => (list => [ ...list, v, ]);
var takeAll = it => [ ...it, ];
var chainAll = (...steps) => m => (
	steps.reduce((m,fn) => m.chain(fn),m)
);
var compose = unapply(
	listReduceRight(
		(g,f) => (...args) => f(g(...args))
	)
);


// **********************************


// expose FP helpers on API
module.exports = {
	identity,
	apply,
	unapply,
	invokeMethod,
	prop,
	setProp,
	eq,
	not,
	listHead,
	listTail,
	listFilterIn,
	listFilterOut,
	listMap,
	listFlatMap,
	listReduce,
	listReduceRight,
	listPrepend,
	listAppend,
	takeAll,
	chainAll,
	compose,
	curry,
};
module.exports.identity = identity;
module.exports.apply = apply;
module.exports.unapply = unapply;
module.exports.invokeMethod = invokeMethod;
module.exports.prop = prop;
module.exports.setProp = setProp;
module.exports.eq = eq;
module.exports.not = not;
module.exports.listHead = listHead;
module.exports.listTail = listTail;
module.exports.listFilterIn = listFilterIn;
module.exports.listFilterOut = listFilterOut;
module.exports.listMap = listMap;
module.exports.listFlatMap = listFlatMap;
module.exports.listReduce = listReduce;
module.exports.listReduceRight = listReduceRight;
module.exports.listPrepend = listPrepend;
module.exports.listAppend = listAppend;
module.exports.takeAll = takeAll;
module.exports.chainAll = chainAll;
module.exports.compose = compose;
module.exports.curry = curry;
