import express from "express";
import multer from "multer";
import { isValidObjectId } from "mongoose";
import {
  getAllPosts,
  createPost,
  createStory,
  getPost,
  deletePost,
  likeUnlikePost,
  commentOnPost,
  addReply,
  likeUnlikeComment,
  likeUnlikeReply,
  banPost,
  unbanPost,
  getFeedPosts,
  getUserPosts,
  getStories,
  editPost,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  getBookmarks,
  bookmarkUnbookmarkPost,
  getSuggestedPosts,
  getPaginatedComments,
} from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Middleware to validate MongoDB ObjectIds
const validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }
  next();
};

// Apply Content-Type header
router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Rate limiter for comments and replies
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 comments/replies per IP
});

// GET Routes
router.get("/all", protectRoute, getAllPosts);
router.get("/feed", protectRoute, getFeedPosts);
router.get("/stories", protectRoute, getStories);
router.get("/user/:username", getUserPosts);
router.get("/:id", protectRoute, validateObjectId("id"), getPost);
router.get("/bookmarks/:username", protectRoute, getBookmarks);
router.get("/suggested", protectRoute, getSuggestedPosts);
router.get("/post/:postId/comments", protectRoute, validateObjectId("postId"), getPaginatedComments);

// POST Routes
router.post("/create", protectRoute, upload.single("media"), createPost);
router.post("/story", protectRoute, upload.single("media"), createStory);
router.post(
  "/post/:postId/comment",
  protectRoute,
  validateObjectId("postId"),
  commentLimiter,
  commentOnPost
);
router.post(
  "/post/:postId/comment/:commentId/reply",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  commentLimiter,
  addReply
);

// PUT Routes
router.put("/like/:id", protectRoute, validateObjectId("id"), likeUnlikePost);
router.put("/bookmark/:id", protectRoute, validateObjectId("id"), bookmarkUnbookmarkPost);
router.put("/:id", protectRoute, validateObjectId("id"), editPost);
router.put(
  "/post/:postId/comment/:commentId/like",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  likeUnlikeComment
);
router.put(
  "/post/:postId/comment/:commentId/reply/:replyId/like",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  validateObjectId("replyId"),
  likeUnlikeReply
);
router.put("/ban/:id", protectRoute, validateObjectId("id"), banPost);
router.put("/unban/:id", protectRoute, validateObjectId("id"), unbanPost);
router.put(
  "/post/:postId/comment/:commentId",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  editComment
);
router.put(
  "/post/:postId/comment/:commentId/reply/:replyId",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  validateObjectId("replyId"),
  editReply
);

// DELETE Routes
router.delete("/:id", protectRoute, validateObjectId("id"), deletePost);
router.delete(
  "/post/:postId/comment/:commentId",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  deleteComment
);
router.delete(
  "/post/:postId/comment/:commentId/reply/:replyId",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  validateObjectId("replyId"),
  deleteReply
);

export default router;