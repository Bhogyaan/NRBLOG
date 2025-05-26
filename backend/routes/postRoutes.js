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
  likeUnlikeComment,
  banPost,
  unbanPost,
  getFeedPosts,
  getUserPosts,
  getStories,
  editPost,
  editComment,
  deleteComment,
  getBookmarks,
  bookmarkUnbookmarkPost,
  getSuggestedPosts,
  getPaginatedComments,
} from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }
  next();
};

router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

router.get("/all", protectRoute, getAllPosts);
router.get("/feed", protectRoute, getFeedPosts);
router.get("/stories", protectRoute, getStories);
router.get("/user/:username", getUserPosts);
router.get("/:id", protectRoute, validateObjectId("id"), getPost);
router.get("/bookmarks/:username", protectRoute, getBookmarks);
router.get("/suggested", protectRoute, getSuggestedPosts);
router.get("/post/:postId/comments", protectRoute, validateObjectId("postId"), getPaginatedComments);

router.post("/create", protectRoute, upload.single("media"), createPost);
router.post("/story", protectRoute, upload.single("media"), createStory);
router.post(
  "/post/:postId/comment",
  protectRoute,
  validateObjectId("postId"),
  commentLimiter,
  commentOnPost
);

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
  "/post/:postId/comment/:commentId",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  editComment
);
router.put("/ban/:id", protectRoute, validateObjectId("id"), banPost);
router.put("/unban/:id", protectRoute, validateObjectId("id"), unbanPost);

router.delete("/:id", protectRoute, validateObjectId("id"), deletePost);
router.delete(
  "/post/:postId/comment/:commentId",
  protectRoute,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  deleteComment
);

export default router;