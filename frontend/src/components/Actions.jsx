import React, { useState, useCallback } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import useShowToast from "../hooks/useShowToast";
import useBookmark from "../hooks/useBookmark";
import {
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Bookmark,
  BookmarkBorder,
  Share as ShareIcon,
} from "@mui/icons-material";
import { Flex as AntdFlex } from "antd";
import { motion } from "framer-motion";

const Actions = ({ post, onCommentClick }) => {
  const user = useRecoilValue(userAtom);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const [liked, setLiked] = useState(post.likes?.includes(user?._id) || false);
  const [bookmarked, setBookmarked] = useState(post.bookmarks?.includes(user?._id) || false);
  const [isLiking, setIsLiking] = useState(false);
  const showToast = useShowToast();
  const { handleBookmark, isBookmarking } = useBookmark();

  const handleLikeAndUnlike = useCallback(async () => {
    if (!user) {
      showToast("Error", "You must be logged in to like a post", "error");
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const res = await fetch(`/api/posts/like/${post._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      setPostsState((prev) => ({
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p._id === post._id ? { ...p, likes: data.likes } : p
        ),
        bookmarks: (prev.bookmarks || []).map((p) =>
          p._id === post._id ? { ...p, likes: data.likes } : p
        ),
        suggestedPosts: (prev.suggestedPosts || []).map((p) =>
          p._id === post._id ? { ...p, likes: data.likes } : p
        ),
      }));
      setLiked((prev) => !prev);
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setIsLiking(false);
    }
  }, [user, isLiking, post._id, showToast, setPostsState]);

  const onBookmarkClick = useCallback(async () => {
    if (!user) {
      showToast("Error", "You must be logged in to bookmark a post", "error");
      return;
    }
    const result = await handleBookmark(post._id);
    if (result !== null) {
      setBookmarked(result);
      setPostsState((prev) => ({
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                bookmarks: result
                  ? [...(p.bookmarks || []), user._id]
                  : (p.bookmarks || []).filter((id) => id !== user._id),
              }
            : p
        ),
        bookmarks: (prev.bookmarks || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                bookmarks: result
                  ? [...(p.bookmarks || []), user._id]
                  : (p.bookmarks || []).filter((id) => id !== user._id),
              }
            : p
        ),
        suggestedPosts: (prev.suggestedPosts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                bookmarks: result
                  ? [...(p.bookmarks || []), user._id]
                  : (p.bookmarks || []).filter((id) => id !== user._id),
              }
            : p
        ),
      }));
    }
  }, [user, post._id, handleBookmark, showToast, setPostsState]);

  const handleShare = useCallback(() => {
    if (!user) {
      showToast("Error", "You must be logged in to share a post", "error");
      return;
    }
    const postUrl = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(postUrl)
      .then(() => showToast("Success", "Post link copied to clipboard", "success"))
      .catch(() => showToast("Error", "Failed to copy link", "error"));
  }, [user, post._id, showToast]);

  const handleCommentClick = () => {
    if (!user) {
      showToast("Error", "You must be logged in to comment", "error");
      return;
    }
    if (onCommentClick) onCommentClick();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        py: { xs: 1, sm: 1.5, md: 2 },
        px: { xs: 1, sm: 2, md: 3 },
        mt: 1,
        width: "100%",
        maxWidth: { xs: "100%", sm: "90%", md: "600px" },
        mx: "auto",
      }}
    >
      <AntdFlex
        gap={{ xs: 8, sm: 12, md: 16 }}
        justify="center"
        sx={{ my: { xs: 0.5, sm: 1, md: 1.5 } }}
      >
        <IconButton
          component={motion.button}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLikeAndUnlike}
          disabled={isLiking}
          sx={{ color: liked ? "#ED4956" : "text.secondary", p: { xs: 0.5, sm: 1 } }}
        >
          {liked ? (
            <FavoriteIcon sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
          ) : (
            <FavoriteBorderIcon sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
          )}
        </IconButton>
        <IconButton
          component={motion.button}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCommentClick}
          sx={{ color: "primary.main", p: { xs: 0.5, sm: 1 } }}
        >
          <CommentIcon sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
        </IconButton>
        <IconButton
          component={motion.button}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBookmarkClick}
          disabled={isBookmarking[post._id]}
          sx={{ color: bookmarked ? "#FFD700" : "text.secondary", p: { xs: 0.5, sm: 1 } }}
        >
          {bookmarked ? (
            <Bookmark sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
          ) : (
            <BookmarkBorder sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
          )}
        </IconButton>
        <IconButton
          component={motion.button}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          sx={{ color: "text.secondary", p: { xs: 0.5, sm: 1 } }}
        >
          <ShareIcon sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
        </IconButton>
      </AntdFlex>
      <AntdFlex
        gap={{ xs: 6, sm: 8, md: 10 }}
        align="center"
        justify="center"
        sx={{
          flexWrap: "wrap",
          fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
          color: "text.secondary",
        }}
      >
        <Typography sx={{ fontSize: "inherit" }}>
          {(post.comments || []).length} comments
        </Typography>
        <Box
          sx={{
            width: { xs: 3, sm: 4 },
            height: { xs: 3, sm: 4 },
            borderRadius: "50%",
            bgcolor: "rgba(255, 255, 255, 0.3)",
          }}
        />
        <Typography sx={{ fontSize: "inherit" }}>
          {(post.bookmarks || []).length} bookmarks
        </Typography>
        <Box
          sx={{
            width: { xs: 3, sm: 4 },
            height: { xs: 3, sm: 4 },
            borderRadius: "50%",
            bgcolor: "rgba(255, 255, 255, 0.3)",
          }}
        />
        <Typography sx={{ fontSize: "inherit" }}>
          {(post.likes || []).length} likes
        </Typography>
      </AntdFlex>
    </Box>
  );
};

export default Actions;


// // components/Actions.jsx
// import React, { useState, useEffect } from "react";
// import { useRecoilState, useRecoilValue } from "recoil";
// import userAtom from "../atoms/userAtom"; // Assuming path remains the same
// import postsAtom from "../atoms/postsAtom"; // Assuming path remains the same
// import useShowToast from "../hooks/useShowToast"; // Assuming path remains the same

// // MUI Imports
// import {
//   Box,
//   Button,
//   IconButton,
//   TextField,
//   Typography,
//   Skeleton,
//   useMediaQuery,
//   useTheme,
// } from "@mui/material";
// import {
//   Favorite as FavoriteIcon,
//   FavoriteBorder as FavoriteBorderIcon,
//   Comment as CommentIcon,
//   Repeat as RepeatIcon,
//   Share as ShareIcon,
//   Edit as EditIcon,
//   Delete as DeleteIcon,
// } from "@mui/icons-material";

// // Antd Imports
// import { Flex as AntdFlex } from "antd";

// // Framer Motion Imports
// import { motion } from "framer-motion";

// const Actions = ({ post, onCommentClick }) => {
//   const user = useRecoilValue(userAtom);
//   const [liked, setLiked] = useState(Array.isArray(post?.likes) ? post.likes.includes(user?._id) : false);
//   const [postsState, setPostsState] = useRecoilState(postsAtom);
//   const [isLiking, setIsLiking] = useState(false);
//   const [isReplying, setIsReplying] = useState(null);
//   const [isCommenting, setIsCommenting] = useState(false);
//   const [replyTexts, setReplyTexts] = useState({});
//   const [comment, setComment] = useState("");
//   const [editingCommentId, setEditingCommentId] = useState(null);
//   const [editedText, setEditedText] = useState("");
//   const [isOpen, setIsOpen] = useState(false);
//   const [skeletonLoading, setSkeletonLoading] = useState(true); // Skeleton loading state
//   const showToast = useShowToast();
//   const theme = useTheme();
//   const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm")); // MUI's responsive breakpoint (< 600px)

//   // Simulate skeleton loading
//   useEffect(() => {
//     const timer = setTimeout(() => setSkeletonLoading(false), 2000);
//     return () => clearTimeout(timer);
//   }, []);

//   // Like/Unlike Post
//   const handleLikeAndUnlike = async () => {
//     if (!user) return showToast("Error", "You must be logged in to like a post", "error");
//     if (isLiking) return;
//     setIsLiking(true);
//     try {
//       const res = await fetch(`/api/posts/like/${post._id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id
//             ? { ...p, likes: liked ? p.likes.filter((id) => id !== user._id) : [...p.likes, user._id] }
//             : p
//         ),
//       }));
//       setLiked(!liked);
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     } finally {
//       setIsLiking(false);
//     }
//   };

//   // Comment on Post
//   const handleComment = async () => {
//     if (!user) return showToast("Error", "You must be logged in to comment", "error");
//     if (isCommenting || !comment.trim()) return;
//     setIsCommenting(true);
//     try {
//       const res = await fetch(`/api/posts/post/${post._id}/comment`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text: comment }),
//       });
//       const data = await res.json();
//       if (data.error) {
//         showToast("Error", data.error, "error");
//         return;
//       }

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id ? { ...p, comments: [...(p.comments || []), data] } : p
//         ),
//       }));
//       showToast("Success", "Comment posted successfully", "success");
//       setComment("");
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     } finally {
//       setIsCommenting(false);
//     }
//   };

//   // Reply to Comment
//   const handleReplyToComment = async (commentId) => {
//     if (!user) return showToast("Error", "You must be logged in to reply", "error");
//     const replyText = replyTexts[commentId];
//     if (!replyText?.trim()) return;
//     try {
//       const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}/reply`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text: replyText }),
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id
//             ? {
//                 ...p,
//                 comments: p.comments.map((c) =>
//                   c._id === commentId ? { ...c, replies: [...(c.replies || []), data] } : c
//                 ),
//               }
//             : p
//         ),
//       }));
//       showToast("Success", "Reply to comment posted successfully", "success");
//       setReplyTexts((prev) => ({ ...prev, [commentId]: "" }));
//       setIsReplying(null);
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     }
//   };

//   // Like/Unlike Comment
//   const handleLikeComment = async (commentId) => {
//     if (!user) return showToast("Error", "You must be logged in to like a comment", "error");
//     try {
//       const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}/like`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id
//             ? {
//                 ...p,
//                 comments: p.comments.map((c) =>
//                   c._id === commentId ? { ...c, likes: data.likes } : c
//                 ),
//               }
//             : p
//         ),
//       }));
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     }
//   };

//   // Like/Unlike Reply
//   const handleLikeReply = async (commentId, replyId) => {
//     if (!user) return showToast("Error", "You must be logged in to like a reply", "error");
//     try {
//       const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}/reply/${replyId}/like`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id
//             ? {
//                 ...p,
//                 comments: p.comments.map((c) =>
//                   c._id === commentId
//                     ? {
//                         ...c,
//                         replies: c.replies.map((r) =>
//                           r._id === replyId ? { ...r, likes: data.likes } : r
//                         ),
//                       }
//                     : c
//                 ),
//               }
//             : p
//         ),
//       }));
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     }
//   };

//   // Edit Comment
//   const handleEditComment = async (commentId, newText) => {
//     if (!user) return showToast("Error", "You must be logged in to edit a comment", "error");
//     if (!newText.trim()) return showToast("Error", "Comment text cannot be empty", "error");

//     const comment = post.comments.find((c) => c._id === commentId);
//     if (!comment || (comment.userId !== user._id && user._id !== post.postedBy)) {
//       return showToast("Error", "You are not authorized to edit this comment", "error");
//     }

//     try {
//       const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text: newText }),
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id
//             ? {
//                 ...p,
//                 comments: p.comments.map((c) =>
//                   c._id === commentId ? { ...c, text: newText } : c
//                 ),
//               }
//             : p
//         ),
//       }));
//       showToast("Success", "Comment edited successfully", "success");
//       setEditingCommentId(null);
//       setEditedText("");
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     }
//   };

//   // Delete Comment
//   const handleDeleteComment = async (commentId) => {
//     if (!user) return showToast("Error", "You must be logged in to delete a comment", "error");

//     const comment = post.comments.find((c) => c._id === commentId);
//     if (!comment || (comment.userId !== user._id && user._id !== post.postedBy)) {
//       return showToast("Error", "You are not authorized to delete this comment", "error");
//     }

//     try {
//       const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}`, {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: prev.posts.map((p) =>
//           p._id === post._id
//             ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) }
//             : p
//         ),
//       }));
//       showToast("Success", "Comment deleted successfully", "success");
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     }
//   };

//   // Repost
//   const handleRepost = async () => {
//     if (!user) return showToast("Error", "You must be logged in to repost", "error");
//     try {
//       const res = await fetch(`/api/posts/repost/${post._id}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await res.json();
//       if (data.error) return showToast("Error", data.error, "error");

//       setPostsState((prev) => ({
//         ...prev,
//         posts: [data, ...prev.posts],
//       }));
//       showToast("Success", "Post reposted successfully", "success");
//     } catch (error) {
//       showToast("Error", error.message, "error");
//     }
//   };

//   // Share
//   const handleShare = () => {
//     if (!user) return showToast("Error", "You must be logged in to share", "error");
//     const shareUrl = `${window.location.origin}/${user.username}/post/${post._id}`;
//     navigator.clipboard.writeText(shareUrl);
//     showToast("Success", "Post URL copied to clipboard", "success");
//   };

//   return (
//     <Box sx={{ display: "flex", flexDirection: "column", bgcolor: "#1A202C", color: "white" }}>
//       {skeletonLoading ? (
//         <AntdFlex gap={16} sx={{ my: 2 }}>
//           <Skeleton variant="circular" width={24} height={24} />
//           <Skeleton variant="circular" width={24} height={24} />
//           <Skeleton variant="circular" width={24} height={24} />
//           <Skeleton variant="circular" width={24} height={24} />
//           <Skeleton variant="text" width={150} sx={{ mt: 2 }} />
//         </AntdFlex>
//       ) : (
//         <>
//           <AntdFlex gap={16} sx={{ my: 2 }} onClick={(e) => e.preventDefault()}>
//             <IconButton
//               component={motion.button}
//               whileHover={{ scale: 1.1 }}
//               whileTap={{ scale: 0.9 }}
//               onClick={handleLikeAndUnlike}
//               sx={{ color: liked ? "#ED4956" : "white" }}
//             >
//               {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
//             </IconButton>
//             <IconButton
//               component={motion.button}
//               whileHover={{ scale: 1.1 }}
//               whileTap={{ scale: 0.9 }}
//               onClick={isSmallScreen ? () => setIsOpen(!isOpen) : onCommentClick}
//               sx={{ color: "white" }}
//             >
//               <CommentIcon />
//             </IconButton>
//             <IconButton
//               component={motion.button}
//               whileHover={{ scale: 1.1 }}
//               whileTap={{ scale: 0.9 }}
//               onClick={handleRepost}
//               sx={{ color: "white" }}
//             >
//               <RepeatIcon />
//             </IconButton>
//             <IconButton
//               component={motion.button}
//               whileHover={{ scale: 1.1 }}
//               whileTap={{ scale: 0.9 }}
//               onClick={handleShare}
//               sx={{ color: "white" }}
//             >
//               <ShareIcon />
//             </IconButton>
//           </AntdFlex>

//           <AntdFlex gap={8} align="center">
//             <Typography sx={{ color: "gray.400", fontSize: "0.75rem" }}>
//               {(post.comments || []).length} comments
//             </Typography>
//             <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "gray.400" }} />
//             <Typography sx={{ color: "gray.400", fontSize: "0.75rem" }}>
//               {(post.replies || []).length} replies
//             </Typography>
//             <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "gray.400" }} />
//             <Typography sx={{ color: "gray.400", fontSize: "0.75rem" }}>
//               {(post.likes || []).length} likes
//             </Typography>
//           </AntdFlex>

//           {isSmallScreen && isOpen && (
//             <Box sx={{ mt: 2, p: 2, bgcolor: "gray.700", borderRadius: 4 }}>
//               <AntdFlex justify="space-between" align="center">
//                 <Typography sx={{ fontSize: "0.875rem", fontWeight: "bold" }}>
//                   Comments & Replies
//                 </Typography>
//                 <Button
//                   variant="outlined"
//                   size="small"
//                   onClick={() => setIsOpen(false)}
//                   sx={{ color: "white", borderColor: "gray.400" }}
//                 >
//                   Close
//                 </Button>
//               </AntdFlex>
//               <AntdFlex vertical gap={8} sx={{ mt: 2 }}>
//                 {(post.comments || []).map((c) => (
//                   <Box
//                     key={c._id}
//                     sx={{ bgcolor: "gray.800", p: 2, borderRadius: 4 }}
//                   >
//                     <AntdFlex justify="space-between" align="center">
//                       <Typography sx={{ fontSize: "0.875rem", fontWeight: "bold" }}>
//                         {c.username || "Unknown"}
//                       </Typography>
//                       {(c.userId === user?._id || user?._id === post.postedBy) && (
//                         <AntdFlex gap={4}>
//                           <IconButton
//                             component={motion.button}
//                             whileHover={{ scale: 1.1 }}
//                             whileTap={{ scale: 0.9 }}
//                             onClick={() => {
//                               setEditingCommentId(c._id);
//                               setEditedText(c.text);
//                             }}
//                             sx={{ color: "white" }}
//                           >
//                             <EditIcon fontSize="small" />
//                           </IconButton>
//                           <IconButton
//                             component={motion.button}
//                             whileHover={{ scale: 1.1 }}
//                             whileTap={{ scale: 0.9 }}
//                             onClick={() => handleDeleteComment(c._id)}
//                             sx={{ color: "white" }}
//                           >
//                             <DeleteIcon fontSize="small" />
//                           </IconButton>
//                         </AntdFlex>
//                       )}
//                     </AntdFlex>
//                     {editingCommentId === c._id ? (
//                       <TextField
//                         fullWidth
//                         value={editedText}
//                         onChange={(e) => setEditedText(e.target.value)}
//                         onBlur={() => handleEditComment(c._id, editedText)}
//                         variant="outlined"
//                         size="small"
//                         sx={{
//                           mt: 1,
//                           bgcolor: "gray.600",
//                           "& .MuiOutlinedInput-root": { color: "white" },
//                           "& .MuiOutlinedInput-notchedOutline": { borderColor: "gray" },
//                         }}
//                       />
//                     ) : (
//                       <Typography sx={{ fontSize: "0.875rem", mt: 1 }}>{c.text}</Typography>
//                     )}
//                     <AntdFlex gap={4} sx={{ mt: 1 }}>
//                       <IconButton
//                         component={motion.button}
//                         whileHover={{ scale: 1.1 }}
//                         whileTap={{ scale: 0.9 }}
//                         onClick={() => handleLikeComment(c._id)}
//                         sx={{ color: c.likes?.includes(user?._id) ? "#ED4956" : "gray" }}
//                       >
//                         <FavoriteIcon fontSize="small" />
//                       </IconButton>
//                       <Typography sx={{ fontSize: "0.75rem", color: "gray.400" }}>
//                         {(c.likes || []).length}
//                       </Typography>
//                       <Button
//                         variant="outlined"
//                         size="small"
//                         onClick={() => setIsReplying(isReplying === c._id ? null : c._id)}
//                         sx={{ color: "white", borderColor: "gray.400" }}
//                       >
//                         Reply
//                       </Button>
//                     </AntdFlex>
//                     {isReplying === c._id && (
//                       <Box sx={{ mt: 2 }}>
//                         <TextField
//                           fullWidth
//                           placeholder="Add a reply..."
//                           value={replyTexts[c._id] || ""}
//                           onChange={(e) =>
//                             setReplyTexts((prev) => ({ ...prev, [c._id]: e.target.value }))
//                           }
//                           variant="outlined"
//                           size="small"
//                           sx={{
//                             bgcolor: "gray.600",
//                             "& .MuiOutlinedInput-root": { color: "white" },
//                             "& .MuiOutlinedInput-notchedOutline": { borderColor: "gray" },
//                           }}
//                         />
//                         <Button
//                           variant="contained"
//                           size="small"
//                           onClick={() => handleReplyToComment(c._id)}
//                           disabled={!replyTexts[c._id]?.trim()}
//                           sx={{ mt: 1, bgcolor: "#1976D2" }}
//                         >
//                           Reply
//                         </Button>
//                       </Box>
//                     )}
//                     {(c.replies || []).map((r, idx) => (
//                       <AntdFlex key={idx} gap={8} sx={{ ml: 4, mt: 1 }}>
//                         <Typography sx={{ fontSize: "0.75rem", fontWeight: "bold" }}>
//                           {r.username || "Unknown"}
//                         </Typography>
//                         <Typography sx={{ fontSize: "0.75rem" }}>{r.text}</Typography>
//                         <IconButton
//                           component={motion.button}
//                           whileHover={{ scale: 1.1 }}
//                           whileTap={{ scale: 0.9 }}
//                           onClick={() => handleLikeReply(c._id, r._id)}
//                           sx={{ color: r.likes?.includes(user?._id) ? "#ED4956" : "gray" }}
//                         >
//                           <FavoriteIcon fontSize="small" />
//                         </IconButton>
//                         <Typography sx={{ fontSize: "0.75rem", color: "gray.400" }}>
//                           {(r.likes || []).length}
//                         </Typography>
//                       </AntdFlex>
//                     ))}
//                   </Box>
//                 ))}
//               </AntdFlex>
//               <Box sx={{ mt: 2 }}>
//                 <TextField
//                   fullWidth
//                   placeholder="Add a comment..."
//                   value={comment}
//                   onChange={(e) => setComment(e.target.value)}
//                   variant="outlined"
//                   size="small"
//                   sx={{
//                     bgcolor: "gray.600",
//                     "& .MuiOutlinedInput-root": { color: "white" },
//                     "& .MuiOutlinedInput-notchedOutline": { borderColor: "gray" },
//                   }}
//                 />
//                 <Button
//                   variant="contained"
//                   size="small"
//                   onClick={handleComment}
//                   disabled={!comment.trim() || isCommenting}
//                   sx={{ mt: 1, bgcolor: "#1976D2" }}
//                 >
//                   {isCommenting ? "Commenting..." : "Comment"}
//                 </Button>
//               </Box>
//             </Box>
//           )}
//         </>
//       )}
//     </Box>
//   );
// };

// export default Actions;