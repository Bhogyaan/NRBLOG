import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxLength: 500 },
    userProfilePic: { type: String, default: "" },
    username: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    isEdited: { type: Boolean, default: false },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ userId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ likes: 1 });
commentSchema.index({ mentions: 1 });

const postSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxLength: 5000 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    media: { type: String },
    mediaType: { type: String, enum: ["image", "video", "audio", "document"] },
    originalFilename: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isBanned: { type: Boolean, default: false },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isEdited: { type: Boolean, default: false },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

postSchema.pre("validate", function (next) {
  if (this.media && !this.mediaType) {
    this.invalidate("mediaType", "mediaType is required when media is provided", this.mediaType);
  }
  if (!this.media && this.mediaType) {
    this.invalidate("media", "media is required when mediaType is provided", this.media);
  }
  if (this.comments && this.comments.length > 0) {
    this.comments.forEach((comment) => {
      if (!comment.username) {
        comment.username = "Unknown";
      }
      if (!comment.userProfilePic) {
        comment.userProfilePic = "";
      }
    });
  }
  next();
});

postSchema.virtual("postedByUser", {
  ref: "User",
  localField: "postedBy",
  foreignField: "_id",
  justOne: true,
  select: "username profilePic name isVerified",
});

postSchema.virtual("bannedByUser", {
  ref: "User",
  localField: "bannedBy",
  foreignField: "_id",
  justOne: true,
  select: "username profilePic name isVerified",
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

postSchema.index({ postedBy: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });
postSchema.index({ shares: 1 });
postSchema.index({ "comments._id": 1 });
postSchema.index({ isBanned: 1 });
postSchema.index({ bookmarks: 1 });

const Post = mongoose.model("Post", postSchema);

export { Post };