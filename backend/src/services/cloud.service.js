const mongoose = require("mongoose");
const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

function uploadFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      return reject(new Error("Invalid file input"));
    }

    imagekit.upload(
      {
        file: file.buffer, 
        fileName: file.originalname || new mongoose.Types.ObjectId().toString(), 
        folder: "SkillSwap",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result); 
        }
      }
    );
  });
}

module.exports = uploadFile;