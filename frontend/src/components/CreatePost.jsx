import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  IconButton,
  Modal,
  TextareaAutosize,
  Typography,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert,
  Slider,
  Drawer,
  Avatar,
} from "@mui/material";
import { Close as CloseIcon, Upload as UploadIcon, Image as ImageIcon, Videocam, Mic } from "@mui/icons-material";
import { motion } from "framer-motion";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";
import { useNavigate } from "react-router-dom";
import { BsFileEarmarkTextFill, BsFileZipFill, BsFiletypePdf } from "react-icons/bs";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { useSocket } from "../context/SocketContext";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const MAX_CHAR = 500;
const MAX_FILE_SIZE = {
  document: 2 * 1024 * 1024 * 1024, // 2GB
  image: 16 * 1024 * 1024, // 16MB
  video: 16 * 1024 * 1024, // 16MB
  audio: 16 * 1024 * 1024, // 16MB
};

const SUPPORTED_FORMATS = {
  image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/heic", "image/webp"],
  video: ["video/mp4", "video/x-mp4", "video/x-matroska", "video/avi", "video/3gpp", "video/quicktime", "video/webm"],
  audio: ["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav", "audio/ogg"],
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
    "application/x-zip-compressed",
  ],
};

const ACCEPT_EXTENSIONS = {
  image: ".jpg,.jpeg,.png,.gif,.heic,.webp",
  video: ".mp4,.mkv,.avi,.3gp,.mov,.webm",
  audio: ".mp3,.aac,.m4a,.opus,.wav,.ogg",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip",
};

const CreatePost = ({ isOpen, onClose, onPostCreated, isDrawer }) => {
  const [postText, setPostText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const imageRef = useRef(null);
  const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
  const user = useRecoilValue(userAtom);
  const showToast = useShowToast();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const [postType, setPostType] = useState("post");
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [lastLoaded, setLastLoaded] = useState(0);
  const [lastTime, setLastTime] = useState(null);
  const { socket, connectionStatus } = useSocket();
  const [notification, setNotification] = useState({ open: false, message: "", severity: "error" });
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTrim, setVideoTrim] = useState([0, 30]);

  useEffect(() => {
    if (!user || !user._id) {
      showToast("Error", "User not authenticated. Please log in.", "error");
      onClose();
    }
  }, [isOpen, user, showToast, onClose]);

  useEffect(() => {
    if (socket && connectionStatus === "connected") {
      const handleNewPost = (newPost) => {
        if (!posts.posts.some((post) => post._id === newPost._id)) {
          setPosts((prev) => ({
            ...prev,
            posts: [newPost, ...prev.posts],
          }));
          showToast("New Post", "A new post has been created!", "info");
        }
      };

      /*
      const handleNewStory = (newStory) => {
        if (!posts.stories?.some((story) => story._id === newStory._id)) {
          setPosts((prev) => ({
            ...prev,
            stories: [newStory, ...(prev.stories || [])],
          }));
          showToast("New Story", "A new story has been created!", "info");
        }
      };
      */

      socket.on("newPost", handleNewPost);
      socket.on("newFeedPost", handleNewPost);
      // socket.on("newStory", handleNewStory);

      return () => {
        socket.off("newPost", handleNewPost);
        socket.off("newFeedPost", handleNewPost);
        // socket.off("newStory", handleNewStory);
      };
    }
  }, [socket, connectionStatus, setPosts, showToast, posts.posts]);

  const handleTextChange = (e) => {
    const inputText = e.target.value;
    if (inputText.length > MAX_CHAR) {
      setPostText(inputText.slice(0, MAX_CHAR));
      setRemainingChar(0);
    } else {
      setPostText(inputText);
      setRemainingChar(MAX_CHAR - inputText.length);
    }
  };

  const getSupportedFormatsMessage = (mediaType) => {
    const extensions = ACCEPT_EXTENSIONS[mediaType].replace(/\./g, "").split(",").join(", ").toUpperCase();
    return `Supported ${mediaType} formats: ${extensions}.`;
  };

  const validateFile = (file) => {
    if (!file) return true;

    const fileType = file.type || "";
    const allowedFormats = postType === "story"
      ? [...SUPPORTED_FORMATS.image, ...SUPPORTED_FORMATS.video, ...SUPPORTED_FORMATS.audio]
      : Object.values(SUPPORTED_FORMATS).flat();
    const detectedMediaType = Object.keys(SUPPORTED_FORMATS).find((key) =>
      SUPPORTED_FORMATS[key].includes(fileType)
    );

    if (!fileType) {
      setNotification({
        open: true,
        message: "Unable to detect file format. Please try a different file.",
        severity: "error",
      });
      return false;
    }

    if (!allowedFormats.includes(fileType)) {
      const message = postType === "story"
        ? `Unsupported file format: ${fileType}. ${[
            getSupportedFormatsMessage("image"),
            getSupportedFormatsMessage("video"),
            getSupportedFormatsMessage("audio"),
          ].join(" ")}`
        : `Unsupported file format: ${fileType}. ${Object.keys(ACCEPT_EXTENSIONS)
            .map(getSupportedFormatsMessage)
            .join(" ")}`;
      setNotification({
        open: true,
        message,
        severity: "error",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE[detectedMediaType]) {
      const maxSizeMB = MAX_FILE_SIZE[detectedMediaType] / (1024 * 1024);
      const message =
        detectedMediaType === "document"
          ? `Please upload a document smaller than 2GB.`
          : `Please upload ${detectedMediaType} files smaller than ${maxSizeMB}MB.`;
      setNotification({
        open: true,
        message: `${message} ${getSupportedFormatsMessage(detectedMediaType)}`,
        severity: "error",
      });
      return false;
    }

    setMediaType(detectedMediaType);
    return true;
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Selected file:", { name: file.name, type: file.type, size: file.size });

    if (!validateFile(file)) {
      setMediaFile(null);
      setMediaType(null);
      return;
    }

    setMediaFile(file);
    setNumPages(null);

    if (file.type.startsWith("video")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        setVideoTrim([0, Math.min(30, video.duration)]);
        URL.revokeObjectURL(video.src);
      };
    }
  };

  const handleVideoTrimChange = (event, newValue) => {
    setVideoTrim(newValue);
    if (newValue[1] - newValue[0] > 30) {
      setVideoTrim([newValue[0], newValue[0] + 30]);
    }
  };

  const handleCreatePost = async () => {
    /*
    if (postType === "story" && !mediaFile) {
      setNotification({
        open: true,
        message: "Please upload an image, video, or audio for your story.",
        severity: "error",
      });
      return;
    }
    */

    if (postType === "post" && !postText.trim() && !mediaFile) {
      setNotification({
        open: true,
        message: "Please provide text or media for your post.",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setLastLoaded(0);
    setLastTime(Date.now());

    const formData = new FormData();
    formData.append("postedBy", user._id);
    formData.append("username", user.username);
    formData.append("profilePic", user.profilePic || "");
    formData.append("createdAt", new Date().toISOString());
    if (postType === "post") {
      formData.append("text", postText);
    } /* else {
      formData.append("caption", postText);
    } */
    if (mediaFile) {
      formData.append("media", mediaFile);
      formData.append("mediaType", mediaType);
      /*
      if (mediaType === "video" && postType === "story") {
        formData.append("trimStart", videoTrim[0]);
        formData.append("trimEnd", videoTrim[1]);
      }
      */
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", postType === "post" ? "/api/posts/create" : "/api/stories", true);
      xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);

          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff > 0) {
            const loadedDiff = event.loaded - lastLoaded;
            const speed = Math.round((loadedDiff / timeDiff) / 1024);
            setUploadSpeed(speed);
          }
          setLastLoaded(event.loaded);
          setLastTime(now);
        }
      };

      xhr.onload = () => {
        setLoading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch (parseError) {
            setNotification({
              open: true,
              message: "Unexpected response format from server. Please try again.",
              severity: "error",
            });
            return;
          }

          setNotification({
            open: true,
            message: `${postType === "story" ? "Story" : "Post"} created successfully!`,
            severity: "success",
          });
          setPostText("");
          setMediaFile(null);
          setMediaType(null);
          setVideoTrim([0, 30]);
          onClose();
          navigate("/");

          if (postType === "post") {
            setPosts((prev) => ({
              ...prev,
              posts: [data, ...prev.posts.filter((post) => post._id !== data._id)],
            }));
            if (socket && connectionStatus === "connected") {
              socket.emit("newPost", data);
            }
          } /* else {
            setPosts((prev) => ({
              ...prev,
              stories: [data, ...(prev.stories || [])],
            }));
            if (socket && connectionStatus === "connected") {
              socket.emit("newStory", data);
            }
          } */
        } else {
          let errorMessage = `Failed to create ${postType}.`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || errorMessage;
            console.error("Server error response:", errorData);
          } catch (parseError) {
            errorMessage = `Server error (${xhr.status}): Unable to create ${postType}.`;
          }
          setNotification({
            open: true,
            message: errorMessage,
            severity: "error",
          });
        }
      };

      xhr.onerror = () => {
        setNotification({
          open: true,
          message: "Upload failed. Please check your connection and try again.",
          severity: "error",
        });
        setLoading(false);
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Create post error:", error);
      setNotification({
        open: true,
        message: `Failed to create ${postType}: ${error.message}`,
        severity: "error",
      });
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const renderDocumentIcon = (fileType) => {
    if (fileType === "application/pdf") {
      return <BsFiletypePdf size={24} />;
    } else if (fileType === "application/zip" || fileType === "application/x-zip-compressed") {
      return <BsFileZipFill size={24} />;
    } else {
      return <BsFileEarmarkTextFill size={24} />;
    }
  };

  const ModalOrDrawer = isDrawer ? Drawer : Modal;
  const modalProps = isDrawer
    ? { anchor: "bottom", PaperProps: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }
    : {};

  return (
    <ModalOrDrawer open={isOpen} onClose={onClose} {...modalProps}>
      <Box
        sx={{
          position: isDrawer ? "relative" : "absolute",
          top: isDrawer ? "auto" : "50%",
          left: isDrawer ? "auto" : "50%",
          transform: isDrawer ? "none" : "translate(-50%, -50%)",
          width: { xs: "100%", sm: "500px", md: "600px" },
          bgcolor: "#2e2e2e",
          boxShadow: 24,
          p: { xs: 2, sm: 3 },
          borderRadius: isDrawer ? 0 : 2,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid #444444",
        }}
      >
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={notification.severity}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleCloseNotification}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            icon={
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  style={{ width: 24, height: 24 }}
                />
              </motion.div>
            }
            sx={{ width: "100%", fontSize: "1rem", bgcolor: "#3a3a3a", color: "#b0b0b0" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" color="#8515fe">
              Create {postType === "post" ? "Post" : "Story"}
            </Typography>
            <IconButton onClick={onClose} sx={{ color: "#b0b0b0" }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box display="flex" gap={2} mb={2} flexDirection={{ xs: "column", sm: "row" }}>
            <Button
              variant={postType === "post" ? "contained" : "outlined"}
              onClick={() => {
                setPostType("post");
                setMediaFile(null);
                setMediaType(null);
              }}
              sx={{
                bgcolor: postType === "post" ? "#8515fe" : "transparent",
                color: postType === "post" ? "white" : "#8515fe",
                borderColor: "#8515fe",
                "&:hover": {
                  bgcolor: postType === "post" ? "#6d12cc" : "rgba(133, 21, 254, 0.1)",
                  borderColor: "#8515fe",
                },
                flex: 1,
              }}
            >
              Create Post
            </Button>
            {/*
            <Button
              variant={postType === "story" ? "contained" : "outlined"}
              onClick={() => {
                setPostType("story");
                setMediaFile(null);
                setMediaType(null);
              }}
              sx={{
                bgcolor: postType === "story" ? "#8515fe" : "transparent",
                color: postType === "story" ? "white" : "#8515fe",
                borderColor: "#8515fe",
                "&:hover": {
                  bgcolor: postType === "story" ? "#6d12cc" : "rgba(133, 21, 254, 0.1)",
                  borderColor: "#8515fe",
                },
                flex: 1,
              }}
            >
              Create Story
            </Button>
            */}
          </Box>

          {/*
          {postType === "story" ? (
            <Box>
              {mediaFile ? (
                <Box sx={{ mb: 2, position: "relative" }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar src={user.profilePic} alt={user.username} sx={{ width: 40, height: 40, mr: 2 }} />
                    <Box>
                      <Typography variant="subtitle1" color="#b0b0b0">
                        {user.username}
                      </Typography>
                      <Typography variant="caption" color="#b0b0b0">
                        Now
                      </Typography>
                    </Box>
                  </Box>
                  {mediaType === "image" && (
                    <img
                      src={URL.createObjectURL(mediaFile)}
                      alt="Story preview"
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        maxHeight: { xs: 300, sm: 400 },
                        objectFit: "cover",
                      }}
                    />
                  )}
                  {mediaType === "video" && (
                    <>
                      <video
                        controls
                        src={URL.createObjectURL(mediaFile)}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          maxHeight: { xs: 300, sm: 400 },
                          objectFit: "cover",
                        }}
                      />
                      <Box sx={{ mt: 2 }}>
                        <Typography color="#b0b0b0">Trim Video (Max 30s)</Typography>
                        <Slider
                          value={videoTrim}
                          onChange={handleVideoTrimChange}
                          min={0}
                          max={videoDuration}
                          step={0.1}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) => `${Math.floor(value)}s`}
                          sx={{ color: "#8515fe" }}
                        />
                      </Box>
                    </>
                  )}
                  {mediaType === "audio" && (
                    <audio
                      controls
                      src={URL.createObjectURL(mediaFile)}
                      style={{ width: "100%", marginTop: 8 }}
                    />
                  )}
                  <IconButton
                    onClick={() => setMediaFile(null)}
                    sx={{ position: "absolute", top: 8, right: 8, color: "#8515fe" }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: "2px dashed #444444",
                    borderRadius: 2,
                    p: 4,
                    textAlign: "center",
                    mb: 2,
                    bgcolor: "#3a3a3a",
                  }}
                >
                  <Box display="flex" justifyContent="center" gap={2}>
                    <IconButton onClick={() => imageRef.current.click()} sx={{ color: "#8515fe" }}>
                      <ImageIcon fontSize="large" />
                    </IconButton>
                    <IconButton onClick={() => imageRef.current.click()} sx={{ color: "#8515fe" }}>
                      <Videocam fontSize="large" />
                    </IconButton>
                    <IconButton onClick={() => imageRef.current.click()} sx={{ color: "#8515fe" }}>
                      <Mic fontSize="large" />
                    </IconButton>
                  </Box>
                  <Typography color="#b0b0b0">Click to upload image, video, or audio</Typography>
                </Box>
              )}

              <TextareaAutosize
                placeholder="Add a caption..."
                onChange={handleTextChange}
                value={postText}
                minRows={2}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "none",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  fontSize: "16px",
                  backgroundColor: "#3a3a3a",
                  color: "#b0b0b0",
                }}
              />
              <Typography variant="caption" color="#b0b0b0" mb={2}>
                {remainingChar} characters remaining
              </Typography>
            </Box>
          ) : (
          */}
            <Box>
              <TextareaAutosize
                placeholder="Write your post..."
                onChange={handleTextChange}
                value={postText}
                minRows={4}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "none",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  fontSize: "16px",
                  backgroundColor: "#3a3a3a",
                  color: "#b0b0b0",
                }}
              />
              <Typography variant="caption" color="#b0b0b0" mb={2}>
                {remainingChar} characters remaining
              </Typography>

              {mediaFile && (
                <Box mb={3}>
                  <Typography variant="subtitle2" gutterBottom color="#b0b0b0">
                    Selected: {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)}MB)
                  </Typography>

                  <Box border={1} borderColor="#444444" borderRadius={2} p={2} position="relative">
                    {mediaType === "image" && (
                      <img
                        src={URL.createObjectURL(mediaFile)}
                        alt="Preview"
                        style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain" }}
                      />
                    )}

                    {mediaType === "video" && (
                      <video
                        controls
                        src={URL.createObjectURL(mediaFile)}
                        style={{ maxWidth: "100%", maxHeight: "400px" }}
                      />
                    )}

                    {mediaType === "audio" && (
                      <audio controls src={URL.createObjectURL(mediaFile)} style={{ width: "100%" }} />
                    )}

                    {mediaType === "document" && (
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          {renderDocumentIcon(mediaFile.type)}
                          <Typography variant="body1" color="#b0b0b0">{mediaFile.name}</Typography>
                        </Box>

                        {mediaFile.type === "application/pdf" && (
                          <Box height="400px" overflow="auto">
                            <Document
                              file={URL.createObjectURL(mediaFile)}
                              onLoadSuccess={onDocumentLoadSuccess}
                            >
                              {Array.from({ length: numPages || 1 }, (_, i) => (
                                <Page key={`page_${i + 1}`} pageNumber={i + 1} width={500} />
                              ))}
                            </Document>
                          </Box>
                        )}
                      </Box>
                    )}

                    <IconButton
                      onClick={() => setMediaFile(null)}
                      sx={{ position: "absolute", mt: 1, right: 8, color: "#8515fe" }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          {/* )} */}

          <input
            type="file"
            hidden
            ref={imageRef}
            onChange={handleFileChange}
            accept={
              postType === "story"
                ? [ACCEPT_EXTENSIONS.image, ACCEPT_EXTENSIONS.video, ACCEPT_EXTENSIONS.audio].join(",")
                : Object.values(ACCEPT_EXTENSIONS).join(",")
            }
          />

          {postType === "post" && (
            <Box textAlign="center" mb={2}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => imageRef.current.click()}
                sx={{ color: "#8515fe", borderColor: "#8515fe", "&:hover": { borderColor: "#6d12cc" } }}
              >
                Upload Media
              </Button>
            </Box>
          )}

          {loading && (
            <Box mb={2}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ mb: 1, bgcolor: "#444444", "& .MuiLinearProgress-bar": { bgcolor: "#8515fe" } }}
              />
              <Typography variant="caption" color="#b0b0b0">
                Uploading: {uploadProgress}% ({uploadSpeed} KB/s)
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={handleCreatePost}
            disabled={loading || (postType === "post" && !postText.trim() && !mediaFile)}
            sx={{
              bgcolor: "#8515fe",
              color: "white",
              borderRadius: 2,
              "&:hover": { bgcolor: "#6d12cc" },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Post ${postType === "story" ? "Story" : "Post"}`
            )}
          </Button>
        </motion.div>
      </Box>
    </ModalOrDrawer>
  );
};

export default CreatePost;
