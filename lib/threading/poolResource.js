"use strict";

const { AsyncResource } = require("node:async_hooks");

const __releaseResource =
    resource =>
        (err, result) => {
            resource.runInAsyncScope(resource.callback, null, err, result);
            resource.emitDestroy();
        };

const createWorkerPoolTaskResource =
    callback => {
        const resource = new AsyncResource("WorkerPoolTaskResource");
        resource.callback = callback;

        return {
            done: __releaseResource(resource)
        };
    };

module.exports = {
    createWorkerPoolTaskResource
};