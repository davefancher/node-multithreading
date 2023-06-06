"use strict";

const winston = require("winston");

const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const { writeToFile } = require("./utils");

module.exports =
    ({ targetDirectory, sourceFileName, targetScales, inputBuffer }) => {
        winston.info(`Processing ${sourceFileName} (Parallel)`);

        return targetScales
            .map(scale =>
                ({ scale, inputBuffer })
                    [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`), "info")
                    [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "info")))
            [PIPE_SYNC](fns => Promise.allSettled(fns));
    };
