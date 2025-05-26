import { useEffect, useState, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { motion, AnimatePresence } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  MoreVert,
  Download,
  Verified as VerifiedIcon,
  Edit,
  Delete,
  Close as CloseIcon,
} from "@mui/icons-material";
import { message } from "antd";
import Actions from "./Actions";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { SocketContext } from "../context/SocketContext.jsx";
import CommentItem from "./CommentItem";
import useShowToast from "../hooks/useShowToast";
import {
  BsFileEarmarkTextFill,
  BsFileZipFill,
  BsFileWordFill,
  BsFileExcelFill,
  BsFilePptFill,
  BsFileTextFill,
} from "react-icons/bs";
import { formatDistanceToNow } from "date-fns";

const PostPage = () => {
  const { pid } = useParams();
  const currentUser = useRecoilValue(userAtom);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments ] = useState(true);
  const showToast = useShowToast();
  const { socket } = useContext(SocketContext);
  const [postUser, setPostUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme => theme.breakpoints.down("small"));

  const currentPost = posts.posts?.find((p) => p._id === pid);

  const fetchPostUser = useCallback(async () => {
    if (!currentPost?.postedBy) return;
    try {
      setIsLoadingUser(true);
      const query = typeof currentPost.postedBy === "string" ? currentPost.postedBy : currentPost.postedBy?._id;
      const res = await fetch(`/api/users/post/${query}`, {
        credentials: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", "User not found", "error");
        return;
      }
      setPostUser({
        ...data,
        username: data.username || "unknown",
        name: data.name || "Unknown User",
        profilePic: data.postImage || "/default-image.png",
        isVerified: data.isVerified || false,
      });
    } catch (error) {
      showToast("Error", error.message, "error");
      setPostUser({
        username: "unknown",
        name: "Unknown User",
        profilePic: "/default-image.png",
        isVerified: false,
      });
    } finally {
      setIsLoadingUser(false);
    }
  }, [currentPost, showToast]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${pid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts ? prev.posts.map((p) => (p._id === pid ? data : p)) : [data],
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/post/${pid}/comments?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      const validatedComments = data.comments.map((comment) => ({
        ...comment,
        username: comment.username || "Unknown User",
        userProfilePic: comment.userProfilePic || "/default-image.png",
        userId: comment.userId || { _id: comment.userId },
      }));
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p._id === pid ? { ...p, comments: validatedComments, commentCount: data.totalComments } : p
        ),
      }));
    } catch (error) {
      message.error(error.message);
    }
  }, [pid, setPosts]);

  useEffect(() => {
    if (currentUser?.isAdmin && currentPost) {
      fetchPostUser();
    }
    if (!currentPost) {
      fetchPost();
    }
  }, [currentPost, currentUser, fetchPostUser]);

  useEffect(() => {
    if (!socket || !pid) return;

    socket.emit("joinPostRoom", `post:${pid}`);

    const updatePostState = (postId, updatedPost) => {
      if (postId !== pid || !updatedPost) return;
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p._id === postId
            ? {
                ...p,
                ...updatedPost,
                comments: (updatedPost.comments || []).map((comment) => ({
                  ...comment,
                  username: comment.username || "Unknown User",
                  userProfilePic: comment.userProfilePic || "/default-image.png",
                  userId: comment.userId || { _id: comment.userId },
                })),
              }
            : p
        ),
      }));
      fetchComments();
    };

    const handlers = {
      newComment: ({ postId, comment, post }) => updatePostState(postId, post),
      likeUnlikeComment: ({ postId, commentId, userId, likes, post }) => updatePostState(postId, post),
      editComment: ({ postId, commentId, text, post }) => updatePostState(postId, post),
      deleteComment: ({ postId, commentId, post }) => updatePostState(postId, post),
      postDeleted: ({ postId }) => {
        if (postId === pid) {
          message.info("This post has been deleted");
          navigate(`/${postUser?.username || ""}`);
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      socket.emit("leavePostRoom", `post:${pid}`);
      Object.keys(handlers).forEach((event) => socket.off(event, handlers[event]));
    };
  }, [socket, pid, setPosts, navigate, postUser, fetchComments]);

  useEffect(() => {
    if (currentPost && currentPost.comments?.some((c) => !c.username || !c.userProfilePic)) {
      fetchComments();
    }
  }, [currentPost, fetchComments]);

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${currentPost._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success("Post deleted");
      if (socket) {
        socket.emit("postDeleted", { postId: currentPost._id, userId: currentUser._id });
      }
      navigate(`/${postUser?.username || ""}`);
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditPost = () => navigate(`/edit-post/${currentPost._id}`);

  const handleDownloadPost = () => {
    const content = currentPost.media || currentPost.text;
    const blob = new Blob([content], {
      type: currentPost.media ? "application/octet-stream" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentPost.originalFilename || `post_${currentPost._id}.${currentPost.mediaType || "txt"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      message.error("Comment cannot be empty");
      return;
    }
    try {
      const res = await fetch(`/api/posts/post/${currentPost._id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text: newComment }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      setNewComment("");
      message.success("Comment added");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEdit = async (commentId, text) => {
    try {
      const res = await fetch(`/api/posts/post/${currentPost._id}/comment/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success("Comment updated");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/posts/post/${currentPost._id}/comment/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success("Comment deleted");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleLike = async (id) => {
    if (!currentUser) return message.error("You must be logged in to like");
    try {
      const res = await fetch(`/api/posts/post/${currentPost._id}/comment/${id}/like`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success(data.likes.includes(currentUser._id) ? "Liked" : "Unliked");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const toggleComments = () => {
    setShowComments((prev) => !prev);
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

  const getFileName = () => {
    return currentPost.originalFilename || currentPost.media?.split("/").pop() || "Unnamed Document";
  };

  const renderPost = () => {
    if (isLoadingUser || !postUser) {
      return (
        <Box sx={{ maxWidth: "600px", mx: "auto", p: 2, bgcolor: "background.paper" }}>
          <Typography color="text.primary">Loading...</Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          maxWidth: "600px",
          mx: "auto",
          bgcolor: "background.paper",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={postUser.profilePic}
              alt={postUser.username}
              sx={{ width: 32, height: 32 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body2"
                fontWeight="bold"
                color="text.primary"
                sx={{ cursor: "pointer" }}
                onClick={() => navigate(`/${postUser.username}`)}
              >
                {postUser.username}
              </Typography>
              {postUser.isVerified && <VerifiedIcon color="primary" fontSize="small" />}
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(currentPost.createdAt))} ago
                {currentPost.isEdited && " • Edited"}
              </Typography>
            </Box>
          </Box>
          {(currentUser?._id === postUser._id || currentUser?.isAdmin) && (
            <>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
                <MoreVert sx={{ color: "text.primary" }} />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={handleEditPost}>
                  <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem onClick={handleDeletePost}>
                  <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
                <MenuItem onClick={handleDownloadPost}>
                  <Download fontSize="small" sx={{ mr: 1 }} /> Download
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {currentPost.media && (
          <Box sx={{ overflow: "hidden" }}>
            {currentPost.mediaType === "image" && (
              <img
                src={currentPost.media}
                alt="Post media"
                style={{ width: "100%", objectFit: "cover" }}
              />
            )}
            {currentPost.mediaType === "video" && (
              <video
                controls
                src={currentPost.media}
                style={{ width: "100%" }}
              />
            )}
            {currentPost.mediaType === "audio" && (
              <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                <audio
                  controls
                  src={currentPost.media}
                  style={{ width: "100%", maxWidth: "400px" }}
                />
              </Box>
            )}
            {currentPost.mediaType === "document" && (
              <Box sx={{ p: 2, display: "flex", justifyContent: "center", alignItems: "center" }}>
                {getDocumentIcon(getFileName())}
                <Typography color="text.primary" sx={{ ml: 1 }}>
                  {getFileName()}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ p: 2 }}>
          <Actions post={currentPost} onCommentClick={toggleComments} />
          <Typography variant="body2" color="text.primary" sx={{ mt: 1, wordBreak: "break-word" }}>
            <strong>{postUser.username}</strong> {currentPost.text}
          </Typography>
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
              <Box sx={{ px: 2, py: 2, bgcolor: "background.paper" }}>
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
                      <CloseIcon sx={{ color: "text.primary", fontSize: 20 }} />
                    </IconButton>
                  </Box>
                )}
                {currentUser && (
                  <Box sx={{ display: "flex", gap: 2, mb: 2, flexDirection: { xs: "column", sm: "row" } }}>
                    <Avatar
                      src={currentUser.profilePic}
                      alt={currentUser.username}
                      sx={{ width: { xs: 24, sm: 32 }, height: { xs: 24, sm: 32 } }}
                    />
                    <Box flex={1}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        sx={{
                          bgcolor: "background.default",
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                            "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                            "&.Mui-focused fieldset": { borderColor: "primary.main" },
                            "& input, & textarea": { color: "text.primary" },
                          },
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        }}
                        multiline
                        maxRows={4}
                      />
                    </Box>
                    <Button
                      onClick={handleAddComment}
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
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
                  currentPost.comments.map((comment) => (
                    <CommentItem
                      key={comment._id}
                      comment={comment}
                      depth={0}
                      currentUser={currentUser}
                      postId={currentPost._id}
                      postOwnerId={currentPost.postedBy._id}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onLike={handleLike}
                    />
                  ))
                ) : (
                  <Typography color="text.primary" textAlign="center">
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
      {currentPost ? renderPost() : <Typography color="text.primary">Post not found</Typography>}
    </motion.div>
  );
};

export default PostPage;