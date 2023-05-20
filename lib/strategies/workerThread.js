"use strict";

const path = require("node:path");
const { Worker, SHARE_ENV } = require("node:worker_threads");

const { PIPE_SYNC } = require("../extensions");
const { resize } = require("../imageProcessing");

module.exports =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Worker Thread)`);

        const workerScriptPath = path.join(__dirname, "../../", "worker.js");

        void await options
            .targetScales
            .map(scale =>
                new Promise(
                    resolve =>
                        new Worker(workerScriptPath, { env: SHARE_ENV })
                            .on("message", resolve)
                            .postMessage({
                                targetDirectory: options.targetDirectory,
                                sourceFileName: options.sourceFileName,
                                scale: scale,
                                buffer: options.buffer
                            }))
                    .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](promises => Promise.allSettled(promises));
    };
