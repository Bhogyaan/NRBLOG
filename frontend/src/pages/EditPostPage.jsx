import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import postsAtom from "../atoms/postsAtom";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import { Box, Button, TextField, Typography, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material"; // Added Close icon import
import { motion } from "framer-motion";

const EditPostPage = () => {
  const { id } = useParams();
  const [posts, setPosts] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const showToast = useShowToast();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [loading, setLoading] = useState(true);

  const currentPost = posts.posts.find((p) => p._id === id);

  useEffect(() => {
    if (!currentPost) {
      const fetchPost = async () => {
        try {
          const res = await fetch(`/api/posts/${id}`);
          const data = await res.json();
          if (data.error) {
            showToast("Error", data.error, "error");
            navigate("/");
            return;
          }
          setPosts((prev) => ({ ...prev, posts: [data, ...prev.posts] }));
          setText(data.text);
          setMedia(data.media || "");
          setMediaType(data.mediaType || "");
        } catch (error) {
          showToast("Error", error.message, "error");
        } finally {
          setLoading(false);
        }
      };
      fetchPost();
    } else {
      setText(currentPost.text);
      setMedia(currentPost.media || "");
      setMediaType(currentPost.mediaType || "");
      setLoading(false);
    }
  }, [id, currentPost, setPosts, showToast, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return showToast("Error", "Post text cannot be empty", "error");

    try {
      console.log("Submitting edit - Post ID:", id, "Text:", text);
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, media, mediaType }),
      });
      const data = await res.json();
      console.log("Edit post response:", data, "Status:", res.status);
      if (data.error) return showToast("Error", data.error, "error");

      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === id ? data : p)),
      }));
      showToast("Success", "Post updated successfully", "success");
      navigate(`/${currentUser.username}`);
    } catch (error) {
      console.error("Error editing post:", error);
      showToast("Error", error.message, "error");
    }
  };

  const handleClose = () => {
    navigate(`/${currentUser.username}`); // Navigate back to user's profile
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (!currentPost && !loading) return <Typography>Post not found</Typography>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ backgroundColor: "#1A202C", minHeight: "100vh", padding: "20px" }}
    >
      <Box sx={{ maxWidth: "600px", mx: "auto", color: "#e0e0e0", position: "relative" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">
            Edit Post
          </Typography>
          <IconButton
            onClick={handleClose}
            sx={{ color: "#e0e0e0" }}
            component={motion.button}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Close />
          </IconButton>
        </Box>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Post Text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            variant="outlined"
            multiline
            rows={4}
            sx={{ mb: 2, bgcolor: "#3d3d3d", input: { color: "#e0e0e0" } }}
          />
          <TextField
            fullWidth
            label="Media URL (Cannot be changed)"
            value={media}
            disabled
            variant="outlined"
            sx={{ mb: 1, bgcolor: "#3d3d3d", input: { color: "#e0e0e0" } }}
          />
          <Typography variant="caption" color="gray" sx={{ mb: 2, display: "block" }}>
            Note: Images and media cannot be re-uploaded. Edit the text above as needed.
          </Typography>
          <TextField
            fullWidth
            label="Media Type (Cannot be changed)"
            value={mediaType}
            disabled
            variant="outlined"
            sx={{ mb: 2, bgcolor: "#3d3d3d", input: { color: "#e0e0e0" } }}
          />
          <Button type="submit" variant="contained" sx={{ bgcolor: "#1976D2" }}>
            Save Changes
          </Button>
        </form>
      </Box>
    </motion.div>
  );
};

export default EditPostPage;