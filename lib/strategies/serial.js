"use strict";

const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const logger = require("../logging");
const { writeToFile } = require("./utils");

module.exports = 
    async ({ targetDirectory, sourceFileName, targetScales, inputBuffer }) => {
        logger.info(`--- Processing ${sourceFileName} (Serial) ---`);

        for (let scale of targetScales) {
            void await ({ scale, inputBuffer })
                [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`, "info"))
                [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "info"));
        }
    };
