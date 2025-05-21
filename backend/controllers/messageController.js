import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import { getRecipientSocketId, io } from "../socket/socket.js";
import { v2 as cloudinary } from "cloudinary";
import sanitizeHtml from "sanitize-html";

async function sendMessage(req, res) {
  try {
    const { recipientId, message, img } = req.body;
    const senderId = req.user._id;

    if (!recipientId || (!message && !img)) {
      return res.status(400).json({ error: "Recipient ID and message or media required" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, recipientId],
        lastMessage: { text: message || "Media", sender: senderId, seen: false },
      });
      await conversation.save();
    }

    const sanitizedMessage = sanitizeHtml(message || "");
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text: sanitizedMessage,
      img: img || "",
      status: "sent",
    });

    await newMessage.save();

    await conversation.updateOne({
      lastMessage: { text: sanitizedMessage || "Media", sender: senderId, seen: false },
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username profilePic")
      .lean();

    const recipientSocketId = getRecipientSocketId(recipientId);
    const senderSocketId = getRecipientSocketId(senderId);

    if (recipientSocketId) {
      await Message.updateOne({ _id: newMessage._id }, { status: "received" });
      populatedMessage.status = "received";
      io.to(recipientSocketId).emit("newMessage", {
        ...populatedMessage,
        conversationId: conversation._id,
        recipientId,
      });
      io.to(recipientSocketId).emit("newMessageNotification", {
        conversationId: conversation._id,
        sender: populatedMessage.sender,
        text: sanitizedMessage,
        img,
        messageId: newMessage._id,
      });
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", {
        ...populatedMessage,
        conversationId: conversation._id,
        recipientId,
      });
    }

    res.status(201).json({
      ...populatedMessage,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("Send message error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

async function getMessages(req, res) {
  const { otherUserId } = req.params;
  const userId = req.user._id;
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!conversation) {
      return res.status(200).json([]);
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .populate("sender", "username profilePic")
      .sort({ createdAt: 1 })
      .lean();

    const updatedMessages = await Message.updateMany(
      { conversationId: conversation._id, sender: otherUserId, seen: false },
      { $set: { seen: true, status: "seen" } },
      { multi: true }
    );

    if (updatedMessages.modifiedCount > 0) {
      const recipientSocketId = getRecipientSocketId(otherUserId);
      if (recipientSocketId) {
        const seenMessages = messages
          .filter((msg) => msg.sender._id === otherUserId && !msg.seen)
          .map((msg) => msg._id.toString());
        io.to(recipientSocketId).emit("messagesSeen", {
          conversationId: conversation._id,
          seenMessages,
        });
      }
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

async function getConversations(req, res) {
  const userId = req.user._id;
  try {
    const conversations = await Conversation.find({ participants: userId }).populate({
      path: "participants",
      select: "username profilePic",
    });

    conversations.forEach((conversation) => {
      conversation.participants = conversation.participants.filter(
        (participant) => participant._id.toString() !== userId.toString()
      );
    });
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

export { sendMessage, getMessages, getConversations };