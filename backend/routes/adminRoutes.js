import express from "express";
import { banPost, unbanPost, getAllPosts } from "../controllers/postController.js";
import { banUser, unbanUser, promoteToAdmin } from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const restrictToAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

router.get("/posts", protectRoute, restrictToAdmin, getAllPosts);
router.put("/posts/:id/ban", protectRoute, restrictToAdmin, adminActionLimiter, banPost);
router.put("/posts/:id/unban", protectRoute, restrictToAdmin, adminActionLimiter, unbanPost);

router.put("/users/:id/ban", protectRoute, restrictToAdmin, adminActionLimiter, banUser);
router.put("/users/:id/unban", protectRoute, restrictToAdmin, adminActionLimiter, unbanUser);
router.put("/users/:id/promote", protectRoute, restrictToAdmin, adminActionLimiter, promoteToAdmin);

export default router;