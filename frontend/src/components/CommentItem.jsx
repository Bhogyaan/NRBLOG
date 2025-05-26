import { memo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { ThumbUp, ThumbUpOffAlt, Edit, Delete } from "@mui/icons-material";
import { message } from "antd";
import { formatDistanceToNow } from "date-fns";
import PropTypes from "prop-types";

const CommentItem = ({
  comment,
  depth = 0,
  currentUser,
  postId,
  postOwnerId,
  onEdit,
  onDelete,
  onLike,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [isLiking, setIsLiking] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(comment.likes || []);

  const isCommentOwner = currentUser?._id === comment.userId?._id?.toString();
  const isPostOwner = currentUser?._id === postOwnerId?.toString();
  const isAdmin = currentUser?.isAdmin;
  const canEdit = isCommentOwner || isAdmin;
  const canDelete = isCommentOwner || isPostOwner || isAdmin;
  const isLiked = optimisticLikes.includes(currentUser?._id);

  const handleEdit = async () => {
    if (!editText.trim()) {
      message.error("Comment text cannot be empty");
      return;
    }
    try {
      await onEdit(comment._id, editText);
      setIsEditing(false);
      message.success("Comment updated successfully");
    } catch (error) {
      console.error("handleEdit: Error", { message: error.message, stack: error.stack, commentId: comment._id });
      message.error(error.message || "Failed to update comment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await onDelete(comment._id);
      message.success("Comment deleted successfully");
    } catch (error) {
      console.error("handleDelete: Error", { message: error.message, stack: error.stack, commentId: comment._id });
      message.error(error.message || "Failed to delete comment");
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      message.error("You must be logged in to like comments");
      return;
    }
    setIsLiking(true);
    const wasLiked = isLiked;
    setOptimisticLikes((prev) =>
      wasLiked
        ? prev.filter((id) => id !== currentUser._id)
        : [...prev, currentUser._id]
    );
    try {
      await onLike(comment._id);
    } catch (error) {
      console.error("handleLike: Error", { message: error.message, stack: error.stack, commentId: comment._id });
      message.error(error.message || "Failed to like/unlike comment");
      setOptimisticLikes(comment.likes || []);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Box
      sx={{
        ml: depth * 1,
        mb: 0.5,
        px: { xs: 1, sm: 2 },
        py: 0.5,
        bgcolor: "background.paper",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        maxWidth: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Avatar
          src={comment.userProfilePic || comment.userId?.profilePic || "/default-avatar.png"}
          alt={comment.username || comment.userId?.username}
          sx={{ width: { xs: 24, sm: 28 }, height: { xs: 24, sm: 28 } }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            <Typography
              variant="body2"
              fontWeight="600"
              fontSize={{ xs: "13px", sm: "14px" }}
              color="text.primary"
            >
              {comment.username || comment.userId?.username || "Unknown"}
            </Typography>
            <Typography
              variant="caption"
              fontSize={{ xs: "11px", sm: "12px" }}
              color="text.secondary"
            >
              {formatDistanceToNow(new Date(comment.createdAt))} ago
              {comment.isEdited && " • Edited"}
            </Typography>
          </Box>

          {isEditing ? (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                multiline
                maxRows={4}
                sx={{
                  bgcolor: "background.default",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                    "& input, & textarea": { color: "text.primary" },
                  },
                }}
              />
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  onClick={handleEdit}
                  disabled={!editText.trim()}
                  sx={{
                    color: "primary.main",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "13px", sm: "14px" },
                    p: 0,
                    minWidth: "auto",
                  }}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.text);
                  }}
                  sx={{
                    color: "text.secondary",
                    textTransform: "none",
                    fontSize: { xs: "13px", sm: "14px" },
                    p: 0,
                    minWidth: "auto",
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography
              variant="body2"
              fontSize={{ xs: "13px", sm: "14px" }}
              color="text.primary"
              sx={{ mt: 0.5, wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              {comment.text}
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, mt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton size="small" onClick={handleLike} sx={{ p: 0 }} disabled={isLiking}>
                {isLiking ? (
                  <CircularProgress size={14} />
                ) : isLiked ? (
                  <ThumbUp sx={{ color: "#1976d2", fontSize: { xs: 14, sm: 16 } }} />
                ) : (
                  <ThumbUpOffAlt sx={{ color: "text.secondary", fontSize: { xs: 14, sm: 16 } }} />
                )}
              </IconButton>
              {optimisticLikes.length > 0 && (
                <Typography
                  variant="caption"
                  fontSize={{ xs: "11px", sm: "12px" }}
                  color="text.secondary"
                >
                  {optimisticLikes.length}
                </Typography>
              )}
            </Box>
            {canEdit && (
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
                sx={{ p: 0 }}
              >
                <Edit sx={{ color: "primary.main", fontSize: { xs: 14, sm: 16 } }} />
              </IconButton>
            )}
            {canDelete && (
              <IconButton
                size="small"
                onClick={handleDelete}
                sx={{ p: 0 }}
              >
                <Delete sx={{ color: "#ED4956", fontSize: { xs: 14, sm: 16 } }} />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

CommentItem.propTypes = {
  comment: PropTypes.object.isRequired,
  depth: PropTypes.number,
  currentUser: PropTypes.object,
  postId: PropTypes.string.isRequired,
  postOwnerId: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onLike: PropTypes.func,
};

export default memo(CommentItem);