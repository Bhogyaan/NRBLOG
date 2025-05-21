import React, { useRef, useState, useEffect } from "react";
import { Box, IconButton, InputAdornment, TextField, CircularProgress } from "@mui/material";
import { IoSendSharp } from "react-icons/io5";
import { BsFillImageFill } from "react-icons/bs";
import { Description as DescriptionIcon, Close as CloseIcon } from "@mui/icons-material";
import useShowToast from "../hooks/useShowToast";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import usePreviewImg from "../hooks/usePreviewImg";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";

const MessageInput = () => {
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const showToast = useShowToast();
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const imageRef = useRef(null);
  const docRef = useRef(null);
  const { handleImageChange, mediaUrl, setMediaUrl, mediaType, setMediaType } = usePreviewImg();
  const [isSending, setIsSending] = useState(false);
  const { socket } = useSocket();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket || !selectedConversation._id) return;

    const emitTyping = () => {
      if (!isTyping) {
        socket.emit("typing", { conversationId: selectedConversation._id });
        setIsTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { conversationId: selectedConversation._id });
        setIsTyping(false);
      }, 2000);
    };

    if (messageText.trim() || mediaUrl) {
      emitTyping();
    } else if (isTyping) {
      socket.emit("stopTyping", { conversationId: selectedConversation._id });
      setIsTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [messageText, mediaUrl, selectedConversation._id, socket, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !mediaUrl) return;
    if (isSending) return;
    if (!selectedConversation.userId) {
      showToast("Error", "No recipient selected", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          recipientId: selectedConversation.userId,
          img: mediaUrl,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to send message: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      if (selectedConversation.mock) {
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  _id: data.conversationId,
                  mock: false,
                  lastMessage: {
                    text: messageText.trim() || "Media",
                    sender: { _id: data.sender._id },
                    seen: false,
                  },
                }
              : conv
          )
        );
        setSelectedConversation((prev) => ({
          ...prev,
          _id: data.conversationId,
          mock: false,
        }));
      } else {
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  lastMessage: {
                    text: messageText.trim() || "Media",
                    sender: { _id: data.sender._id },
                    seen: false,
                  },
                }
              : conv
          )
        );
      }

      setMessageText("");
      setMediaUrl(null);
      setMediaType(null);
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    imageRef.current.value = null;
    docRef.current.value = null;
  };

  const renderMediaPreview = () => {
    if (!mediaUrl) return null;
    switch (mediaType) {
      case "image":
        return (
          <Box
            component="img"
            src={mediaUrl}
            alt="Preview"
            sx={{
              maxWidth: "100%",
              maxHeight: { xs: "80px", sm: "120px" },
              borderRadius: 20,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          />
        );
      case "video":
        return (
          <Box
            component="video"
            src={mediaUrl}
            controls
            sx={{
              maxWidth: "100%",
              maxHeight: { xs: "80px", sm: "120px" },
              borderRadius: 20,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          />
        );
      case "audio":
        return (
          <Box
            component="audio"
            src={mediaUrl}
            controls
            sx={{
              width: "100%",
              "& audio": { width: "100%", borderRadius: 20, bgcolor: "#2e2e2e" },
            }}
          />
        );
      case "document":
        return (
          <Typography variant="body2" color="#8515fe">
            Document: {imageRef.current?.files[0]?.name || docRef.current?.files[0]?.name}
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ flexShrink: 0, padding: 8 }}
    >
      {mediaUrl && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            bgcolor: "#2e2e2e",
            borderRadius: 20,
            border: "1px solid #444444",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {renderMediaPreview()}
          <IconButton onClick={handleCancelMedia} sx={{ color: "#8515fe" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "#2e2e2e",
          borderRadius: 20,
          p: 1,
          border: "1px solid #444444",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
        }}
      >
        <IconButton
          onClick={() => imageRef.current.click()}
          sx={{ color: "#8515fe", p: 0.5 }}
          aria-label="Upload media"
        >
          <BsFillImageFill size={20} />
        </IconButton>
        <IconButton
          onClick={() => docRef.current.click()}
          sx={{ color: "#8515fe", p: 0.5 }}
          aria-label="Upload document"
        >
          <DescriptionIcon fontSize="small" />
        </IconButton>
        <form onSubmit={handleSendMessage} style={{ flex: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
            sx={{
              bgcolor: "#3a3a3a",
              borderRadius: 20,
              "& fieldset": { border: "none" },
              "& input": { color: "#b0b0b0", fontSize: { xs: "0.875rem", sm: "1rem" } },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={isSending || (!messageText.trim() && !mediaUrl)}
                    sx={{ color: "#8515fe", p: 0.5 }}
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <CircularProgress size={20} sx={{ color: "#8515fe" }} />
                    ) : (
                      <IoSendSharp size={20} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
        <input
          type="file"
          hidden
          ref={imageRef}
          accept="image/*,video/*,audio/*"
          onChange={handleImageChange}
        />
        <input
          type="file"
          hidden
          ref={docRef}
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleImageChange}
        />
      </Box>
    </motion.div>
  );
};

export default MessageInput;