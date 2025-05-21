import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Skeleton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  MoreVert,
  Download,
  Verified as VerifiedIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import useShowToast from "../hooks/useShowToast";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { motion } from "framer-motion";
import {
  BsFileEarmarkTextFill,
  BsFileZipFill,
  BsFileWordFill,
  BsFileExcelFill,
  BsFilePptFill,
  BsFileTextFill,
} from "react-icons/bs";
import { SocketContext } from "../context/SocketContext";

const AdminPostCards = () => {
  const [allPostsUsers, setAllPostsUsers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const showToast = useShowToast();
  const currentUser = useRecoilValue(userAtom);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);

  const fetchAllUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users/all", {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      const usersMap = data.reduce((acc, user) => {
        acc[user._id] = {
          ...user,
          username: user.username || "unknown",
          name: user.name || "Unknown User",
          profilePic: user.profilePic || "/default-avatar.png",
          isVerified: user.isVerified || false,
        };
        return acc;
      }, {});
      setAllPostsUsers(usersMap);
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (postId, updatedPost) => {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? updatedPost : p)),
      }));
    };

    socket.on("postBanned", ({ postId, post: updatedPost }) => handleUpdate(postId, updatedPost));
    socket.on("postUnbanned", ({ postId, post: updatedPost }) => handleUpdate(postId, updatedPost));

    return () => {
      socket.off("postBanned");
      socket.off("postUnbanned");
    };
  }, [socket, setPosts]);

  const handleBanUnbanPost = async (postId, isBanned) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/${isBanned ? "unban" : "ban"}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      showToast("Success", isBanned ? "Post unbanned" : "Post banned", "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleDownloadPost = (post) => {
    const content = post.media || post.text;
    const blob = new Blob([content], {
      type: post.media ? "application/octet-stream" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = post.originalFilename || `post_${post._id}.${post.mediaType || "txt"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMoreClick = (event, postId) => {
    setAnchorEl(event.currentTarget);
    setSelectedPostId(postId);
  };

  const handleMoreClose = () => {
    setAnchorEl(null);
    setSelectedPostId(null);
  };

  const getDocumentIcon = (filename) => {
    const ext = filename?.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "pdf": return <BsFileEarmarkTextFill size={24} />;
      case "zip": return <BsFileZipFill size={24} />;
      case "doc": case "docx": return <BsFileWordFill size={24} />;
      case "xls": case "xlsx": return <BsFileExcelFill size={24} />;
      case "ppt": case "pptx": return <BsFilePptFill size={24} />;
      case "txt": case "rtf": return <BsFileTextFill size={24} />;
      default: return <BsFileEarmarkTextFill size={24} />;
    }
  };

  const getFileName = (post) => {
    return post.originalFilename || post.media?.split("/").pop() || "Unnamed Document";
  };

  const renderPost = (post, postUser) => {
    if (!postUser) return null;

    return (
      <Box
        key={post._id}
        mb={4}
        sx={{
          width: { xs: "100%", sm: "90%", md: "600px" },
          maxWidth: "600px",
          minHeight: { xs: "auto", sm: "350px", md: "400px" },
          mx: { xs: 0, sm: "auto" },
          background: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: { xs: 1, sm: 2, md: 2.5 },
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {post.isBanned && (
          <Typography
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              color: "red",
              fontWeight: "bold",
              background: "rgba(255, 255, 255, 0.7)",
              p: 1,
              borderRadius: 2,
              zIndex: 10,
            }}
          >
            Banned by Admin
          </Typography>
        )}
        <Typography variant="caption" color="text.primary" mb={1}>
          Post ID: {post._id}
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar
              sx={{ width: 48, height: 48, cursor: "pointer" }}
              alt={postUser.name || "User"}
              src={postUser.profilePic}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/${postUser.username}`);
              }}
            />
            <Box>
              <Typography
                variant="body2"
                fontWeight="bold"
                color="text.primary"
                sx={{ cursor: "pointer", fontSize: "14px" }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/${postUser.username}`);
                }}
              >
                {postUser.name}
              </Typography>
              <Typography
                variant="caption"
                color="#8E8E8E"
                sx={{ fontSize: "12px" }}
              >
                @{postUser.username} • {formatDistanceToNow(new Date(post.createdAt))} ago
                {post.isEdited && " (Edited)"}
              </Typography>
            </Box>
            {postUser.isVerified && (
              <VerifiedIcon color="primary" fontSize="small" sx={{ ml: 0.5 }} />
            )}
          </Box>
          <IconButton onClick={(e) => handleMoreClick(e, post._id)} size="small">
            <MoreVert sx={{ color: "text.primary", fontSize: 20 }} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl) && selectedPostId === post._id}
            onClose={handleMoreClose}
          >
            <MenuItem
              onClick={() => {
                handleBanUnbanPost(post._id, post.isBanned);
                handleMoreClose();
              }}
            >
              {post.isBanned ? (
                <>
                  <Edit sx={{ mr: 1 }} /> Unban
                </>
              ) : (
                <>
                  <Delete sx={{ mr: 1 }} /> Ban
                </>
              )}
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleDownloadPost(post);
                handleMoreClose();
              }}
            >
              <Download sx={{ mr: 1 }} /> Download
            </MenuItem>
          </Menu>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 2, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontSize: "14px", wordBreak: "break-word" }}
          >
            {post.text}
          </Typography>

          {post.media && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 2,
                width: "100%",
                height: {
                  xs: post.mediaType === "audio" || post.mediaType === "document" ? "auto" : "180px",
                  sm: post.mediaType === "audio" || post.mediaType === "document" ? "auto" : "250px",
                  md: post.mediaType === "audio" || post.mediaType === "document" ? "auto" : "300px",
                },
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {post.mediaType === "image" && (
                <>
                  <img
                    src={post.media}
                    alt="Post"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {post.isEdited && (
                    <Typography
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        right: 10,
                        bgcolor: "rgba(0, 0, 0, 0.6)",
                        color: "white",
                        p: "2px 8px",
                        borderRadius: 2,
                        fontSize: "12px",
                      }}
                    >
                      Edited
                    </Typography>
                  )}
                </>
              )}
              {post.mediaType === "video" && (
                <video
                  src={post.media}
                  controls
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {post.mediaType === "audio" && (
                <Box sx={{ width: "100%", px: 2, py: 1, display: "flex", justifyContent: "center" }}>
                  <audio
                    src={post.media}
                    controls
                    style={{ width: "100%", maxWidth: "400px" }}
                  />
                </Box>
              )}
              {post.mediaType === "document" && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, width: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getDocumentIcon(getFileName(post))}
                    <Typography
                      color="text.primary"
                      sx={{ fontSize: "14px", wordBreak: "break-word", textAlign: "center" }}
                    >
                      {getFileName(post)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: "auto", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="caption" color="text.secondary">
              {post.likes.length} Likes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {post.comments.length} Comments
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {post.shares.length} Shares
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {isLoading ? (
        <Box
          sx={{
            width: { xs: "100%", sm: "90%", md: "600px" },
            maxWidth: "600px",
            mx: { xs: 0, sm: "auto" },
            p: 2,
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: 2,
            backdropFilter: "blur(10px)",
          }}
        >
          <Skeleton variant="rectangular" width="100%" height={200} />
        </Box>
      ) : currentUser?.isAdmin ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: 2, py: 2 }}>
          {posts.posts.length > 0 ? (
            posts.posts.map((adminPost) => {
              const postUser = allPostsUsers[adminPost.postedBy] || {
                username: "unknown",
                name: "Unknown User",
                profilePic: "/default-avatar.png",
                isVerified: false,
              };
              return renderPost(adminPost, postUser);
            })
          ) : (
            <Typography color="text.secondary">No posts available</Typography>
          )}
        </Box>
      ) : (
        <Typography color="text.secondary">You are not authorized to view this page.</Typography>
      )}
    </motion.div>
  );
};

export default AdminPostCards;