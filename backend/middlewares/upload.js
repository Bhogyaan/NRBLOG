const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to save files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
  },
});

const fileFilter = (req, file, cb) => {
  const supportedTypes = [
    ...["image/jpeg", "image/png", "image/gif", "image/heic"],
    ...["video/mp4", "video/x-matroska", "video/avi", "video/3gp", "video/quicktime"],
    ...["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav"],
    ...[
      "application/pdf", "application/x-pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain", "application/rtf",
      "application/zip", "application/x-zip-compressed", "application/octet-stream",
      "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet", "application/vnd.oasis.opendocument.presentation"
    ]
  ];

  if (supportedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB max
  },
});

module.exports = upload;