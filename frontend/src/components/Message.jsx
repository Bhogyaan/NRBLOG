import React, { useState } from "react";
import { Avatar, Box, Typography, Paper, Skeleton } from "@mui/material";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { BsCheck, BsCheck2All } from "react-icons/bs";
import { motion } from "framer-motion";
import { format } from "date-fns";

const Message = ({ isOwnMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const renderMedia = () => {
    if (!message.img) return null;
    const fileType = message.img.split(";")[0].split(":")[1] || "";
    if (fileType.includes("image")) {
      return (
        <Box
          component="img"
          src={message.img}
          loading="lazy"
          alt="Message content"
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "120px", sm: "150px" },
            borderRadius: 5,
            display: mediaLoaded ? "block" : "none",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
          }}
          onLoad={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
        />
      );
    } else if (fileType.includes("video")) {
      return (
        <Box
          component="video"
          src={message.img}
          controls
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "120px", sm: "150px" },
            borderRadius: 5,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
          }}
        />
      );
    } else if (fileType.includes("audio")) {
      return (
        <Box
          component="audio"
          src={message.img}
          controls
          sx={{
            width: "100%",
            "& audio": { width: "100%", height: "40px", borderRadius: 20, bgcolor: "#2e2e2e" },
          }}
        />
      );
    } else if (fileType.includes("pdf") || fileType.includes("text")) {
      return (
        <Typography
          variant="body2"
          color="#8515fe"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          Document: <a href={message.img} download style={{ color: "#8515fe" }}>Download</a>
        </Typography>
      );
    }
    return (
      <Typography
        variant="body2"
        color="#8515fe"
        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
      >
        Unsupported media: <a href={message.img} download style={{ color: "#8515fe" }}>Download</a>
      </Typography>
    );
  };

  const renderStatus = () => {
    if (!isOwnMessage) return null;
    if (message.seen || message.status === "seen") {
      return (
        <Box sx={{ position: "relative" }} title="Seen" aria-label="Message seen">
          <BsCheck2All size={18} color="#4caf50" />
        </Box>
      );
    } else if (message.status === "delivered") {
      return (
        <Box sx={{ position: "relative" }} title="Delivered" aria-label="Message delivered">
          <BsCheck2All size={18} color="#bdc3c7" />
        </Box>
      );
    }
    return (
      <Box sx={{ position: "relative" }} title="Sent" aria-label="Message sent">
        <BsCheck size={18} color="#bdc3c7" />
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isOwnMessage ? "row-reverse" : "row",
        alignItems: "flex-end",
        p: 1,
      }}
    >
      {!isOwnMessage && (
        <Avatar
          src={selectedConversation.userProfilePic}
          sx={{ width: 32, height: 32, mr: 1 }}
        />
      )}
      <Paper
        sx={{
          pr: 1.5,
          pl: 1.5,
          bgcolor: isOwnMessage ? "#8515fe" : "#2e2e2e",
          color: isOwnMessage ? "white" : "#b0b0b0",
          borderRadius: 3,
          maxWidth: { xs: "75%", sm: "70%" },
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
        }}
        component={motion.div}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {message.text && (
          <Typography
            variant="body2"
            sx={{ wordBreak: "break-word", fontSize: { xs: "0.875rem", sm: "0.9375rem" } }}
          >
            {message.text}
          </Typography>
        )}
        {message.img && (
          <Box sx={{ mt: message.text ? 1 : 0 }}>
            {renderMedia()}
            {!mediaLoaded && message.img.includes("image") && (
              <Skeleton
                variant="rectangular"
                width="100%"
                height={120}
                sx={{ borderRadius: 5, bgcolor: "#444444" }}
              />
            )}
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: isOwnMessage ? "flex-end" : "flex-start",
            alignItems: "center",
            mt: 0.5,
          }}
        >
          <Typography
            variant="caption"
            color={isOwnMessage ? "white" : "#757575"}
            sx={{ mr: isOwnMessage ? 0.5 : 0, fontSize: { xs: "0.75rem", sm: "0.8125rem" } }}
          >
            {format(new Date(message.createdAt), "h:mm a")}
          </Typography>
          {renderStatus()}
        </Box>
      </Paper>
    </Box>
  );
};

export default Message;