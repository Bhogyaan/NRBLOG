import express from "express";
import { isValidObjectId } from "mongoose";
import { banPost, unbanPost, getAllPosts } from "../controllers/postController.js";
import { banUser, unbanUser, promoteToAdmin } from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const restrictToAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ error: `Invalid ${paramName} ID` });
  }
  next();
};

const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many admin actions from this IP, please try again later.",
});

router.get("/posts", protectRoute, restrictToAdmin, getAllPosts);
router.put("/posts/:id/ban", protectRoute, restrictToAdmin, validateObjectId("id"), adminActionLimiter, banPost);
router.put("/posts/:id/unban", protectRoute, restrictToAdmin, validateObjectId("id"), adminActionLimiter, unbanPost);

router.put("/users/:id/ban", protectRoute, restrictToAdmin, validateObjectId("id"), adminActionLimiter, banUser);
router.put("/users/:id/unban", protectRoute, restrictToAdmin, validateObjectId("id"), adminActionLimiter, unbanUser);
router.put("/users/:id/promote", protectRoute, restrictToAdmin, validateObjectId("id"), adminActionLimiter, promoteToAdmin);

export default router;