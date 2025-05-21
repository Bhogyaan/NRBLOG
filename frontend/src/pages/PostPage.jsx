import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  Typography,
  Divider,
  Menu,
  MenuItem,
  IconButton,
  TextField,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  MoreVert,
  Download,
  Verified as VerifiedIcon,
  Edit,
  Delete,
} from "@mui/icons-material";
import { message } from "antd";
import { debounce } from "lodash";
import Actions from "../components/Actions";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../contexts/SocketContext";
import CommentItem from "../components/CommentItem";
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
  const [dialogComment, setDialogComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const commentInputRef = useRef(null);
  const dialogCommentInputRef = useRef(null);
  const { socket } = useSocket();
  const showToast = useShowToast();
  const [postUser, setPostUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const currentPost = posts.posts?.find((p) => p._id === pid);

  const debouncedSetNewComment = debounce((value) => {
    setNewComment(value);
  }, 100);

  const debouncedSetDialogComment = debounce((value) => {
    setDialogComment(value);
  }, 100);

  const fetchPostUser = useCallback(async () => {
    if (!currentPost?.postedBy) return;
    try {
      setIsLoadingUser(true);
      const query = typeof currentPost.postedBy === "string" ? currentPost.postedBy : currentPost.postedBy?._id;
      const res = await fetch(`/api/users/${query}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        profilePic: data.profilePic || "/default-avatar.png",
        isVerified: data.isVerified || false,
      });
    } catch (error) {
      showToast("Error", error.message, "error");
      setPostUser({
        username: "unknown",
        name: "Unknown User",
        profilePic: "/default-avatar.png",
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
      const res = await fetch(`/api/posts/${pid}/comments?page=1&limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      const validatedComments = data.comments.map((comment) => ({
        ...comment,
        replies: (comment.replies || []).map((reply) => ({
          ...reply,
          username: reply.username || "Unknown User",
          userProfilePic: reply.userProfilePic || "/default-avatar.png",
          userId: reply.userId || comment.userId,
        })),
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

    socket.emit("joinPostRoom", pid);

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
                  replies: (comment.replies || []).map((reply) => ({
                    ...reply,
                    username: reply.username || "Unknown User",
                    userProfilePic: reply.userProfilePic || "/default-avatar.png",
                    userId: reply.userId || comment.userId,
                  })),
                })),
              }
            : p
        ),
      }));
      fetchComments();
    };

    socket.on("newComment", ({ postId, comment, post }) => {
      updatePostState(postId, post);
    });

    socket.on("newReply", ({ postId, commentId, reply, post }) => {
      updatePostState(postId, post);
      setActiveReplyId(null);
    });

    socket.on("likeUnlikeComment", ({ postId, commentId, userId, likes, post }) => {
      updatePostState(postId, post);
    });

    socket.on("likeUnlikeReply", ({ postId, commentId, replyId, userId, likes, post }) => {
      updatePostState(postId, post);
    });

    socket.on("editComment", ({ postId, commentId, text, post }) => {
      updatePostState(postId, post);
    });

    socket.on("editReply", ({ postId, commentId, replyId, text, post }) => {
      updatePostState(postId, post);
    });

    socket.on("deleteComment", ({ postId, commentId, post }) => {
      updatePostState(postId, post);
    });

    socket.on("deleteReply", ({ postId, commentId, replyId, post }) => {
      updatePostState(postId, post);
    });

    socket.on("postDeleted", ({ postId }) => {
      if (postId === pid) {
        message.info("This post has been deleted");
        navigate(`/${postUser?.username || ""}`);
      }
    });

    return () => {
      socket.emit("leavePostRoom", pid);
      socket.off("newComment");
      socket.off("newReply");
      socket.off("likeUnlikeComment");
      socket.off("likeUnlikeReply");
      socket.off("editComment");
      socket.off("editReply");
      socket.off("deleteComment");
      socket.off("deleteReply");
      socket.off("postDeleted");
    };
  }, [socket, pid, setPosts, navigate, postUser, fetchComments]);

  useEffect(() => {
    if (currentPost && currentPost.comments?.some((c) => c.replies?.some((r) => !r.username || !r.userProfilePic))) {
      fetchComments();
    }
  }, [currentPost, fetchComments]);

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${currentPost._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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
    const commentText = openCommentDialog ? dialogComment : newComment;
    if (!commentText.trim()) {
      message.error("Comment cannot be empty");
      return;
    }
    if (activeReplyId) {
      message.error("Please complete or cancel the reply before posting a comment");
      return;
    }
    setIsCommenting(true);
    try {
      const res = await fetch(`/api/posts/${currentPost._id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      setNewComment("");
      setDialogComment("");
      setOpenCommentDialog(false);
      message.success("Comment added");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !activeReplyId) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleReply = (replyData) => {
    setActiveReplyId(replyData ? replyData.commentId : null);
  };

  const handleEdit = async (commentId, text, isReply, parentCommentId) => {
    try {
      const endpoint = isReply
        ? `/api/posts/${currentPost._id}/comments/${parentCommentId}/replies/${commentId}`
        : `/api/posts/${currentPost._id}/comments/${commentId}`;
      const res = await fetch(endpoint, {
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
      message.success(isReply ? "Reply updated" : "Comment updated");
      fetchComments();
      if (socket) {
        socket.emit(isReply ? "editReply" : "editComment", {
          postId: currentPost._id,
          commentId: isReply ? parentCommentId : commentId,
          replyId: isReply ? commentId : undefined,
          text,
        });
      }
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDelete = async (id, isReply, parentId) => {
    try {
      const endpoint = isReply
        ? `/api/posts/${currentPost._id}/comments/${parentId}/replies/${id}`
        : `/api/posts/${currentPost._id}/comments/${id}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success(isReply ? "Reply deleted" : "Comment deleted");
      fetchComments();
      if (socket) {
        socket.emit(isReply ? "deleteReply" : "deleteComment", {
          postId: currentPost._id,
          commentId: isReply ? parentId : id,
          replyId: isReply ? id : undefined,
        });
      }
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleLike = async (id, isReply, parentId) => {
    if (!currentUser) return message.error("You must be logged in to like");
    try {
      const endpoint = isReply
        ? `/api/posts/${currentPost._id}/comments/${parentId}/replies/${id}/like`
        : `/api/posts/${currentPost._id}/comments/${id}/like`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success(data.likes.includes(currentUser._id) ? "Liked" : "Unliked");
      fetchComments();
      if (socket) {
        socket.emit(isReply ? "likeUnlikeReply" : "likeUnlikeComment", {
          postId: currentPost._id,
          commentId: isReply ? parentId : id,
          replyId: isReply ? id : undefined,
          userId: currentUser._id,
          likes: data.likes,
        });
      }
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleCommentClick = () => {
    if (!currentUser) {
      message.error("Please log in to comment");
      navigate("/login");
      return;
    }
    if (activeReplyId) {
      message.error("Please complete or cancel the reply before adding a new comment");
      return;
    }
    setOpenCommentDialog(true);
  };

  const handleCloseCommentDialog = () => {
    setOpenCommentDialog(false);
    setDialogComment("");
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
        <Box className="max-w-lg mx-auto p-4 bg-white rounded-lg">
          <Typography>Loading...</Typography>
        </Box>
      );
    }

    return (
      <Paper
        elevation={0}
        className="max-w-lg mx-auto bg-white rounded-none shadow-none"
      >
        <Box className="flex justify-between items-center p-3">
          <Box className="flex items-center gap=2">
            <Avatar
              src={postUser.profilePic}
              alt={postUser.username}
              className="w-8 h-8"
            />
            <Typography className="font-semibold text-sm text-gray-900">
              {postUser.username}
            </Typography>
            {postUser.isVerified && (
              <VerifiedIcon color="primary" fontSize="small" />
            )}
          </Box>
          <Box className="flex items-center gap=1">
            <Typography className="text-gray-500 text-xs">
              {formatDistanceToNow(new Date(currentPost.createdAt))} ago
            </Typography>
            {currentUser?._id === postUser._id && (
              <IconButton onClick={handleMoreClick} size="small">
                <MoreVert className="text-gray-500" fontSize="small" />
              </IconButton>
            )}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={handleEditPost}>
                <Edit fontSize="small" className="mr-2" /> Edit
              </MenuItem>
              <MenuItem onClick={handleDeletePost}>
                <Delete fontSize="small" className="mr-2" /> Delete
              </MenuItem>
              <MenuItem onClick={handleDownloadPost}>
                <Download fontSize="small" className="mr-2" /> Download
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {currentPost.media && (
          <Box className="rounded-none overflow-hidden">
            {currentPost.mediaType === "image" && (
              <img
                src={currentPost.media}
                alt="Post media"
                className="w-full object-cover"
              />
            )}
            {currentPost.mediaType === "video" && (
              <video
                controls
                src={currentPost.media}
                className="w-full"
              />
            )}
            {currentPost.mediaType === "audio" && (
              <audio
                controls
                src={currentPost.media}
                className="w-full"
              />
            )}
            {currentPost.mediaType === "document" && (
              <a
                href={currentPost.media}
                target="_blank"
                rel="noreferrer"
                className="block p-4 text-center"
              >
                <Button variant="outlined" className="text-sm">
                  View Document
                </Button>
              </a>
            )}
          </Box>
        )}

        <Box className="p-3">
          <Actions post={currentPost} onCommentClick={handleCommentClick} />
          <Typography className="font-semibold text-sm text-gray-900 mb-1">
            {currentPost.commentCount || 0} comments
          </Typography>
          <Typography className="text-sm text-gray-800 mb-2 break-words">
            <strong>{postUser.username}</strong> {currentPost.text}
          </Typography>

          <Divider className="my-2" />

          {currentUser && (
            <Box className="flex gap-2 mb-3 items-center">
              <Avatar
                src={currentUser.profilePic}
                alt={currentUser.username}
                className="w-7 h-7"
              />
              <TextField
                inputRef={commentInputRef}
                fullWidth
                variant="outlined"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => debouncedSetNewComment(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!!activeReplyId}
                size="small"
                className="bg-gray-50 rounded-full"
                InputProps={{ className: "text-sm py-2 px-4" }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isCommenting || !!activeReplyId}
                className="text-blue-500 font-semibold text-sm"
              >
                {isCommenting ? "Posting..." : "Post"}
              </Button>
            </Box>
          )}

          <Box>
            {currentPost.comments?.length > 0 ? (
              currentPost.comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  depth={0}
                  currentUser={currentUser}
                  postId={currentPost._id}
                  postOwnerId={currentPost.postedBy._id || currentPost.postedBy}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  fetchComments={fetchComments}
                />
              ))
            ) : (
              <Typography className="text-gray-500 text-sm">
                No comments yet.
              </Typography>
            )}
          </Box>
        </Box>

        <Dialog
          open={openCommentDialog}
          onClose={handleCloseCommentDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Add a Comment</DialogTitle>
          <DialogContent>
            <TextField
              inputRef={dialogCommentInputRef}
              autoFocus
              fullWidth
              variant="outlined"
              placeholder="Write your comment..."
              value={dialogComment}
              onChange={(e) => debouncedSetDialogComment(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              rows={4}
              className="bg-gray-50 rounded-lg"
              InputProps={{ className: "text-sm" }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCommentDialog} className="text-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleAddComment}
              disabled={!dialogComment.trim() || isCommenting}
              className="bg-blue-500 text-white rounded-full"
            >
              {isCommenting ? "Posting..." : "Post"}
            </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

if (!currentPost) {
  return (
    <Box className="flex justify-center p-4">
      <Typography>Post not found</Typography>
    </Box>
  );
}

return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="bg-gray-50 min-h-screen p-4"
  >
    {renderPost()}
  </motion.div>
);
};

export default PostPage;