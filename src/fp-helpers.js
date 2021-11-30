"use strict";

// import from Monio
var { curry, fold, foldMap, } = require("monio/util");


// **********************************


var identity = v => v;
var apply = curry((fn,args) => fn(...args),2);
var unapply = fn => ((...args) => fn(args));
var invokeMethod = (methodName,...args) => (obj => (
	obj[methodName](...args)
));
var prop = curry((key,obj) => obj[key],2);
var setProp = curry((prop,val,obj) => (
	{ ...obj, [prop]: val, }
),3);
var eq = curry(Object.is,2);
var not = fn => ((...args) => !fn(...args));
var listOf = v => (
	Array.isArray(v) ? v :
	(
		v &&
		typeof v == "object" &&
		typeof v[Symbol.iterator] == "function"
	) ? [ ...v, ] :
	[ v, ]
);
var listHead = list => list[0];
var listTail = invokeMethod("slice",1);
var listFilterIn = curry((pred,list) => list.filter(pred),2);
var listFilterOut = curry((pred,list) => list.filter(not(pred)),2);
var listMap = curry((fn,list) => list.map(fn),2);
var listFlatMap = curry((fn,list) => list.flatMap(fn),2);
var listReduce = curry((fn,...args) => (
	args.length > 1 ?
		args[1].reduce(fn,args[1]) :
		args[0].reduce(fn)
),2);
var listReduceRight = curry((fn,...args) => (
	args.length > 1 ?
		args[1].reduceRight(fn,args[1]) :
		args[0].reduceRight(fn)
),2);
var listPrepend = curry((v,list) => [ v, ...list, ]);
var listAppend = curry((v,list) => [ ...list, v, ]);
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
	listOf,
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
	fold,
	foldMap,
};
module.exports.identity = identity;
module.exports.apply = apply;
module.exports.unapply = unapply;
module.exports.invokeMethod = invokeMethod;
module.exports.prop = prop;
module.exports.setProp = setProp;
module.exports.eq = eq;
module.exports.not = not;
module.exports.listOf = listOf;
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
module.exports.fold = fold;
module.exports.foldMap = foldMap;
