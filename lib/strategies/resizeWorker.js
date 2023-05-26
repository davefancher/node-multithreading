"use strict";

const { parentPort } = require("node:worker_threads");

const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const { writeToFile } = require("./utils");

parentPort.on(
    "message",
    ({ targetDirectory, sourceFileName, scale, inputBuffer }) => {
        try {
            ({ scale, inputBuffer: inputBuffer.buffer })
                [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`))
                [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "debug"))
                [PIPE](targetFileName => parentPort.postMessage(targetFileName));
        } catch (ex) {
            parentPort.postMessage(ex);
        }
    });
