import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notification } from "antd";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";

const Notification = () => {
  const { socket } = useSocket();
  const currentUser = useRecoilValue(userAtom);
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.on(
      "newMessageNotification",
      ({ conversationId, sender, text, img, messageId }) => {
        console.log("Received newMessageNotification:", { conversationId, sender, text, img, messageId });
        const isViewingChat =
          selectedConversation._id === conversationId ||
          (sender._id === selectedConversation.userId &&
            selectedConversation._id !== "");
        if (!isViewingChat) {
          api.open({
            key: messageId,
            message: (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Typography variant="subtitle1">{sender.username}</Typography>
              </motion.div>
            ),
            description: (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Typography variant="body2">
                  {img ? "Sent a media message" : text}
                </Typography>
              </motion.div>
            ),
            duration: 5,
            placement: "topRight",
            onClick: () => {
              navigate(`/chat`);
              setTimeout(() => {
                navigate(`/chat/${sender._id}`);
              }, 100);
              api.destroy(messageId);
            },
            style: {
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              border: "1px solid #34495e",
              borderRadius: "8px",
              color: "#ffffff",
            },
          });
        }
      }
    );

    return () => {
      socket.off("newMessageNotification");
    };
  }, [socket, currentUser, selectedConversation, navigate, api]);

  return <>{contextHolder}</>;
};

export default Notification;