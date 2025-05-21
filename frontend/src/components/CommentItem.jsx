import { memo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Collapse,
  CircularProgress,
} from "@mui/material";
import { Favorite, FavoriteBorder, Reply, ExpandMore, ExpandLess, Edit, Delete } from "@mui/icons-material";
import { message } from "antd";
import { formatDistanceToNow } from "date-fns";
import PropTypes from "prop-types";

const CommentItem = ({
  comment,
  depth = 0,
  currentUser,
  postId,
  postOwnerId,
  topLevelCommentId,
  onReply,
  onEdit,
  onDelete,
  onLike,
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
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

  const handleToggleReplies = () => {
    setExpanded(!expanded);
  };

  const handleReply = () => {
    if (!currentUser) {
      message.error("You must be logged in to reply");
      return;
    }
    setShowReplyForm(true);
    onReply?.({
      _id: comment._id,
      commentId: topLevelCommentId || comment._id,
      username: comment.username || comment.userId?.username,
    });
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      message.error("Reply cannot be empty");
      return;
    }
    if (!postId || !comment._id) {
      console.error("handleSubmitReply: Invalid props", { postId, commentId: comment._id, topLevelCommentId });
      message.error("Invalid post or comment data");
      return;
    }

    setIsReplying(true);
    try {
      const endpoint = `/api/posts/post/${postId}/comment/${topLevelCommentId || comment._id}/reply`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text: replyText, parentId: comment._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("handleSubmitReply: API error", { status: res.status, data });
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      message.success("Reply added successfully");
      setReplyText("");
      setShowReplyForm(false);
      onReply?.(null);
      // Socket event will update state
    } catch (error) {
      console.error("handleSubmitReply: Error", { message: error.message, stack: error.stack, postId, commentId: comment._id, topLevelCommentId });
      message.error(error.message || "Failed to add reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) {
      message.error("Comment text cannot be empty");
      return;
    }
    try {
      await onEdit(comment._id, editText, !!comment.parentId, topLevelCommentId || comment._id);
      setIsEditing(false);
      message.success("Comment updated successfully");
      // Socket event will update state
    } catch (error) {
      console.error("handleEdit: Error", { message: error.message, stack: error.stack, commentId: comment._id });
      message.error(error.message || "Failed to update comment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await onDelete(comment._id, !!comment.parentId, topLevelCommentId || comment._id);
      message.success("Comment deleted successfully");
      // Socket event will update state
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
      await onLike(comment._id, !!comment.parentId, topLevelCommentId || comment._id);
      // Socket event will update state
    } catch (error) {
      console.error("handleLike: Error", { message: error.message, stack: error.stack, commentId: comment._id });
      message.error(error.message || "Failed to like/unlike comment");
      setOptimisticLikes(comment.likes || []); // Revert on error
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
        bgcolor: "#FFFFFF",
        borderBottom: "1px solid #EFEFEF",
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
              color="#262626"
            >
              {comment.username || comment.userId?.username || "Unknown"}
            </Typography>
            <Typography
              variant="caption"
              fontSize={{ xs: "11px", sm: "12px" }}
              color="#8E8E8E"
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
                  bgcolor: "#FAFAFA",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#EFEFEF" },
                    "&:hover fieldset": { borderColor: "#DBDBDB" },
                    "&.Mui-focused fieldset": { borderColor: "#0095F6" },
                    "& input, & textarea": { color: "#000000" },
                  },
                }}
              />
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  onClick={handleEdit}
                  disabled={!editText.trim()}
                  sx={{
                    color: "#0095F6",
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
                    color: "#8E8E8E",
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
              color="#262626"
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
                  <Favorite sx={{ color: "#ED4956", fontSize: { xs: 14, sm: 16 } }} />
                ) : (
                  <FavoriteBorder sx={{ color: "#8E8E8E", fontSize: { xs: 14, sm: 16 } }} />
                )}
              </IconButton>
              {optimisticLikes.length > 0 && (
                <Typography
                  variant="caption"
                  fontSize={{ xs: "11px", sm: "12px" }}
                  color="#8E8E8E"
                >
                  {optimisticLikes.length}
                </Typography>
              )}
            </Box>
            <Button
              size="small"
              onClick={handleReply}
              sx={{
                color: "#0095F6",
                textTransform: "none",
                fontWeight: 600,
                fontSize: { xs: "12px", sm: "13px" },
                p: 0,
                minWidth: "auto",
              }}
            >
              Reply
            </Button>
            {canEdit && (
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
                sx={{ p: 0 }}
              >
                <Edit sx={{ color: "#0095F6", fontSize: { xs: 14, sm: 16 } }} />
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

          {showReplyForm && (
            <Box sx={{ mt: 1, ml: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                multiline
                maxRows={4}
                disabled={isReplying}
                sx={{
                  bgcolor: "#FAFAFA",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#EFEFEF" },
                    "&:hover fieldset": { borderColor: "#DBDBDB" },
                    "&.Mui-focused fieldset": { borderColor: "#0095F6" },
                    "& input, & textarea": { color: "#000000" },
                  },
                }}
              />
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || isReplying}
                  sx={{
                    color: "#0095F6",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: { xs: "13px", sm: "14px" },
                    p: 0,
                    minWidth: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {isReplying ? <CircularProgress size={14} /> : "Post"}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                    onReply?.(null);
                  }}
                  sx={{
                    color: "#8E8E8E",
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
          )}
        </Box>
      </Box>

      {comment.replies?.length > 0 && (
        <Box sx={{ ml: { xs: 1, sm: 4 }, mt: 0.5 }}>
          <Button
            size="small"
            onClick={handleToggleReplies}
            sx={{
              color: "#0095F6",
              textTransform: "none",
              fontWeight: 600,
              fontSize: { xs: "12px", sm: "13px" },
              p: 0,
              minWidth: "auto",
            }}
          >
            {expanded
              ? `Hide ${comment.replies.length} repl${comment.replies.length === 1 ? "y" : "ies"}`
              : `View ${comment.replies.length} repl${comment.replies.length === 1 ? "y" : "ies"}`}
          </Button>
          <Collapse in={expanded}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                depth={depth + 1}
                currentUser={currentUser}
                postId={postId}
                postOwnerId={postOwnerId}
                topLevelCommentId={topLevelCommentId || comment._id}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onLike={onLike}
              />
            ))}
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

CommentItem.propTypes = {
  comment: PropTypes.object.isRequired,
  depth: PropTypes.number,
  currentUser: PropTypes.object,
  postId: PropTypes.string.isRequired,
  postOwnerId: PropTypes.string.isRequired,
  topLevelCommentId: PropTypes.string,
  onReply: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onLike: PropTypes.func,
};

export default memo(CommentItem);