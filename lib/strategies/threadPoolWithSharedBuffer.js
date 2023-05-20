"use strict";

const os = require("node:os");
const path = require("node:path");
const { Worker, SHARE_ENV } = require("node:worker_threads");

const { PIPE_SYNC } = require("../extensions");
const { createThreadPool } = require("../threading");

module.exports =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Thread Pool with Shared Buffer)`);

        const workerScriptPath = path.join(__dirname, "resizeWorker.js");
        const threadPool = createThreadPool(workerScriptPath, 4);
        
        const sharedBuffer = new Uint8Array(new SharedArrayBuffer(options.buffer.length));
        sharedBuffer.set(options.buffer);

        void await options
            .targetScales
            .map(scale =>
                threadPool
                    .runTask({
                        targetDirectory: options.targetDirectory,
                        sourceFileName: options.sourceFileName,
                        scale: scale,
                        buffer: sharedBuffer
                    })
                    .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](promises => Promise.allSettled(promises))
    };
