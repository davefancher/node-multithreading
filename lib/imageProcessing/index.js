"use strict";

const path = require("node:path");
const jimp = require("jimp");

const JPEG = require('jpeg-js')
jimp.decoders['image/jpeg'] = (data) => JPEG.decode(data, {
	maxMemoryUsageInMB: 4096,
});

const resize =
    async (targetDirectory, sourceFileName, scale, buffer) => {
        const { name: baseFileName, ext: extension } = path.parse(sourceFileName);
        
        console.info(`Resizing ${baseFileName} to ${scale}%`);
        
        const image = await jimp.read(buffer);
        const targetWidth = image.getWidth() * (scale / 100);
        const targetHeight = jimp.AUTO;
        
        const newImage = image.resize(targetWidth, targetHeight);
        
        // extension contains the dot
        const outputFilePath = path.join(targetDirectory, `${baseFileName}@${newImage.getWidth()}x${newImage.getHeight()}${extension}`); 
        void await newImage.writeAsync(outputFilePath);

        return outputFilePath;
    };

module.exports = {
    resize
};
