"use strict";

const { PIPE, PIPE_SYNC, WITH_TIMING } = require("../extensions");
const { resize } = require("../imageProcessing");
const winston = require("winston")
const { writeToFile } = require("./utils");

module.exports = 
    async ({ targetDirectory, sourceFileName, targetScales, inputBuffer }) => {
        winston.info(`Processing ${sourceFileName} (Serial)`);

        const files = [];

        for (let scale of targetScales) {
            const newFile =
                await ({ scale, inputBuffer })
                    [PIPE_SYNC](resize[WITH_TIMING](`Done resizing ${scale}%`, "info"))
                    [PIPE](writeToFile(targetDirectory, sourceFileName, `${scale}%`)[WITH_TIMING](`Wrote ${scale}% file`, "info"));

            // HACK: Make serial return the same structure as the other demos
            files.push({ status: "fulfilled", value: newFile });
        }

        return files;
    };
