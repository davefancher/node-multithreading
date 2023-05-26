"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const logger = require("../logging");

const writeToFile =
    (targetDirectory, sourceFileName, ...specifiers) => {
        setImmediate(() => logger.debug(`setImmediate in writeToFile to ${specifiers[0]}`));

        logger.debug(`Writing file for ${specifiers[0]}`);

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