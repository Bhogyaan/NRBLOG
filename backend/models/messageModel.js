import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    seen: { type: Boolean, default: false },
    img: { type: String, default: "" },
    status: {
      type: String,
      enum: ["sent", "received", "delivered", "seen"],
      default: "sent",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;