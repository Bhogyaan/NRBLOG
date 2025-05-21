// AdminPostCards.jsx (updated)
import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  MoreVert,
  Download,
  Verified as VerifiedIcon,
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const [dialogPostId, setDialogPostId] = useState(null);
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
        posts: prev.posts.map((p) => (p._id === postId ? { ...updatedPost, comments: updatedPost.comments || [], likes: updatedPost.likes || [], shares: updatedPost.shares || [], bookmarks: updatedPost.bookmarks || [] } : p)),
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
      const endpoint = `/api/admin/posts/${postId}/${isBanned ? "unban" : "ban"}`;
      const res = await fetch(endpoint, {
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

  const handleDialogOpen = (postId, action) => {
    setDialogPostId(postId);
    setDialogAction(action);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setDialogPostId(null);
    setDialogAction(null);
  };

  const handleDialogConfirm = () => {
    if (dialogPostId && dialogAction) {
      handleBanUnbanPost(dialogPostId, dialogAction === "ban" ? false : true);
    }
    handleDialogClose();
    handleMoreClose();
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

    const comments = post.comments || [];
    const likes = post.likes || [];
    const shares = post.shares || [];
    const bookmarks = post.bookmarks || [];

    return (
      <motion.div
        whileHover={{ scale: 1.02, boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)" }}
        transition={{ duration: 0.2 }}
        style={{ width: "100%" }}
        key={post._id}
      >
        <Box
          mb={4}
          sx={{
            width: { xs: "100%", sm: "90%", md: "600px" },
            maxWidth: "600px",
            minHeight: { xs: "auto", sm: "350px", md: "400px" },
            mx: { xs: 0, sm: "auto" },
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))",
            backdropFilter: "blur(12px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: { xs: 2, sm: 3, md: 3.5 },
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            transition: "all 0.3s ease",
          }}
        >
          {post.isBanned && (
            <Typography
              sx={{
                position: "absolute",
                top: 12,
                left: 12,
                color: "#ff4d4f",
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.8)",
                px: 2,
                py: 0.5,
                borderRadius: 2,
                zIndex: 10,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Banned by Admin
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            mb={2}
            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 500 }}
          >
            Post ID: {post._id}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar
                sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, cursor: "pointer" }}
                alt={postUser.name || "User"}
                src={postUser.profilePic}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/${postUser.username}`);
                }}
                aria-label={`View ${postUser.name}'s profile`}
              />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="text.primary"
                  sx={{ cursor: "pointer", fontSize: { xs: "1rem", sm: "1.25rem" } }}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/${postUser.username}`);
                  }}
                >
                  {postUser.name}
                  {postUser.isVerified && (
                    <VerifiedIcon
                      color="primary"
                      fontSize="small"
                      sx={{ ml: 0.5, verticalAlign: "middle" }}
                      aria-label="Verified user"
                    />
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                >
                  @{postUser.username} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  {post.isEdited && " (Edited)"}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={(e) => handleMoreClick(e, post._id)}
              size="small"
              aria-label="More actions"
              sx={{ color: "text.primary" }}
            >
              <MoreVert sx={{ fontSize: { xs: 24, sm: 28 } }} />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl) && selectedPostId === post._id}
              onClose={handleMoreClose}
              PaperProps={{
                sx: {
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 2,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <MenuItem
                onClick={() => handleDialogOpen(post._id, post.isBanned ? "unban" : "ban")}
                sx={{ fontSize: "0.875rem", py: 1.5 }}
              >
                {post.isBanned ? (
                  <>
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Unban Post
                  </>
                ) : (
                  <>
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> Ban Post
                  </>
                )}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleDownloadPost(post);
                  handleMoreClose();
                }}
                sx={{ fontSize: "0.875rem", py: 1.5 }}
              >
                <Download sx={{ mr: 1, fontSize: 20 }} /> Download
              </MenuItem>
            </Menu>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 3, flex: 1 }}>
            <Typography
              variant="body1"
              color="text.primary"
              sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word", lineHeight: 1.6 }}
            >
              {post.text}
            </Typography>

            {post.media && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 3,
                  width: "100%",
                  maxHeight: {
                    xs: post.mediaType === "audio" || post.mediaType === "document" ? "auto" : "200px",
                    sm: post.mediaType === "audio" || post.mediaType === "document" ? "auto" : "300px",
                    md: post.mediaType === "audio" || post.mediaType === "document" ? "auto" : "350px",
                  },
                  borderRadius: "12px",
                  overflow: "hidden",
                  bgcolor: "rgba(0, 0, 0, 0.05)",
                  position: "relative",
                }}
              >
                {post.mediaType === "image" && (
                  <>
                    <img
                      src={post.media}
                      alt="Post media"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    {post.isEdited && (
                      <Typography
                        sx={{
                          position: "absolute",
                          bottom: 10,
                          right: 10,
                          bgcolor: "rgba(0, 0, 0, 0.6)",
                          color: "white",
                          p: "4px 12px",
                          borderRadius: 2,
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
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
                    loading="lazy"
                  />
                )}
                {post.mediaType === "audio" && (
                  <Box sx={{ width: "100%", px: { xs: 2, sm: 3 }, py: 2, display: "flex", justifyContent: "center" }}>
                    <audio
                      src={post.media}
                      controls
                      style={{ width: "100%", maxWidth: "450px" }}
                    />
                  </Box>
                )}
                {post.mediaType === "document" && (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 3, width: "100%" }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      {getDocumentIcon(getFileName(post))}
                      <Typography
                        color="text.primary"
                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word", textAlign: "center" }}
                      >
                        {getFileName(post)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 3, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 3 }}>
              <Tooltip title={`${likes.length} Likes`} arrow>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <FavoriteIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                    {likes.length}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title={`${comments.length} Comments`} arrow>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CommentIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                    {comments.length}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title={`${shares.length} Shares`} arrow>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <ShareIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                    {shares.length}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title={`${bookmarks.length} Bookmarks`} arrow>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <BookmarkIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                    {bookmarks.length}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {isLoading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: { xs: 2, sm: 3 }, py: 3, gap: 4 }}>
          {[...Array(3)].map((_, index) => (
            <Box
              key={index}
              sx={{
                width: { xs: "100%", sm: "90%", md: "600px" },
                maxWidth: "600px",
                p: { xs: 2, sm: 3 },
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "20px",
                backdropFilter: "blur(12px)",
              }}
            >
              <Box display="flex" gap={2}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box flex={1}>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Box>
              <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: "12px" }} />
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Skeleton variant="text" width="20%" />
                <Skeleton variant="text" width="20%" />
                <Skeleton variant="text" width="20%" />
                <Skeleton variant="text" width="20%" />
              </Box>
            </Box>
          ))}
        </Box>
      ) : currentUser?.isAdmin ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: { xs: 2, sm: 3 }, py: 3, gap: 4 }}>
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
            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, fontWeight: 500 }}
            >
              No posts available
            </Typography>
          )}
        </Box>
      ) : (
        <Typography
          color="text.secondary"
          sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, fontWeight: 500, textAlign: "center", py: 4 }}
        >
          You are not authorized to view this page.
        </Typography>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        PaperProps={{
          sx: {
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
          {dialogAction === "ban" ? "Ban Post" : "Unban Post"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            Are you sure you want to {dialogAction === "ban" ? "ban" : "unban"} this post?
            {dialogAction === "ban" ? " It will be hidden from users." : " It will be visible to users again."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDialogClose}
            sx={{ color: "text.secondary", fontSize: { xs: "0.875rem", sm: "1rem" } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDialogConfirm}
            sx={{ color: "primary.main", fontSize: { xs: "0.875rem", sm: "1rem" } }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default AdminPostCards;