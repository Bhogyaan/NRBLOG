import { useState } from "react";
import useShowToast from "./useShowToast";

const usePreviewImg = () => {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const showToast = useShowToast();

  const SUPPORTED_FORMATS = {
    image: ["image/jpeg", "image/png", "image/gif", "image/heic"],
    video: ["video/mp4", "video/x-matroska", "video/avi", "video/3gpp", "video/quicktime"],
    audio: ["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav", "audio/mp3", "audio/ogg"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/rtf",
      "application/zip",
    ],
  };

  const MAX_SIZES = {
    image: 16 * 1024 * 1024, // 16MB
    video: 16 * 1024 * 1024, // 16MB
    audio: 16 * 1024 * 1024, // 16MB
    document: 2 * 1024 * 1024 * 1024, // 2GB
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = Object.values(SUPPORTED_FORMATS)
      .flat()
      .find((type) => file.type === type);

    const detectedMediaType = Object.keys(SUPPORTED_FORMATS).find((key) =>
      SUPPORTED_FORMATS[key].includes(fileType)
    );

    if (!fileType || !detectedMediaType) {
      showToast("Invalid file type", "Please select a valid image, video, audio, or document file", "error");
      setMediaUrl(null);
      setMediaType(null);
      return;
    }

    if (file.size > MAX_SIZES[detectedMediaType]) {
      showToast(
        "File too large",
        `${detectedMediaType.charAt(0).toUpperCase() + detectedMediaType.slice(1)} must be less than ${
          MAX_SIZES[detectedMediaType] / (1024 * 1024)
        }MB`,
        "error"
      );
      setMediaUrl(null);
      setMediaType(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result);
      setMediaType(detectedMediaType);
    };
    reader.readAsDataURL(file);
  };

  return { handleImageChange, mediaUrl, setMediaUrl, mediaType, setMediaType };
};

export default usePreviewImg;