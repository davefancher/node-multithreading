"use strict";

const _ = require("lodash");
const dayjs = require("dayjs");

const attachExtensionFunction =
    target =>
        fn => {
            const sym = Symbol();

            Reflect.defineProperty(
                target,
                sym,
                {
                    enumerable: false,
                    writable: false,
                    configurable: false,
                    value: (function (...args) {
                        return fn(this)(...args);
                    })
                });

            return sym;
        };

const extendObjectPrototype =
    attachExtensionFunction(Object.prototype);

const extendFunctionPrototype =
    attachExtensionFunction(Function.prototype);

const PIPE_SYNC =
    extendObjectPrototype(context => fn => fn(context));

const PIPE =
    extendObjectPrototype(context => fn => context.then(fn));

const __stopTimer =
    (label, startTime, logLevel) =>
        opResult => {
            const [sec, ns] = process.hrtime(startTime);

        const duration =
            dayjs
                .duration((sec * 1000) + _.round(ns * 0.000001, 2))
                .toISOString();

            console[logLevel || "debug"](`${label}: ${duration}`);

            return opResult;
        };

const APPLY_TIMED =
    extendFunctionPrototype(
        context =>
            (label, logLevel) =>
                async (...rest) => {
                    const startTime = process.hrtime();

                    return await context.apply(null, rest)
                        [PIPE](__stopTimer(label, startTime, logLevel));
                });

module.exports = {
    APPLY_TIMED,
    PIPE,
    PIPE_SYNC
};
