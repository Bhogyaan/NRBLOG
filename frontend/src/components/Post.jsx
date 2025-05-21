import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Button,
  TextField,
  Skeleton,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  MoreVert,
  Edit,
  Delete,
  Download,
  Favorite,
  FavoriteBorder,
  Reply,
  Verified as VerifiedIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import useShowToast from "../hooks/useShowToast";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import Actions from "./Actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  BsFileEarmarkTextFill,
  BsFileZipFill,
  BsFileWordFill,
  BsFileExcelFill,
  BsFilePptFill,
  BsFileTextFill,
} from "react-icons/bs";
import CommentItem from "../components/CommentItem";
import { SocketContext } from "../context/SocketContext";

const Post = ({ post, postedBy, isAdminView = false, onBanUnbanPost }) => {
  const [user, setUser] = useState(null);
  const [allPostsUsers, setAllPostsUsers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [commentPage, setCommentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const showToast = useShowToast();
  const currentUser = useRecoilValue(userAtom);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchComments = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/posts/post/${post._id}/comments?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: page === 1 ? data : [...(p.comments || []), ...data],
              }
            : p
        ),
      }));
      setTotalComments(data.length);
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  }, [post._id, setPosts, showToast]);

  useEffect(() => {
    if (showComments) {
      fetchComments(1);
    }
  }, [fetchComments, showComments]);

  useEffect(() => {
    if (socket) {
      const room = `post:${post._id}`;
      socket.emit("joinPostRoom", room);
      console.log(`Joined room: ${room}`);

     // Update the handlers object in the socket useEffect
const handlers = {
  newComment: ({ postId, comment, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
      setTotalComments(updatedPost.comments.length);
    }
  },
  newReply: ({ postId, commentId, reply, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
    }
  },
  likeUnlikeComment: ({ postId, commentId, userId, likes, comment: updatedComment, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
    }
  },
  likeUnlikeReply: ({ postId, commentId, replyId, userId, likes, reply: updatedReply, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
    }
  },
  editComment: ({ postId, commentId, comment: updatedComment, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
    }
  },
  editReply: ({ postId, commentId, replyId, reply: updatedReply, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
    }
  },
  deleteComment: ({ postId, commentId, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
      setTotalComments(updatedPost.comments.length);
    }
  },
  deleteReply: ({ postId, commentId, replyId, post: updatedPost }) => {
    if (postId === post._id && updatedPost) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => 
          p._id === postId ? { ...p, comments: updatedPost.comments } : p
        ),
      }));
    }
  },
  postDeleted: ({ postId }) => {
    if (postId === post._id) {
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p._id !== postId),
      }));
    }
  }
};

      Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

      return () => {
        socket.emit("leavePostRoom", room);
        console.log(`Left room: ${room}`);
        Object.keys(handlers).forEach((event) => socket.off(event, handlers[event]));
      };
    }
  }, [socket, post._id, setPosts, showToast]);

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isAdminView && currentUser?.isAdmin) {
        const res = await fetch("/api/users/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          setAllPostsUsers({});
          return;
        }
        const usersMap = data.reduce((acc, user) => {
          acc[user._id] = {
            ...user,
            username: user.username || "Unknown User",
            profilePic: user.profilePic || "/default-avatar.png",
            name: user.name || "Unknown",
          };
          return acc;
        }, {});
        setAllPostsUsers(usersMap);
      } else {
        const query =
          typeof postedBy === "string" ? postedBy : postedBy?._id || postedBy?.username;
        if (!query) {
          showToast("Error", "Invalid user data for post", "error");
          return;
        }
        const res = await fetch(`/api/users/profile/${query}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", "User not found", "error");
          return;
        }
        setUser({
          ...data,
          username: data.username || "Unknown User",
          profilePic: data.profilePic || "/default-avatar.png",
          name: data.name || "Unknown",
        });
      }
    } catch (error) {
      showToast("Error", error.message, "error");
      setAllPostsUsers({});
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [postedBy, showToast, isAdminView, currentUser?.isAdmin]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      showToast("Success", "Post deleted", "success");
      setPosts((prev) => ({
        ...prev,
        posts: (prev.posts || []).filter((p) => p._id !== post._id),
        bookmarks: (prev.bookmarks || []).filter((p) => p._id !== post._id),
        suggestedPosts: (prev.suggestedPosts || []).filter((p) => p._id !== post._id),
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleEditPost = () => navigate(`/edit-post/${post._id}`);

  const handleDownloadPost = () => {
    const content = post.media || post.text;
    const blob = new Blob([content], { type: post.media ? "application/octet-stream" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = post.originalFilename || `post_${post._id}.${post.mediaType || "txt"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMoreClick = (event) => setAnchorEl(event.currentTarget);
  const handleMoreClose = () => setAnchorEl(null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return showToast("Error", "Comment cannot be empty", "error");
    try {
      const endpoint = replyTo
        ? `/api/posts/post/${post._id}/comment/${replyTo.commentId}/reply`
        : `/api/posts/post/${post._id}/comment`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify({ text: newComment, parentId: replyTo?._id }),
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      setNewComment("");
      setReplyTo(null);
      showToast("Success", replyTo ? "Reply added" : "Comment added", "success");
      // Socket event will update comments, no need to call fetchComments
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleEditComment = async (commentId, text, isReply, parentCommentId) => {
    if (!text.trim()) return showToast("Error", "Comment text cannot be empty", "error");
    try {
      const endpoint = isReply
        ? `/api/posts/post/${post._id}/comment/${parentCommentId}/reply/${commentId}`
        : `/api/posts/post/${post._id}/comment/${commentId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");
      showToast("Success", "Comment updated", "success");
      // Socket event will update comments, no need to call fetchComments
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleDeleteComment = async (commentId, isReply, parentCommentId) => {
    try {
      const endpoint = isReply
        ? `/api/posts/post/${post._id}/comment/${parentCommentId}/reply/${commentId}`
        : `/api/posts/post/${post._id}/comment/${commentId}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");
      showToast("Success", "Comment deleted successfully", "success");
      // Socket event will update comments, no need to call fetchComments
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleLikeComment = async (commentId, isReply = false, parentCommentId) => {
    if (!commentId) return showToast("Error", "Invalid comment ID", "error");
    try {
      const endpoint = isReply
        ? `/api/posts/post/${post._id}/comment/${parentCommentId}/reply/${commentId}/like`
        : `/api/posts/post/${post._id}/comment/${commentId}/like`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");
      // Socket event will update comments, no need to call fetchComments
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleLoadMoreComments = () => {
    setCommentPage((prev) => prev + 1);
    fetchComments(commentPage + 1);
  };

  const toggleComments = () => {
    setShowComments((prev) => !prev);
  };

  const renderPost = (currentPost, postUser) => {
    if (!postUser) return null;

    const getDocumentIcon = (filename) => {
      const ext = filename?.split(".").pop()?.toLowerCase() || "";
      switch (ext) {
        case "pdf":
          return <BsFileEarmarkTextFill size={24} />;
        case "zip":
          return <BsFileZipFill size={24} />;
        case "doc":
        case "docx":
          return <BsFileWordFill size={24} />;
        case "xls":
        case "xlsx":
          return <BsFileExcelFill size={24} />;
        case "ppt":
        case "pptx":
          return <BsFilePptFill size={24} />;
        case "txt":
        case "rtf":
          return <BsFileTextFill size={24} />;
        default:
          return <BsFileEarmarkTextFill size={24} />;
      }
    };

    const getFileName = () => {
      return currentPost.originalFilename || currentPost.media?.split("/").pop() || "Unnamed Document";
    };

    return (
      <Box
        key={currentPost._id}
        mb={isAdminView ? 4 : 2}
        sx={{
          width: { xs: "100%", sm: "90%", md: "600px" },
          maxWidth: "600px",
          minHeight: { xs: "auto", sm: "350px", md: "400px" },
          mx: { xs: 0, sm: "auto" },
          background: "background.paper",
          padding: { xs: 1, sm: 2, md: 2.5 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {currentPost.isBanned && (
          <Typography
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              color: "error.main",
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
        {isAdminView && (
          <Typography variant="caption" color="text.primary" mb={1}>
            Post ID: {currentPost._id}
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{ width: { xs: 32, sm: 40, md: 48 }, height: { xs: 32, sm: 40, md: 48 }, cursor: "pointer" }}
              alt={postUser.name || "User"}
              src={postUser.profilePic || "/default-avatar.png"}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/${postUser.username}`);
              }}
            />
            <Box display="flex" alignItems="center">
              <Typography
                variant="body2"
                fontWeight="bold"
                color="text.primary"
                sx={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/${postUser.username}`);
                }}
              >
                {postUser.username || "Unknown User"}
              </Typography>
              {postUser.isVerified && (
                <VerifiedIcon
                  color="primary"
                  fontSize="small"
                  sx={{ ml: 1 }}
                />
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" }, ml: 1 }}
              >
                {formatDistanceToNow(new Date(currentPost.createdAt))} ago
                {currentPost.isEdited && " (Edited)"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleMoreClick} size="small">
            <MoreVert sx={{ color: "text.primary", fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMoreClose}>
            {(currentUser?._id === postUser._id || currentUser?.isAdmin) && [
              <MenuItem key="edit" onClick={handleEditPost}>
                <Edit sx={{ mr: 1 }} /> Edit
              </MenuItem>,
              <MenuItem key="delete" onClick={handleDeletePost}>
                <Delete sx={{ mr: 1 }} /> Delete
              </MenuItem>,
            ]}
            <MenuItem onClick={handleDownloadPost}>
              <Download sx={{ mr: 1 }} /> Download
            </MenuItem>
            {currentUser?.isAdmin && (
              <MenuItem
                key="ban-unban"
                onClick={() => {
                  handleMoreClose();
                  onBanUnbanPost?.(currentPost._id, currentPost.isBanned);
                }}
              >
                {currentPost.isBanned ? (
                  <>
                    <Edit sx={{ mr: 1 }} /> Unban
                  </>
                ) : (
                  <>
                    <Delete sx={{ mr: 1 }} /> Ban
                  </>
                )}
              </MenuItem>
            )}
          </Menu>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 2, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word" }}
          >
            {currentPost.text}
          </Typography>

          {currentPost.media && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 2,
                width: "100%",
                height: {
                  xs: currentPost.mediaType === "audio" || currentPost.mediaType === "document" ? "auto" : "180px",
                  sm: currentPost.mediaType === "audio" || currentPost.mediaType === "document" ? "auto" : "250px",
                  md: currentPost.mediaType === "audio" || currentPost.mediaType === "document" ? "auto" : "300px",
                },
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {currentPost.mediaType === "image" && (
                <>
                  <img
                    src={currentPost.media}
                    alt="Post"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {currentPost.isEdited && (
                    <Typography
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        right: 10,
                        bgcolor: "rgba(0, 0, 0, 0.6)",
                        color: "text.primary",
                        p: "2px 8px",
                        borderRadius: 2,
                        fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      }}
                    >
                      Edited
                    </Typography>
                  )}
                </>
              )}
              {currentPost.mediaType === "video" && (
                <video
                  src={currentPost.media}
                  controls
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {currentPost.mediaType === "audio" && (
                <Box sx={{ width: "100%", px: { xs: 1, sm: 2 }, py: 1, display: "flex", justifyContent: "center" }}>
                  <audio
                    src={currentPost.media}
                    controls
                    style={{ width: "100%", maxWidth: "400px" }}
                  />
                </Box>
              )}
              {currentPost.mediaType === "document" && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, width: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getDocumentIcon(getFileName())}
                    <Typography
                      color="text.primary"
                      sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word", textAlign: "center" }}
                    >
                      {getFileName()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: "auto", width: "100%", display: "flex", justifyContent: "center" }}>
          <Actions post={currentPost} onCommentClick={toggleComments} />
        </Box>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={isSmallScreen ? { y: "100%" } : { opacity: 0 }}
              animate={isSmallScreen ? { y: 0 } : { opacity: 1 }}
              exit={isSmallScreen ? { y: "100%" } : { opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={
                isSmallScreen
                  ? {
                      position: "fixed",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "80vh",
                      background: theme.palette.background.paper,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      overflowY: "auto",
                      zIndex: 1000,
                    }
                  : {}
              }
            >
              <Box sx={{ px: { xs: 1, sm: 2 }, py: 2, bgcolor: "background.paper" }}>
                {isSmallScreen && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 4,
                        bgcolor: "text.secondary",
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                      onClick={toggleComments}
                    />
                    <IconButton onClick={toggleComments} size="small">
                      <CloseIcon sx={{ color: "text.primary", fontSize: { xs: 20, sm: 24 } }} />
                    </IconButton>
                  </Box>
                )}
                {currentUser && (
                  <Box display="flex" gap={{ xs: 1, sm: 2 }} mb={2} flexDirection={{ xs: "column", sm: "row" }}>
                    <Avatar
                      src={currentUser.profilePic}
                      alt={currentUser.username}
                      sx={{ width: { xs: 24, sm: 32 }, height: { xs: 24, sm: 32 } }}
                    />
                    <Box flex={1}>
                      {replyTo && (
                        <Typography variant="caption" color="text.primary" mb={1}>
                          Replying to {replyTo.username}
                        </Typography>
                      )}
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder={replyTo ? "Add a reply..." : "Add a comment..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        sx={{
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          input: { color: "text.primary" },
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                            "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                            "&.Mui-focused fieldset": { borderColor: "primary.main" },
                          },
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        }}
                      />
                    </Box>
                    <Button
                      onClick={handleAddComment}
                      sx={{
                        bgcolor: "primary.main",
                        color: "text.primary",
                        "&:hover": { bgcolor: "primary.dark" },
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        px: { xs: 1, sm: 2 },
                      }}
                    >
                      Post
                    </Button>
                  </Box>
                )}

                {(currentPost.comments || []).length > 0 ? (
                  <>
                    {currentPost.comments.map((comment) => {
                      return (
                        <CommentItem
                          key={comment._id}
                          comment={comment}
                          depth={0}
                          currentUser={currentUser}
                          postId={currentPost._id}
                          postOwnerId={currentPost.postedBy._id}
                          topLevelCommentId={comment._id}
                          onReply={setReplyTo}
                          onEdit={handleEditComment}
                          onDelete={handleDeleteComment}
                          onLike={handleLikeComment}
                        />
                      );
                    })}
                    {totalComments > currentPost.comments.length && (
                      <Button
                        onClick={handleLoadMoreComments}
                        sx={{ mt: 1, color: "secondary.main", textTransform: "none" }}
                      >
                        Load more comments ({totalComments - currentPost.comments.length} remaining)
                      </Button>
                    )}
                  </>
                ) : (
                  <Typography color="text.primary" textAlign="center" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                    No comments yet.
                  </Typography>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {isLoading ? (
        <Box sx={{ width: { xs: "100%", sm: "90%", md: "600px" }, maxWidth: "600px", mx: { xs: 0, sm: "auto" }, p: { xs: 1, sm: 2 } }}>
          <Box display="flex" gap={2}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box flex={1}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={180} sx={{ mt: 2, borderRadius: "8px" }} />
          <Box display="flex" justifyContent="center" mt={2}>
            <Skeleton variant="text" width="50%" />
          </Box>
        </Box>
      ) : isAdminView && currentUser?.isAdmin ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: { xs: 1, sm: 2 }, py: 2 }}>
          {posts.posts.length > 0 ? (
            posts.posts.map((adminPost) => {
              const postUser = allPostsUsers[adminPost.postedBy] || {
                username: "Unknown User",
                profilePic: "/default-avatar.png",
                name: "Unknown",
                isVerified: false,
              };
              return renderPost(adminPost, postUser);
            })
          ) : (
            <Typography color="text.secondary">No posts available</Typography>
          )}
        </Box>
      ) : user ? (
        renderPost(post, user)
      ) : null}
    </motion.div>
  );
};

export default Post;