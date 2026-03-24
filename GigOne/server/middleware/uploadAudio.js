const fs = require("fs");
const path = require("path");
const multer = require("multer");
const AppError = require("../utils/appError");

const uploadDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "audio/aac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "") || ".bin";
    cb(null, `audio-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new AppError("Only audio uploads are allowed", 400, {
        code: "INVALID_FILE_TYPE",
      }));
      return;
    }

    cb(null, true);
  },
});

const uploadAudio = (req, res, next) => {
  upload.single("audio")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    next();
  });
};

module.exports = uploadAudio;
