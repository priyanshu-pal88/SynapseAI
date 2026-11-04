const ImageKit = require("@imagekit/nodejs");
const { toFile } = require("@imagekit/nodejs");

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function uploadFile(file) {
  try {
    if (!file?.buffer) {
      throw new Error("File buffer is missing");
    }

  

    const response = await imagekit.files.upload({
      file: await toFile(file.buffer, file.originalname),
      fileName: file.originalname,
      folder: "SynapseAI",
    });

    return response;
  } catch (error) {
    console.error("ImageKit upload failed:", {
      message: error.message,
      status: error.status,
      error: error.error,
      requestId: error.headers?.get("x-ik-requestid"),
    });

    throw error;
  }
}

module.exports = uploadFile;