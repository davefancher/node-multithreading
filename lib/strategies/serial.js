"use strict";

const { resize } = require("../imageProcessing");

module.exports = 
    async options => {
        console.info(`Processing ${options.sourceFileName} (Serial)`);

        void await options
            .targetScales
            .reduce(
                (p, scale) =>
                    p.then(() =>
                        resize(options.targetDirectory, options.sourceFileName, scale, options.buffer)
                            .then(r => console.info(`Wrote ${r}`))),
                Promise.resolve());
    };
