"use strict";

// Adapted from https://nodejs.org/api/async_context.html#using-asyncresource-for-a-worker-thread-pool

const { EventEmitter } = require("node:events");
const os = require("node:os");
const { promisify } = require("node:util");
const { Worker, SHARE_ENV } = require("node:worker_threads");

const winston = require("winston");

const { PIPE_SYNC } = require("../extensions");
const { createWorkerPoolTaskResource } = require("./poolResource");

const TASK_INFO = Symbol("TASK_INFO");
const THREAD_FREED = Symbol("THREAD_FREED");

const __runPooledTask =
    ({ freeThreads, taskQueue }) =>
        (taskData, callback) => {
            if (freeThreads.length === 0) {
                taskQueue.push({ taskData, callback });

                return;
            }

            const worker = freeThreads.pop();
            worker[TASK_INFO] = createWorkerPoolTaskResource(callback);

            worker.postMessage(taskData);
        };

const __handleTaskComplete =
    (poolState, worker) =>
        msg => {
            worker[TASK_INFO].done(null, msg);
            worker[TASK_INFO] = null;

            poolState.freeThreads.push(worker);
            poolState.emitter.emit(THREAD_FREED);
        };

const __handleTaskError =
    (poolState, worker) =>
        err => {
            if (worker[TASK_INFO]) {
                worker[TASK_INFO].done(err, null);
            } else {
                winston.error(err);
            }

            const { workers } = poolState;

            poolState.workers.splice(workers.indexOf(worker, 1));

            __addWorkerToPool(poolState);
        };

const __addWorkerToPool =
    poolState => {
        const { emitter, script, workers, freeThreads } = poolState;

        const worker = new Worker(script, { env: SHARE_ENV });

        const handleTaskComplete = __handleTaskComplete(poolState, worker);
        const handleTaskError = __handleTaskError(poolState, worker);

        worker
            .on("message", ({ type, data }) => {
                if (type === "log") {
                    winston.log(data);
                } else {
                    handleTaskComplete(data)
                }
            })
            .on("error", handleTaskError)
            .on("messageerror", handleTaskError);

        workers.push(worker);
        freeThreads.push(worker);

        emitter.emit(THREAD_FREED);
    };

const __close =
    ({ workers }) =>
        () => {
            winston.info("Shutting down worker threads");
            workers.forEach(w => w.terminate());
        };

const __handleThreadFreed =
    poolState =>
        () => {
            if (poolState.taskQueue.length > 0) {
                const { taskData, callback } = poolState.taskQueue.shift();

                __runPooledTask(poolState)(taskData, callback);
            }
        };

const createThreadPool =
    (script, requestedThreadCount) => {
        const threadCount =
            Math
                .min(requestedThreadCount, os.cpus().length)
                [PIPE_SYNC](tc => Math.max(tc, 1));

        winston.debug(`Creating pool with ${threadCount} worker threads`);

        const poolState = Object.freeze({
            script,
            emitter: new EventEmitter(),
            workers: [],
            freeThreads: [],
            taskQueue: []
        });
        
        poolState
            .emitter
            .on(THREAD_FREED, __handleThreadFreed(poolState))
            .on("error", err => { throw err; });
            
        for (let i = 0; i < threadCount; i++) {
            __addWorkerToPool(poolState);
        }

        return {
            close: __close(poolState),
            runTask:
                promisify(__runPooledTask(poolState)),
        };
    };

module.exports = {
    createThreadPool
};