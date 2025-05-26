import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { Post } from "../models/postModel.js";
import User from "../models/userModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use((req, res, next) => {
  req.io = io;
  req.io.getRecipientSocketId = getRecipientSocketId;
  next();
});

const userSocketMap = {};
const typingUsers = new Map();

export const getRecipientSocketId = (recipientId) => {
  return userSocketMap[recipientId];
};

io.use((socket, next) => {
  const token = socket.handshake.query.token;
  const userId = socket.handshake.query.userId;

  if (!token || !userId) {
    return next(new Error("Authentication error: Missing token or userId"));
  }

  if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
    return next(new Error("Authentication error: Invalid userId format"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userId !== userId) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.userId = userId;
    next();
  } catch (error) {
    return next(new Error(`Authentication error: ${error.message}`));
  }
});

io.on("connection", (socket) => {
  if (socket.userId && socket.userId !== "undefined") {
    userSocketMap[socket.userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  } else {
    socket.disconnect(true);
    return;
  }

  socket.on("joinPostRoom", (room) => {
    if (!room || !room.startsWith("post:")) return;
    socket.join(room);
  });

  socket.on("leavePostRoom", (room) => {
    if (!room || !room.startsWith("post:")) return;
    socket.leave(room);
  });

  socket.on("ping", () => {
    socket.emit("pong");
  });

  socket.on("syncPostState", async ({ postId }) => {
    try {
      if (!postId) {
        socket.emit("error", { message: "Invalid post ID", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .lean();
      if (!populatedPost) {
        socket.emit("error", { message: "Post not found", timestamp: Date.now() });
        return;
      }
      socket.emit("syncPostState", { postId, post: populatedPost, timestamp: Date.now() });
    } catch (error) {
      socket.emit("error", { message: `Failed to sync post state: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("newPost", async (post) => {
    try {
      if (!post?._id) {
        socket.emit("error", { message: "Invalid post ID", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(post._id)
        .populate("postedBy", "username profilePic")
        .lean();
      if (!populatedPost) {
        socket.emit("error", { message: "Post not found", timestamp: Date.now() });
        return;
      }
      const user = await User.findById(post.postedBy).select("following").lean();
      if (!user) {
        socket.emit("error", { message: "User not found", timestamp: Date.now() });
        return;
      }
      const followerIds = [...(user.following || []), post.postedBy.toString()];
      followerIds.forEach((followerId) => {
        const socketId = getRecipientSocketId(followerId);
        if (socketId) io.to(socketId).emit("newPost", populatedPost);
      });
      io.emit("newFeedPost", populatedPost, { timestamp: Date.now() });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast new post: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("newComment", async ({ postId, comment }) => {
    try {
      if (!postId || !comment?._id) {
        socket.emit("error", { message: "Invalid post or comment ID", timestamp: Date.now() });
        return;
      }
      const populatedComment = await Post.findOne(
        { _id: postId, "comments._id": comment._id },
        { "comments.$": 1 }
      )
        .populate("comments.userId", "username profilePic")
        .lean();
      if (!populatedComment) {
        socket.emit("error", { message: "Comment not found", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .lean();
      io.to(`post:${postId}`).emit("newComment", {
        postId,
        comment: populatedComment.comments[0],
        post: populatedPost,
        timestamp: Date.now(),
      });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast new comment: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("likeUnlikePost", async ({ postId, userId, likes }) => {
    try {
      if (!postId || !userId) {
        socket.emit("error", { message: "Invalid post or user ID", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .lean();
      if (!populatedPost) {
        socket.emit("error", { message: "Post not found", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("likeUnlikePost", {
        postId,
        userId,
        likes,
        post: populatedPost,
        reactionType: "thumbs-up",
        timestamp: Date.now(),
      });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast like/unlike: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("likeUnlikeComment", async ({ postId, commentId, userId, likes }) => {
    try {
      if (!postId || !commentId || !userId) {
        socket.emit("error", { message: "Invalid post, comment, or user ID", timestamp: Date.now() });
        return;
      }
      const populatedComment = await Post.findOne(
        { _id: postId, "comments._id": commentId },
        { "comments.$": 1 }
      )
        .populate("comments.userId", "username profilePic")
        .lean();
      if (!populatedComment) {
        socket.emit("error", { message: "Comment not found", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .lean();
      io.to(`post:${postId}`).emit("likeUnlikeComment", {
        postId,
        commentId,
        userId,
        likes,
        comment: populatedComment.comments[0],
        post: populatedPost,
        timestamp: Date.now(),
      });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast comment like/unlike: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("editComment", async ({ postId, commentId, comment }) => {
    try {
      if (!postId || !commentId || !comment?._id) {
        socket.emit("error", { message: "Invalid post or comment ID", timestamp: Date.now() });
        return;
      }
      const populatedComment = await Post.findOne(
        { _id: postId, "comments._id": commentId },
        { "comments.$": 1 }
      )
        .populate("comments.userId", "username profilePic")
        .lean();
      if (!populatedComment) {
        socket.emit("error", { message: "Comment not found", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .lean();
      io.to(`post:${postId}`).emit("editComment", {
        postId,
        commentId,
        comment: populatedComment.comments[0],
        post: populatedPost,
        timestamp: Date.now(),
      });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast edit comment: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("deleteComment", async ({ postId, commentId }) => {
    try {
      if (!postId || !commentId) {
        socket.emit("error", { message: "Invalid post or comment ID", timestamp: Date.now() });
        return;
      }
      const populatedPost = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .lean();
      io.to(`post:${postId}`).emit("deleteComment", { postId, commentId, post: populatedPost, timestamp: Date.now() });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast delete comment: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("postDeleted", async ({ postId, userId }) => {
    try {
      if (!postId || !userId) {
        socket.emit("error", { message: "Invalid post or user ID", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("postDeleted", { postId, userId, timestamp: Date.now() });
      io.emit("postDeletedFromFeed", { postId, timestamp: Date.now() });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast post deleted: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("newMessage", async (message) => {
    try {
      if (!message?.recipientId || !message?.sender?._id || !message?.conversationId) {
        socket.emit("error", { message: "Invalid message data", timestamp: Date.now() });
        return;
      }
      const recipientSocketId = getRecipientSocketId(message.recipientId);
      const senderSocketId = getRecipientSocketId(message.sender._id);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newMessage", { ...message, timestamp: Date.now() });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", { ...message, timestamp: Date.now() });
      }
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast new message: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("messageDelivered", async ({ messageId, conversationId, recipientId }) => {
    try {
      if (!messageId || !conversationId || !recipientId) {
        socket.emit("error", { message: "Invalid message delivered data", timestamp: Date.now() });
        return;
      }
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      ).lean();
      if (!updatedMessage) {
        socket.emit("error", { message: "Message not found", timestamp: Date.now() });
        return;
      }
      const senderSocketId = getRecipientSocketId(updatedMessage.sender._id);
      const recipientSocketId = getRecipientSocketId(recipientId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDelivered", { messageId, conversationId, timestamp: Date.now() });
      }
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("messageDelivered", { messageId, conversationId, timestamp: Date.now() });
      }
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast message delivered: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
    try {
      if (!conversationId || !userId) {
        socket.emit("error", { message: "Invalid mark messages data", timestamp: Date.now() });
        return;
      }
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found", timestamp: Date.now() });
        return;
      }

      const messages = await Message.find({
        conversationId,
        seen: false,
        sender: { $ne: userId },
      }).lean();

      if (!messages.length) return;

      const seenMessageIds = messages.map((msg) => msg._id.toString());
      await Message.updateMany(
        { conversationId, seen: false, sender: { $ne: userId } },
        { $set: { seen: true, status: "seen" } }
      );

      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { "lastMessage.seen": true } }
      );

      const participantIds = conversation.participants.map((p) => p.toString());
      participantIds.forEach((participantId) => {
        const socketId = getRecipientSocketId(participantId);
        if (socketId) {
          io.to(socketId).emit("messagesSeen", {
            conversationId,
            seenMessages: seenMessageIds,
            timestamp: Date.now(),
          });
        }
      });
    } catch (error) {
      socket.emit("error", { message: `Failed to broadcast messages seen: ${error.message}`, timestamp: Date.now() });
    }
  });

  socket.on("typing", ({ conversationId, userId }) => {
    if (!conversationId || !userId) {
      socket.emit("error", { message: "Invalid typing data", timestamp: Date.now() });
      return;
    }
    typingUsers.set(`${conversationId}:${userId}`, true);
    const recipientSocketId = getRecipientSocketId(userId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("typing", { conversationId, userId, timestamp: Date.now() });
    }
  });

  socket.on("stopTyping", ({ conversationId, userId }) => {
    if (!conversationId || !userId) {
      socket.emit("error", { message: "Invalid stop typing data", timestamp: Date.now() });
      return;
    }
    typingUsers.delete(`${conversationId}:${userId}`);
    const recipientSocketId = getRecipientSocketId(userId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("stopTyping", { conversationId, userId, timestamp: Date.now() });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  socket.on("error", (error) => {
    socket.emit("error", { message: `Socket error: ${error.message}`, timestamp: Date.now() });
  });
});

export { io, server, app };


// import { Server } from "socket.io";
// import http from "http";
// import express from "express";
// import Message from "../models/messageModel.js";
// import Conversation from "../models/conversationModel.js";

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
// 	cors: {
// 		origin: "http://localhost:3000",
// 		methods: ["GET", "POST"],
// 	},
// });

// export const getRecipientSocketId = (recipientId) => {
// 	return userSocketMap[recipientId];
// };

// const userSocketMap = {}; // userId: socketId

// io.on("connection", (socket) => {
// 	console.log("user connected", socket.id);
// 	const userId = socket.handshake.query.userId;

// 	if (userId != "undefined") userSocketMap[userId] = socket.id;
// 	io.emit("getOnlineUsers", Object.keys(userSocketMap));

// 	socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
// 		try {
// 			await Message.updateMany({ conversationId: conversationId, seen: false }, { $set: { seen: true } });
// 			await Conversation.updateOne({ _id: conversationId }, { $set: { "lastMessage.seen": true } });
// 			io.to(userSocketMap[userId]).emit("messagesSeen", { conversationId });
// 		} catch (error) {
// 			console.log(error);
// 		}
// 	});

// 	socket.on("disconnect", () => {
// 		console.log("user disconnected");
// 		delete userSocketMap[userId];
// 		io.emit("getOnlineUsers", Object.keys(userSocketMap));
// 	});
// });

// export { io, server, app };
