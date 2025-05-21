import User from "../models/userModel.js";
import { Post, Reply } from "../models/postModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import fs from "fs";

const ADMIN_USERNAME = "adminblog";
const ADMIN_PASSWORD = "Admin123";

const getUserProfile = async (req, res) => {
  try {
    const { query } = req.params;
    let user;

    if (mongoose.Types.ObjectId.isValid(query)) {
      user = await User.findById(query).select("-password");
    } else {
      user = await User.findOne({ username: query }).select("-password");
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      _id: user._id,
      username: user.username,
      profilePic: user.profilePic,
      name: user.name,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
      isFrozen: user.isFrozen,
      isVerified: user.isVerified,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getUserProfile: ", error.message);
  }
};

const getMultipleUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs must be a non-empty array" });
    }
    const users = await User.find({ _id: { $in: ids } }).select("username profilePic _id");
    if (users.length === 0) {
      return res.status(404).json({ error: "No users found for the provided IDs" });
    }
    res.status(200).json(users);
  } catch (err) {
    console.error("Error in getMultipleUsers:", err);
    res.status(500).json({ error: err.message });
  }
};



const getUserStats = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ postedBy: user._id, isBanned: false });
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((acc, post) => acc + (post.likes?.length || 0), 0);
    const totalComments = posts.reduce((acc, post) => acc + (post.comments?.length || 0), 0);

    const activityData = [
      { month: "Jan", likes: Math.floor(totalLikes / 4), posts: Math.floor(totalPosts / 4) },
      { month: "Feb", likes: Math.floor(totalLikes / 3), posts: Math.floor(totalPosts / 3) },
      { month: "Mar", likes: Math.floor(totalLikes / 2), posts: Math.floor(totalPosts / 2) },
      { month: "Apr", likes: totalLikes, posts: totalPosts },
    ];

    res.status(200).json({
      totalLikes,
      totalPosts,
      totalComments,
      activityData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getUserStats: ", error.message);
  }
};

const signupUser = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email && existingUser.username === username) {
        return res.status(400).json({ error: "Email and username already taken" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email already taken" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      username,
      password: hashedPassword,
    });
    await newUser.save();

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);

      res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        bio: newUser.bio,
        profilePic: newUser.profilePic,
        followers: newUser.followers,
        following: newUser.following,
        isAdmin: newUser.isAdmin,
        isBanned: newUser.isBanned,
        isFrozen: newUser.isFrozen,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in signupUser: ", err.message);
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

    if (!user || !isPasswordCorrect) return res.status(400).json({ error: "Invalid username or password" });
    if (user.isBanned) return res.status(403).json({ error: "Account is banned" });

    if (user.isFrozen) {
      user.isFrozen = false;
      await user.save();
    }

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profilePic: user.profilePic,
      followers: user.followers,
      following: user.following,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
      isFrozen: user.isFrozen,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in loginUser: ", error.message);
  }
};

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(400).json({ error: "Invalid admin credentials" });
    }

    let adminUser = await User.findOne({ username: ADMIN_USERNAME });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      adminUser = new User({
        name: "Admin Blog",
        username: ADMIN_USERNAME,
        email: "admin@NRBLOGclone.com",
        password: hashedPassword,
        isAdmin: true,
      });
      await adminUser.save();
    }

    generateTokenAndSetCookie(adminUser._id, res);

    res.status(200).json({
      _id: adminUser._id,
      name: adminUser.name,
      username: adminUser.username,
      isAdmin: adminUser.isAdmin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in adminLogin: ", error.message);
  }
};

const promoteToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await User.findById(req.user._id);

    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const userToPromote = await User.findById(id);
    if (!userToPromote) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userToPromote.isAdmin) {
      return res.status(400).json({ error: "User is already an admin" });
    }

    userToPromote.isAdmin = true;
    await userToPromote.save();

    res.status(200).json({ message: "User promoted to admin successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in promoteToAdmin: ", error.message);
  }
};

const logoutUser = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 1 });
    res.status(200).json({ message: "User logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in logoutUser: ", err.message);
  }
};


const followUnFollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === id) {
      return res.status(400).json({ error: "You cannot follow/unfollow yourself" });
    }

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userToFollow.isBanned) {
      return res.status(403).json({ error: "Cannot follow a banned user" });
    }

    userToFollow.followers = Array.isArray(userToFollow.followers) ? userToFollow.followers : [];
    currentUser.following = Array.isArray(currentUser.following) ? currentUser.following : [];

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter((userId) => userId.toString() !== id);
      userToFollow.followers = userToFollow.followers.filter((userId) => userId.toString() !== currentUserId.toString());
      await Promise.all([currentUser.save(), userToFollow.save()]);
      if (req.io) {
        const unfollowData = {
          unfollowedId: id,
          follower: {
            _id: currentUserId,
            username: currentUser.username,
            profilePic: currentUser.profilePic,
            name: currentUser.name,
          },
        };
        // Emit to the unfollowed user
        const unfollowedSocketId = req.io.getRecipientSocketId(id);
        if (unfollowedSocketId) {
          req.io.to(unfollowedSocketId).emit("userUnfollowed", unfollowData);
        }
        // Emit to the current user
        const currentUserSocketId = req.io.getRecipientSocketId(currentUserId.toString());
        if (currentUserSocketId) {
          req.io.to(currentUserSocketId).emit("userUnfollowed", unfollowData);
        }
        // Notify followers of the unfollowed user
        userToFollow.followers.forEach((followerId) => {
          const socketId = req.io.getRecipientSocketId(followerId.toString());
          if (socketId) {
            req.io.to(socketId).emit("userUnfollowed", unfollowData);
          }
        });
      }
      res.status(200).json({ message: "Unfollowed successfully" });
    } else {
      currentUser.following.push(id);
      userToFollow.followers.push(currentUserId);
      await Promise.all([currentUser.save(), userToFollow.save()]);
      if (req.io) {
        const followData = {
          followedId: id,
          follower: {
            _id: currentUserId,
            username: currentUser.username,
            profilePic: currentUser.profilePic,
            name: currentUser.name,
          },
        };
        // Emit to the followed user
        const followedSocketId = req.io.getRecipientSocketId(id);
        if (followedSocketId) {
          req.io.to(followedSocketId).emit("userFollowed", followData);
        }
        // Emit to the current user
        const currentUserSocketId = req.io.getRecipientSocketId(currentUserId.toString());
        if (currentUserSocketId) {
          req.io.to(currentUserSocketId).emit("userFollowed", followData);
        }
        // Notify followers of the followed user
        userToFollow.followers.forEach((followerId) => {
          const socketId = req.io.getRecipientSocketId(followerId.toString());
          if (socketId) {
            req.io.to(socketId).emit("userFollowed", followData);
          }
        });
      }
      res.status(200).json({ message: "Followed successfully" });
    }
  } catch (error) {
    console.error("Follow/Unfollow error:", error);
    res.status(500).json({ error: `Failed to ${isFollowing ? "unfollow" : "follow"} user: ${error.message}` });
  }
};




const updateUser = async (req, res) => {
  const { name, email, username, password, bio } = req.body;
  let profilePic;

  if (req.file) {
    try {
      const uploadedResponse = await cloudinary.uploader.upload(req.file.path);
      profilePic = uploadedResponse.secure_url;
      fs.unlinkSync(req.file.path);
    } catch (error) {
      return res.status(500).json({ error: "Failed to upload image to Cloudinary" });
    }
  }

  const userId = req.user._id;
  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({ error: "Email already taken" });
      }
    }
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username, _id: { $ne: userId } });
      if (usernameExists) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
    }

    if (profilePic && user.profilePic) {
      await cloudinary.uploader.destroy(user.profilePic.split("/").pop().split(".")[0]);
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.profilePic = profilePic || user.profilePic;

    user = await user.save();

    await Post.updateMany(
      { "comments.userId": userId },
      {
        $set: {
          "comments.$[comment].username": user.username,
          "comments.$[comment].userProfilePic": user.profilePic,
        },
      },
      { arrayFilters: [{ "comment.userId": userId }] }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json(userResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("Error in updateUser: ", err.message);
  }
};

const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const usersFollowedByYou = await User.findById(userId).select("following");

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
          isBanned: false,
        },
      },
      {
        $sample: { size: 10 },
      },
    ]);
    const filteredUsers = users.filter((user) => !usersFollowedByYou.following.includes(user._id.toString()));
    const suggestedUsers = filteredUsers.slice(0, 4);

    suggestedUsers.forEach((user) => delete user.password);

    res.status(200).json(suggestedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getSuggestedUsers: ", error.message);
  }
};

const freezeAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    user.isFrozen = true;
    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in freezeAccount: ", error.message);
  }
};

const banUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isBanned = true;
    await user.save();

    res.status(200).json({ message: "User banned successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in banUser: ", error.message);
  }
};

const unbanUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.isBanned = false;
    await user.save();

    res.status(200).json({ message: "User unbanned successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in unbanUser: ", error.message);
  }
};

const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ postedBy: userId });
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((acc, post) => acc + post.likes.length, 0);
    const totalComments = posts.reduce((acc, post) => acc + post.comments.length, 0);
    const totalInteractions = totalLikes + totalComments;

    res.status(200).json({
      totalPosts,
      totalLikes,
      totalComments,
      totalInteractions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getUserDashboard: ", error.message);
  }
};

const getAdminRealtimeDashboard = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Total users
    const totalUsers = await User.countDocuments({ isBanned: false });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Total posts
    const totalPosts = await Post.countDocuments({ isBanned: false });
    const bannedPosts = await Post.countDocuments({ isBanned: true });

    // User activity (e.g., posts per user)
    const userActivity = await Post.aggregate([
      { $match: { isBanned: false } },
      { $group: { _id: "$postedBy", postCount: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { username: "$user.username", postCount: 1 } },
      { $sort: { postCount: -1 } },
      { $limit: 10 }, // Top 10 active users
    ]);

    // Post trends (e.g., posts per day over last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postTrends = await Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, isBanned: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Pie chart data: User status distribution
    const userStatusPie = {
      labels: ["Active Users", "Banned Users"],
      data: [totalUsers, bannedUsers],
    };

    // Pie chart data: Post status distribution
    const postStatusPie = {
      labels: ["Active Posts", "Banned Posts"],
      data: [totalPosts, bannedPosts],
    };

    // Bar chart data: Top active users
    const userActivityBar = {
      labels: userActivity.map((u) => u.username),
      data: userActivity.map((u) => u.postCount),
    };

    // Bar chart data: Post trends
    const postTrendsBar = {
      labels: postTrends.map((t) => t._id),
      data: postTrends.map((t) => t.count),
    };

    // Response with all dashboard data
    const dashboardData = {
      totalUsers,
      bannedUsers,
      totalPosts,
      bannedPosts,
      userStatusPie,
      postStatusPie,
      userActivityBar,
      postTrendsBar,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getAdminRealtimeDashboard: ", error.message);
  }
};
const getAllUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    const users = await User.find({}).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ error: error.message });
  }
};

export {
  signupUser,
  loginUser,
  adminLogin,
  logoutUser,
  followUnFollowUser,
  updateUser,
  promoteToAdmin,
  getUserProfile,
  getSuggestedUsers,
  freezeAccount,
  banUser,
  unbanUser,
  getUserDashboard,
  getUserStats,
  getAdminRealtimeDashboard,
  getMultipleUsers,
 
  getAllUsers,
};