"use strict";

const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const { writeToFile } = require("./utils");
const logger = require("../logging");

module.exports =
    async ({ targetDirectory, sourceFileName, targetScales, inputBuffer }) => {
        logger.info(`--- Processing ${sourceFileName} (Parallel) ---`);

        void await targetScales
            .map(scale =>
                ({ scale, inputBuffer })
                    [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`), "info")
                    [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "info")))
            [PIPE_SYNC](fns => Promise.allSettled(fns));
    };
