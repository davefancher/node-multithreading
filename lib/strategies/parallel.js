"use strict";

const { PIPE_SYNC } = require("../extensions");
const { resize } = require("../imageProcessing");

module.exports =
    async options => {
        console.info(`Processing ${options.sourceFileName} (Parallel)`);

        void await options
            .targetScales
            .map(scale =>
                    resize(options.targetDirectory, options.sourceFileName, scale, options.buffer)
                        .then(r => console.info(`Wrote ${r}`)))
            [PIPE_SYNC](fns => Promise.allSettled(fns));
        };
