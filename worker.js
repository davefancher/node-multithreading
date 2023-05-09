"use strict";

const { parentPort } = require("node:worker_threads");

const { PIPE } = require("./lib/extensions");
const { resize } = require("./lib/imageProcessing");

parentPort.on(
    "message",
    msg =>
        resize(msg.targetDirectory, msg.sourceFileName, msg.scale, Buffer.from(msg.buffer))
            [PIPE](targetFileName => parentPort.postMessage(targetFileName)));
