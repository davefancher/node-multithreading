"use strict";

module.exports =
    Object.freeze({
        LOG_LEVEL: Object.freeze({
            SILLY: "silly",
            DEBUG: "debug",
            VERBOSE: "verbose",
            INFO: "info",
            WARN: "warn",
            ERROR: "error"
        }),
        PROCESSING_STRATEGY: Object.freeze({
            SERIAL: "serial",
            PARALLEL: "parallel",
            WORKER_THREAD: "workerThread",
            THREAD_POOL: "threadPool"
        })
    });
