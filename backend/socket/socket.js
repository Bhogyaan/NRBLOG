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
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userId !== userId) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.userId = userId;
    next();
  } catch (error) {
    console.error("Socket auth error:", error.message);
    return next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "User ID:", socket.userId);

  if (socket.userId && socket.userId !== "undefined") {
    userSocketMap[socket.userId] = socket.id;
    console.log("Updated userSocketMap:", userSocketMap);
  } else {
    console.warn("Invalid userId on connection:", socket.userId);
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinPostRoom", (room) => {
    if (!room || !room.startsWith("post:")) return;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on("leavePostRoom", (room) => {
    if (!room || !room.startsWith("post:")) return;
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
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
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!populatedPost) {
        socket.emit("error", { message: "Post not found", timestamp: Date.now() });
        return;
      }
      socket.emit("syncPostState", { postId, post: populatedPost, timestamp: Date.now() });
    } catch (error) {
      console.error("Error syncing post state:", error.message);
      socket.emit("error", { message: "Failed to sync post state", timestamp: Date.now() });
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
      console.error("Error broadcasting new post:", error.message);
      socket.emit("error", { message: "Failed to broadcast new post", timestamp: Date.now() });
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
      io.to(`post:${postId}`).emit("newComment", {
        postId,
        comment: newComment,
        post: populatedPost,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error broadcasting new comment:", error.message);
      socket.emit("error", { message: "Failed to broadcast new comment", timestamp: Date.now() });
    }
  });

  socket.on("newReply", async ({ postId, commentId, reply }) => {
    try {
      if (!postId || !commentId || !reply?._id) {
        socket.emit("error", { message: "Invalid post, comment, or reply ID", timestamp: Date.now() });
        return;
      }
      const populatedReply = await Post.findOne(
        { _id: postId, "comments._id": commentId },
        { "comments.$": 1 }
      )
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      const replyData = populatedReply?.comments[0]?.replies.find(
        (r) => r._id.toString() === reply._id
      );
      if (!replyData) {
        socket.emit("error", { message: "Reply not found", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("newReply", {
        postId,
        commentId: parentCommentId,
        reply: populatedReply,
        post: populatedPost,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error broadcasting new reply:", error.message);
      socket.emit("error", { message: "Failed to broadcast new reply", timestamp: Date.now() });
    }
  });

  socket.on("likeUnlikePost", async ({ postId, userId, likes }) => {
    try {
      if (!postId || !userId) {
        socket.emit("error", { message: "Invalid post or user ID", timestamp: Date.now() });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .lean();
      if (!post) {
        socket.emit("error", { message: "Post not found", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("likeUnlikeComment", {
        postId,
        commentId,
        userId,
        likes: comment.likes,
        comment: populatedComment.comments[0],
        post: populatedPost,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error broadcasting like/unlike:", error.message);
      socket.emit("error", { message: "Failed to broadcast like/unlike", timestamp: Date.now() });
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
      io.to(`post:${postId}`).emit("likeUnlikeComment", {
        postId,
        commentId,
        userId,
        likes,
        comment: populatedComment.comments[0],
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error broadcasting comment like/unlike:", error.message);
      socket.emit("error", { message: "Failed to broadcast comment like/unlike", timestamp: Date.now() });
    }
  });

  socket.on("likeUnlikeReply", async ({ postId, commentId, replyId, userId, likes }) => {
    try {
      if (!postId || !commentId || !replyId || !userId) {
        socket.emit("error", { message: "Invalid post, comment, reply, or user ID", timestamp: Date.now() });
        return;
      }
      const populatedReply = await Post.findOne(
        { _id: postId, "comments._id": commentId },
        { "comments.$": 1 }
      )
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      const replyData = populatedReply?.comments[0]?.replies.find(
        (r) => r._id.toString() === replyId
      );
      if (!replyData) {
        socket.emit("error", { message: "Reply not found", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("likeUnlikeReply", {
        postId,
        commentId,
        replyId,
        userId,
        likes,
        reply: replyData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error broadcasting reply like/unlike:", error.message);
      socket.emit("error", { message: "Failed to broadcast reply like/unlike", timestamp: Date.now() });
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
      io.to(`post:${postId}`).emit("editComment", {
        postId,
        commentId,
        comment: populatedComment.comments[0],
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error broadcasting edit comment:", error.message);
      socket.emit("error", { message: "Failed to broadcast edit comment", timestamp: Date.now() });
    }
  });

  socket.on("editReply", async ({ postId, commentId, replyId, reply }) => {
    try {
      if (!postId || !commentId || !replyId || !reply?._id) {
        socket.emit("error", { message: "Invalid post, comment, or reply ID", timestamp: Date.now() });
        return;
      }
      const populatedReply = await Post.findOne(
        { _id: postId, "comments._id": commentId },
        { "comments.$": 1 }
      )
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      const replyData = populatedReply?.comments[0]?.replies.find(
        (r) => r._id.toString() === replyId
      );
      if (!replyData) {
        socket.emit("error", { message: "Reply not found", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("editReply", {
        postId,
        commentId,
        replyId,
        reply: replyData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error broadcasting edit reply:", error.message);
      socket.emit("error", { message: "Failed to broadcast edit reply", timestamp: Date.now() });
    }
  });

  socket.on("deleteComment", async ({ postId, commentId }) => {
    try {
      if (!postId || !commentId) {
        socket.emit("error", { message: "Invalid post or comment ID", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("deleteComment", { postId, commentId, timestamp: Date.now() });
    } catch (error) {
      console.error("Error broadcasting delete comment:", error.message);
      socket.emit("error", { message: "Failed to broadcast delete comment", timestamp: Date.now() });
    }
  });

  socket.on("deleteReply", async ({ postId, commentId, replyId }) => {
    try {
      if (!postId || !commentId || !replyId) {
        socket.emit("error", { message: "Invalid post, comment, or reply ID", timestamp: Date.now() });
        return;
      }
      io.to(`post:${postId}`).emit("deleteReply", { postId, commentId, replyId, timestamp: Date.now() });
    } catch (error) {
      console.error("Error broadcasting delete reply:", error.message);
      socket.emit("error", { message: "Failed to broadcast delete reply", timestamp: Date.now() });
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
      console.error("Error broadcasting post deleted:", error.message);
      socket.emit("error", { message: "Failed to broadcast post deleted", timestamp: Date.now() });
    }
  });

  socket.on("newMessage", async (message) => {
    try {
      if (!message?.recipientId || !message?.sender?._id || !message?.conversationId) {
        socket.emit("error", { message: "Invalid message data", timestamp: Date.now() });
        return;
      }
      console.log("Broadcasting newMessage:", message);
      const recipientSocketId = getRecipientSocketId(message.recipientId);
      const senderSocketId = getRecipientSocketId(message.sender._id);
      if (recipientSocketId) {
        console.log(`Emitting to recipient: ${recipientSocketId}`);
        io.to(recipientSocketId).emit("newMessage", { ...message, timestamp: Date.now() });
      }
      if (senderSocketId) {
        console.log(`Emitting to sender: ${senderSocketId}`);
        io.to(senderSocketId).emit("newMessage", { ...message, timestamp: Date.now() });
      }
    } catch (error) {
      console.error("Error broadcasting new message:", error.message);
      socket.emit("error", { message: "Failed to broadcast new message", timestamp: Date.now() });
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
      console.log("Broadcasting messageDelivered:", { messageId, conversationId });
      const senderSocketId = getRecipientSocketId(updatedMessage.sender._id);
      const recipientSocketId = getRecipientSocketId(recipientId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDelivered", { messageId, conversationId, timestamp: Date.now() });
      }
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("messageDelivered", { messageId, conversationId, timestamp: Date.now() });
      }
    } catch (error) {
      console.error("Error broadcasting message delivered:", error.message);
      socket.emit("error", { message: "Failed to broadcast message delivered", timestamp: Date.now() });
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

      console.log("Broadcasting messagesSeen:", { conversationId, seenMessageIds });
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
      console.error("Error marking messages as seen:", error.message);
      socket.emit("error", { message: "Failed to mark messages as seen", timestamp: Date.now() });
    }
  });

  socket.on("typing", async ({ conversationId }) => {
    try {
      if (!conversationId || !socket.userId) {
        socket.emit("error", { message: "Invalid typing data", timestamp: Date.now() });
        return;
      }
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found", timestamp: Date.now() });
        return;
      }

      const recipientIds = conversation.participants
        .filter((p) => p.toString() !== socket.userId)
        .map((p) => p.toString());

      let typingTimeout;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(async () => {
        if (!typingUsers.has(conversationId)) typingUsers.set(conversationId, new Set());
        const conversationTyping = typingUsers.get(conversationId);
        if (!conversationTyping.has(socket.userId)) {
          conversationTyping.add(socket.userId);
          console.log("Broadcasting typing:", { conversationId, userId: socket.userId });
          recipientIds.forEach((recipientId) => {
            const recipientSocketId = getRecipientSocketId(recipientId);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit("typing", {
                conversationId,
                userId: socket.userId,
                timestamp: Date.now(),
              });
            }
          });
        }
      }, 300);
    } catch (error) {
      console.error("Error broadcasting typing:", error.message);
      socket.emit("error", { message: "Failed to broadcast typing", timestamp: Date.now() });
    }
  });

  socket.on("stopTyping", async ({ conversationId }) => {
    try {
      if (!conversationId || !socket.userId) {
        socket.emit("error", { message: "Invalid stop typing data", timestamp: Date.now() });
        return;
      }
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        socket.emit("error", { message: "Conversation not found", timestamp: Date.now() });
        return;
      }

      const recipientIds = conversation.participants
        .filter((p) => p.toString() !== socket.userId)
        .map((p) => p.toString());

      if (typingUsers.has(conversationId)) {
        const conversationTyping = typingUsers.get(conversationId);
        conversationTyping.delete(socket.userId);
        if (conversationTyping.size === 0) {
          typingUsers.delete(conversationId);
          console.log("Broadcasting stopTyping:", { conversationId, userId: socket.userId });
          recipientIds.forEach((recipientId) => {
            const recipientSocketId = getRecipientSocketId(recipientId);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit("stopTyping", {
                conversationId,
                userId: socket.userId,
                timestamp: Date.now(),
              });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error broadcasting stopTyping:", error.message);
      socket.emit("error", { message: "Failed to broadcast stopTyping", timestamp: Date.now() });
    }
  });

  socket.on("userFollowed", (data) => {
    console.log(`Broadcasting userFollowed: ${data.followedId} by ${data.follower._id}`);
  });

  socket.on("userUnfollowed", (data) => {
    console.log(`Broadcasting userUnfollowed: ${data.unfollowedId} by ${data.followerId}`);
  });

  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (socket.userId && userSocketMap[socket.userId] === socket.id) {
      delete userSocketMap[socket.userId];
      console.log("Updated userSocketMap:", userSocketMap);
      typingUsers.forEach((conversationTyping, conversationId) => {
        if (conversationTyping.has(socket.userId)) {
          conversationTyping.delete(socket.userId);
          if (conversationTyping.size === 0) typingUsers.delete(conversationId);
          Conversation.findById(conversationId)
            .lean()
            .then((conversation) => {
              if (conversation) {
                const recipientIds = conversation.participants
                  .filter((p) => p.toString() !== socket.userId)
                  .map((p) => p.toString());
                recipientIds.forEach((recipientId) => {
                  const recipientSocketId = getRecipientSocketId(recipientId);
                  if (recipientSocketId) {
                    io.to(recipientSocketId).emit("stopTyping", {
                      conversationId,
                      userId: socket.userId,
                      timestamp: Date.now(),
                    });
                  }
                });
              }
            })
            .catch((error) => {
              console.error("Error cleaning up typing on disconnect:", error.message);
            });
        }
      });
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error.message);
  });

  socket.on("reconnect", (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts: ${socket.id}`);
  });

  socket.on("reconnect_error", (error) => {
    console.error("Socket reconnection error:", error.message);
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
