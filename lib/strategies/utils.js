"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { threadId } = require("node:worker_threads");

const writeToFile =
    (targetDirectory, sourceFileName, ...specifiers) => {
        setImmediate(() => console.warn(`--> [threadId: ${threadId}] setImmediate in writeToFile to ${specifiers[0]}`));

        console.info(`[threadId: ${threadId}] Resizing to ${specifiers[0]}%`);

        const { name: baseFileName, ext: extension } = path.parse(sourceFileName);
        const targetFileName = `${baseFileName}@${specifiers.join("_")}${extension}`;

        const outputFileName = path.join(targetDirectory, targetFileName);

        return buffer =>
            fs
                .writeFile(outputFileName, buffer)
                .then(() => outputFileName);
    };

module.exports = {
    writeToFile
};