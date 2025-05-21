import { Post, Reply } from "../models/postModel.js";
import Story from "../models/storyModel.js";
import User from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import sanitizeHtml from "sanitize-html";

const SUPPORTED_FORMATS = {
  image: ["image/jpeg", "image/png", "image/gif", "image/heic"],
  video: ["video/mp4", "video/x-matroska", "video/avi", "video/3gpp", "video/quicktime"],
  audio: ["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav", "audio/ogg", "audio/mp3"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/rtf",
    "application/zip",
    "application/x-zip-compressed",
  ],
};

const MAX_SIZES = {
  image: 16 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 2 * 1024 * 1024 * 1024,
};

const uploadToCloudinary = async (filePath, options) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, options);
    return result;
  } catch (error) {
    console.error("uploadToCloudinary: Failed", { message: error.message, stack: error.stack });
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("deleteFromCloudinary: Failed", { publicId, message: error.message });
  }
};

// Recursive function to populate nested replies
const populateReplies = async (query) => {
  return query.populate({
    path: "comments.replies",
    populate: [
      { path: "userId", select: "username profilePic" },
      {
        path: "replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          {
            path: "replies",
            populate: [
              { path: "userId", select: "username profilePic" },
              {
                path: "replies",
                populate: { path: "userId", select: "username profilePic" },
              },
            ],
          },
        ],
      },
    ],
  });
};

const createPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("createPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postedBy, text, mediaType } = req.body;
    const mediaFile = req.file;
    let mediaUrl, previewUrl, originalFilename;

    if (!postedBy || !text) {
      console.error("createPost: Missing required fields", { postedBy, text });
      return res.status(400).json({ error: "postedBy and text fields are required" });
    }

    const user = await User.findById(postedBy);
    if (!user || user.isBanned) {
      console.error("createPost: User not found or banned", { postedBy });
      return res.status(404).json({ error: "User not found or banned" });
    }

    if (user._id.toString() !== req.user._id.toString()) {
      console.error("createPost: Unauthorized", { postedBy, userId: req.user._id });
      return res.status(401).json({ error: "Unauthorized to create post" });
    }

    const maxLength = 500;
    const sanitizedText = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    if (sanitizedText.length > maxLength) {
      console.error("createPost: Text too long", { length: sanitizedText.length });
      return res.status(400).json({ error: `Text must be less than ${maxLength} characters` });
    }

    let detectedMediaType = mediaFile
      ? mediaType || Object.keys(SUPPORTED_FORMATS).find((key) => SUPPORTED_FORMATS[key].includes(mediaFile.mimetype))
      : null;
    if (mediaFile && !detectedMediaType) {
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      console.error("createPost: Unsupported file format", { mimetype: mediaFile.mimetype });
      return res.status(400).json({ error: `Unsupported file format: ${mediaFile.mimetype}. Please upload a valid file.` });
    }

    let newPost;
    if (mediaFile) {
      if (mediaFile.size > MAX_SIZES[detectedMediaType]) {
        if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
        console.error("createPost: File size exceeded", { type: detectedMediaType, size: mediaFile.size });
        return res.status(400).json({
          error: `${detectedMediaType} size exceeds ${(MAX_SIZES[detectedMediaType] / (1024 * 1024)).toFixed(2)}MB limit`,
        });
      }

      const uploadOptions = {
        resource_type: detectedMediaType === "video" || detectedMediaType === "audio" ? "video" : detectedMediaType === "document" ? "raw" : "image",
      };

      if (detectedMediaType === "document") {
        const uploadResponse = await uploadToCloudinary(mediaFile.path, {
          resource_type: "raw",
          use_filename: true,
          folder: "documents",
        });
        mediaUrl = uploadResponse.secure_url;
        originalFilename = mediaFile.originalname;

        if (mediaFile.mimetype === "application/pdf") {
          try {
            const previewResponse = await cloudinary.uploader.upload(mediaFile.path, {
              resource_type: "image",
              transformation: [{ page: 1, format: "jpg", width: 600, crop: "fit" }],
            });
            previewUrl = previewResponse.secure_url;
          } catch (previewError) {
            console.warn("createPost: Failed to generate PDF preview", { message: previewError.message });
            previewUrl = null;
          }
        } else if (mediaFile.mimetype === "application/zip") {
          previewUrl = null;
        }
      } else if (mediaFile.mimetype === "image/heic") {
        uploadOptions.transformation = [{ fetch_format: "jpg" }];
        detectedMediaType = "image";
      } else {
        const uploadedResponse = await uploadToCloudinary(mediaFile.path, uploadOptions);
        mediaUrl = uploadedResponse.secure_url;
        previewUrl = detectedMediaType === "image" || detectedMediaType === "video" ? uploadedResponse.thumbnail_url : null;
      }

      if (!mediaUrl) {
        console.error("createPost: Cloudinary upload failed", { mediaType: detectedMediaType });
        throw new Error("Upload to Cloudinary failed");
      }

      newPost = new Post({
        postedBy,
        text: sanitizedText,
        media: mediaUrl,
        mediaType: detectedMediaType,
        previewUrl,
        originalFilename: detectedMediaType === "document" ? originalFilename : undefined,
      });
      await newPost.save();
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
    } else {
      newPost = new Post({ postedBy, text: sanitizedText });
      await newPost.save();
    }

    const query = Post.findById(newPost._id).populate("postedBy", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      const followerIds = [...(user.following || []), user._id.toString()];
      followerIds.forEach((followerId) => {
        const socketId = req.io.getRecipientSocketId?.(followerId);
        if (socketId) {
          req.io.to(socketId).emit("newPost", populatedPost);
        }
      });
      req.io.to(`post:${newPost._id}`).emit("newFeedPost", populatedPost);
    } else {
      console.warn("createPost: Socket.IO instance unavailable");
    }

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error("createPost: Error", { message: err.message, stack: err.stack, postedBy: req.body.postedBy });
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: `Failed to create post: ${err.message}` });
  }
};

const createStory = async (req, res) => {
  try {
    if (!req.user) {
      console.error("createStory: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const mediaFile = req.file;
    const postedBy = req.user._id;

    if (!mediaFile) {
      console.error("createStory: Missing media file");
      return res.status(400).json({ error: "Media is required" });
    }

    const user = await User.findById(postedBy);
    if (!user || user.isBanned) {
      console.error("createStory: User not found or banned", { postedBy });
      return res.status(404).json({ error: "User not found or banned" });
    }

    let mediaType = Object.keys(SUPPORTED_FORMATS).find((key) => SUPPORTED_FORMATS[key].includes(mediaFile.mimetype));
    if (!mediaType) {
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      console.error("createStory: Unsupported media type", { mimetype: mediaFile.mimetype });
      return res.status(400).json({ error: "Unsupported media type" });
    }

    const uploadOptions = {
      resource_type: mediaType === "video" || mediaType === "audio" ? "video" : "image",
    };

    if (mediaFile.mimetype === "image/heic") {
      uploadOptions.transformation = [{ fetch_format: "jpg" }];
      mediaType = "image";
    }

    const uploadedResponse = await uploadToCloudinary(mediaFile.path, uploadOptions);
    const mediaUrl = uploadedResponse.secure_url;

    if (!SUPPORTED_FORMATS[mediaType].includes(uploadedResponse.format)) {
      await deleteFromCloudinary(uploadedResponse.public_id);
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      console.error("createStory: Unsupported format after upload", { format: uploadedResponse.format });
      return res.status(400).json({ error: `Unsupported ${mediaType} format` });
    }

    if (uploadedResponse.bytes > MAX_SIZES[mediaType]) {
      await deleteFromCloudinary(uploadedResponse.public_id);
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      console.error("createStory: File size exceeded", { type: mediaType, size: uploadedResponse.bytes });
      return res.status(400).json({ error: `${mediaType} size exceeds ${MAX_SIZES[mediaType] / (1024 * 1024)}MB limit` });
    }

    if (mediaType === "video" && uploadedResponse.duration > 30) {
      await deleteFromCloudinary(uploadedResponse.public_id);
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      console.error("createStory: Video too long", { duration: uploadedResponse.duration });
      return res.status(400).json({ error: "Story video must be less than 30 seconds" });
    }

    const newStory = new Story({
      postedBy,
      media: mediaUrl,
      mediaType,
      duration: mediaType === "video" ? uploadedResponse.duration : 0,
      previewUrl: mediaType === "image" || mediaType === "video" ? uploadedResponse.thumbnail_url : null,
    });
    await newStory.save();
    if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);

    res.status(201).json(newStory);
  } catch (err) {
    console.error("createStory: Error", { message: err.message, stack: err.stack });
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: `Failed to create story: ${err.message}` });
  }
};

const deletePost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("deletePost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      console.error("deletePost: Post not found", { postId: req.params.id });
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.postedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      console.error("deletePost: Unauthorized", { userId: req.user._id, postOwnerId: post.postedBy });
      return res.status(403).json({ error: "Unauthorized to delete post" });
    }

    if (post.media) {
      const publicId = post.media.split("/").pop().split(".")[0];
      await deleteFromCloudinary(publicId);
    }

    if (post.previewUrl) {
      const previewPublicId = post.previewUrl.split("/").pop().split(".")[0];
      await deleteFromCloudinary(previewPublicId);
    }

    const replyIds = post.comments.reduce((acc, comment) => [...acc, ...comment.replies], []);
    if (replyIds.length > 0) {
      await Reply.deleteMany({ _id: { $in: replyIds } });
    }

    await Post.findByIdAndDelete(req.params.id);
    if (req.io) {
      req.io.to(`post:${req.params.id}`).emit("postDeleted", { postId: req.params.id, userId: post.postedBy });
    } else {
      console.warn("deletePost: Socket.IO instance unavailable");
    }
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("deletePost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to delete post: ${err.message}` });
  }
};

const editPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("editPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = req.params.id;
    const userId = req.user._id;
    const { text, media, mediaType, previewUrl } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      console.error("editPost: Post not found", { postId });
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.postedBy.toString() !== userId.toString() && !req.user.isAdmin) {
      console.error("editPost: Unauthorized", { userId, postOwnerId: post.postedBy });
      return res.status(403).json({ error: "Unauthorized to edit this post" });
    }

    let isEdited = post.isEdited || false;
    if (text !== undefined && text !== post.text) {
      post.text = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
      isEdited = true;
    }
    if (media !== undefined && media !== post.media) {
      post.media = media;
      isEdited = true;
    }
    if (mediaType !== undefined && mediaType !== post.mediaType) {
      post.mediaType = mediaType;
      isEdited = true;
    }
    if (previewUrl !== undefined && previewUrl !== post.previewUrl) {
      post.previewUrl = previewUrl;
      isEdited = true;
    }

    post.isEdited = isEdited;
    await post.save();

    const query = Post.findById(postId).populate("postedBy", "username profilePic");
    const updatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("postUpdated", updatedPost);
    } else {
      console.warn("editPost: Socket.IO instance unavailable");
    }
    res.status(200).json(updatedPost);
  } catch (err) {
    console.error("editPost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to edit post: ${err.message}` });
  }
};

const getPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const query = Post.findById(req.params.id)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const post = await populateReplies(query);
    if (!post || post.isBanned) {
      console.error("getPost: Post not found or banned", { postId: req.params.id });
      return res.status(404).json({ error: "Post not found or banned" });
    }
    res.status(200).json(post);
  } catch (err) {
    console.error("getPost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to fetch post: ${err.message}` });
  }
};

const likeUnlikePost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("likeUnlikePost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("likeUnlikePost: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      post.likes.pull(userId);
    } else {
      post.likes = [...new Set([...post.likes, userId])]; // Prevent duplicates
    }
    await post.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikePost", {
        postId,
        userId,
        likes: populatedPost.likes,
        post: populatedPost,
      });
    } else {
      console.warn("likeUnlikePost: Socket.IO instance unavailable");
    }

    res.status(200).json({ likes: populatedPost.likes, post: populatedPost });
  } catch (err) {
    console.error("likeUnlikePost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to like/unlike post: ${err.message}` });
  }
};

const bookmarkUnbookmarkPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("bookmarkUnbookmarkPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id: postId } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(postId);
    const user = await User.findById(userId);

    if (!post || !user) {
      console.error("bookmarkUnbookmarkPost: Post or user not found", { postId, userId });
      return res.status(404).json({ error: "Post or user not found" });
    }

    const isBookmarked = user.bookmarks.includes(postId);
    if (isBookmarked) {
      user.bookmarks.pull(postId);
      post.bookmarks.pull(userId);
    } else {
      user.bookmarks.push(postId);
      post.bookmarks.push(userId);
    }

    await Promise.all([user.save(), post.save()]);

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("bookmarkUnbookmarkPost", {
        postId,
        userId,
        bookmarked: !isBookmarked,
        post: populatedPost,
      });
    } else {
      console.warn("bookmarkUnbookmarkPost: Socket.IO instance unavailable");
    }

    res.status(200).json({
      message: isBookmarked ? "Post unbookmarked" : "Post bookmarked",
      bookmarked: !isBookmarked,
      bookmarks: populatedPost.bookmarks,
      post: populatedPost,
    });
  } catch (err) {
    console.error("bookmarkUnbookmarkPost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to bookmark/unbookmark post: ${err.message}` });
  }
};

const getBookmarks = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getBookmarks: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { username } = req.params;
    const user = await User.findOne({ username })
      .populate({
        path: "bookmarks",
        match: { isBanned: false },
        populate: { path: "postedBy", select: "username profilePic" },
      })
      .lean();

    if (!user) {
      console.error("getBookmarks: User not found", { username });
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.bookmarks || []);
  } catch (err) {
    console.error("getBookmarks: Error", { message: err.message, stack: err.stack, username: req.params.username });
    res.status(500).json({ error: `Failed to fetch bookmarks: ${err.message}` });
  }
};

const commentOnPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("commentOnPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
      console.error("commentOnPost: Missing text", { postId });
      return res.status(400).json({ error: "Comment text is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("commentOnPost: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const user = await User.findById(userId).select("username profilePic");
    if (!user) {
      console.error("commentOnPost: User not found", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    const comment = {
      userId,
      text: sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }),
      username: user.username,
      userProfilePic: user.profilePic,
      createdAt: new Date(),
      likes: [],
      replies: [],
      isEdited: false,
    };

    post.comments.push(comment);
    await post.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    const newComment = populatedPost.comments[populatedPost.comments.length - 1];

    if (req.io) {
      req.io.to(`post:${postId}`).emit("newComment", {
        postId,
        comment: newComment,
        post: populatedPost,
      });
    } else {
      console.warn("commentOnPost: Socket.IO instance unavailable");
    }

    res.status(201).json({ comment: newComment, post: populatedPost });
  } catch (err) {
    console.error("commentOnPost: Error", { message: err.message, stack: err.stack, postId: req.params.postId });
    res.status(500).json({ error: `Failed to add comment: ${err.message}` });
  }
};

const addReply = async (req, res) => {
  try {
    if (!req.user) {
      console.error("addReply: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId } = req.params;
    const { text, parentId } = req.body;
    const userId = req.user._id;

    if (!text) {
      console.error("addReply: Missing text", { postId, commentId, parentId });
      return res.status(400).json({ error: "Reply text is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("addReply: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const user = await User.findById(userId).select("username profilePic");
    if (!user) {
      console.error("addReply: User not found", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    let newReply;
    let parentCommentId = commentId;

    if (!parentId) {
      // Reply to a comment
      const comment = post.comments.id(commentId);
      if (!comment) {
        console.error("addReply: Comment not found", { commentId });
        return res.status(404).json({ error: "Comment not found" });
      }

      newReply = new Reply({
        userId,
        text: sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }),
        username: user.username,
        userProfilePic: user.profilePic,
        parentId: commentId,
        parentType: "Comment",
        depth: 1,
        topLevelCommentId: commentId,
        createdAt: new Date(),
        likes: [],
        replies: [],
        isEdited: false,
      });
      await newReply.save();

      comment.replies.push(newReply._id);
    } else {
      // Reply to another reply
      const parentReply = await Reply.findById(parentId);
      if (!parentReply) {
        console.error("addReply: Parent reply not found", { parentId });
        return res.status(404).json({ error: "Parent reply not found" });
      }

      newReply = new Reply({
        userId,
        text: sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }),
        username: user.username,
        userProfilePic: user.profilePic,
        parentId,
        parentType: "Reply",
        depth: parentReply.depth + 1,
        topLevelCommentId: parentReply.topLevelCommentId || commentId,
        createdAt: new Date(),
        likes: [],
        replies: [],
        isEdited: false,
      });
      await newReply.save();

      parentReply.replies.push(newReply._id);
      await parentReply.save();

      parentCommentId = parentReply.topLevelCommentId;
    }

    await post.save();

    const populatedReply = await Reply.findById(newReply._id)
      .populate("userId", "username profilePic")
      .populate({
        path: "replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } },
        ],
      });

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("newReply", {
        postId,
        commentId: parentCommentId,
        reply: populatedReply,
        post: populatedPost,
      });
    } else {
      console.warn("addReply: Socket.IO instance unavailable");
    }

    res.status(201).json({ reply: populatedReply, post: populatedPost });
  } catch (err) {
    console.error("addReply: Error", {
      message: err.message,
      stack: err.stack,
      postId: req.params.postId,
      commentId: req.params.commentId,
      parentId: req.body.parentId,
    });
    res.status(500).json({ error: `Failed to add reply: ${err.message}` });
  }
};

const editComment = async (req, res) => {
  try {
    if (!req.user) {
      console.error("editComment: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      console.error("editComment: Post not found", { postId });
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      console.error("editComment: Comment not found", { commentId });
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      console.error("editComment: Unauthorized", { userId, commentUserId: comment.userId });
      return res.status(403).json({ error: "Unauthorized to edit this comment" });
    }

    if (!text || !text.trim()) {
      console.error("editComment: Empty text", { commentId });
      return res.status(400).json({ error: "Comment text cannot be empty" });
    }

    comment.text = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    comment.isEdited = true;
    comment.updatedAt = new Date();
    await post.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("editComment", {
        postId,
        commentId,
        comment,
        post: populatedPost,
      });
    } else {
      console.warn("editComment: Socket.IO instance unavailable");
    }

    res.status(200).json({ comment, post: populatedPost });
  } catch (err) {
    console.error("editComment: Error", { message: err.message, stack: err.stack, postId: req.params.postId, commentId: req.params.commentId });
    res.status(500).json({ error: `Failed to edit comment: ${err.message}` });
  }
};

const editReply = async (req, res) => {
  try {
    if (!req.user) {
      console.error("editReply: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId, replyId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const reply = await Reply.findById(replyId);
    if (!reply) {
      console.error("editReply: Reply not found", { replyId });
      return res.status(404).json({ error: "Reply not found" });
    }

    if (reply.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      console.error("editReply: Unauthorized", { userId, replyUserId: reply.userId });
      return res.status(403).json({ error: "Unauthorized to edit this reply" });
    }

    if (!text || !text.trim()) {
      console.error("editReply: Empty text", { replyId });
      return res.status(400).json({ error: "Reply text cannot be empty" });
    }

    reply.text = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    reply.isEdited = true;
    reply.updatedAt = new Date();
    await reply.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("editReply", {
        postId,
        commentId: reply.topLevelCommentId || commentId,
        replyId,
        reply,
        post: populatedPost,
      });
    } else {
      console.warn("editReply: Socket.IO instance unavailable");
    }

    res.status(200).json({ reply, post: populatedPost });
  } catch (err) {
    console.error("editReply: Error", { message: err.message, stack: err.stack, postId: req.params.postId, replyId: req.params.replyId });
    res.status(500).json({ error: `Failed to edit reply: ${err.message}` });
  }
};

const deleteComment = async (req, res) => {
  try {
    if (!req.user) {
      console.error("deleteComment: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("deleteComment: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      console.error("deleteComment: Comment not found", { commentId });
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString() && userId.toString() !== post.postedBy.toString() && !req.user.isAdmin) {
      console.error("deleteComment: Unauthorized", { userId, commentUserId: comment.userId, postOwnerId: post.postedBy });
      return res.status(403).json({ error: "Unauthorized to delete this comment" });
    }

    const deleteNestedReplies = async (replyIds) => {
      if (!replyIds || replyIds.length === 0) return;
      const replies = await Reply.find({ _id: { $in: replyIds } });
      for (const reply of replies) {
        await deleteNestedReplies(reply.replies);
      }
      await Reply.deleteMany({ _id: { $in: replyIds } });
    };

    await deleteNestedReplies(comment.replies);
    post.comments.pull({ _id: commentId });
    await post.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("deleteComment", {
        postId,
        commentId,
        post: populatedPost,
      });
    } else {
      console.warn("deleteComment: Socket.IO instance unavailable");
    }

    res.status(200).json({ message: "Comment deleted successfully", post: populatedPost });
  } catch (err) {
    console.error("deleteComment: Error", { message: err.message, stack: err.stack, postId: req.params.postId, commentId: req.params.commentId });
    res.status(500).json({ error: `Failed to delete comment: ${err.message}` });
  }
};

const deleteReply = async (req, res) => {
  try {
    if (!req.user) {
      console.error("deleteReply: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId, replyId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("deleteReply: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const reply = await Reply.findById(replyId);
    if (!reply) {
      console.error("deleteReply: Reply not found", { replyId });
      return res.status(404).json({ error: "Reply not found" });
    }

    if (reply.userId.toString() !== userId.toString() && userId.toString() !== post.postedBy.toString() && !req.user.isAdmin) {
      console.error("deleteReply: Unauthorized", { userId, replyUserId: reply.userId, postOwnerId: post.postedBy });
      return res.status(403).json({ error: "Unauthorized to delete this reply" });
    }

    const deleteNestedReplies = async (replyIds) => {
      if (!replyIds || replyIds.length === 0) return;
      const replies = await Reply.find({ _id: { $in: replyIds } });
      for (const reply of replies) {
        await deleteNestedReplies(reply.replies);
      }
      await Reply.deleteMany({ _id: { $in: replyIds } });
    };

    await deleteNestedReplies(reply.replies);

    if (reply.parentType === "Comment") {
      const comment = post.comments.id(commentId);
      if (!comment) {
        console.error("deleteReply: Comment not found", { commentId });
        return res.status(404).json({ error: "Comment not found" });
      }
      comment.replies.pull(replyId);
    } else {
      const parentReply = await Reply.findById(reply.parentId);
      if (!parentReply) {
        console.error("deleteReply: Parent reply not found", { parentId: reply.parentId });
        return res.status(404).json({ error: "Parent reply not found" });
      }
      parentReply.replies.pull(replyId);
      await parentReply.save();
    }

    await Reply.findByIdAndDelete(replyId);
    await post.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("deleteReply", {
        postId,
        commentId: reply.topLevelCommentId || commentId,
        replyId,
        post: populatedPost,
      });
    } else {
      console.warn("deleteReply: Socket.IO instance unavailable");
    }

    res.status(200).json({ message: "Reply deleted successfully", post: populatedPost });
  } catch (err) {
    console.error("deleteReply: Error", {
      message: err.message,
      stack: err.stack,
      postId: req.params.postId,
      commentId: req.params.commentId,
      replyId: req.params.replyId,
    });
    res.status(500).json({ error: `Failed to delete reply: ${err.message}` });
  }
};

const likeUnlikeComment = async (req, res) => {
  try {
    if (!req.user) {
      console.error("likeUnlikeComment: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("likeUnlikeComment: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      console.error("likeUnlikeComment: Comment not found", { commentId });
      return res.status(404).json({ error: "Comment not found" });
    }

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      comment.likes.pull(userId);
    } else {
      comment.likes = [...new Set([...comment.likes, userId])]; // Prevent duplicates
    }
    await post.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikeComment", {
        postId,
        commentId,
        userId,
        likes: comment.likes,
        post: populatedPost,
      });
    } else {
      console.warn("likeUnlikeComment: Socket.IO instance unavailable");
    }

    res.status(200).json({ likes: comment.likes, post: populatedPost });
  } catch (err) {
    console.error("likeUnlikeComment: Error", { message: err.message, stack: err.stack, postId: req.params.postId, commentId: req.params.commentId });
    res.status(500).json({ error: `Failed to like/unlike comment: ${err.message}` });
  }
};

const likeUnlikeReply = async (req, res) => {
  try {
    if (!req.user) {
      console.error("likeUnlikeReply: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId, commentId, replyId } = req.params;
    const userId = req.user._id;

    const reply = await Reply.findById(replyId);
    if (!reply) {
      console.error("likeUnlikeReply: Reply not found", { replyId });
      return res.status(404).json({ error: "Reply not found" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      console.error("likeUnlikeReply: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const userLikedReply = reply.likes.includes(userId);

    if (userLikedReply) {
      reply.likes.pull(userId);
    } else {
      reply.likes = [...new Set([...reply.likes, userId])]; // Prevent duplicates
    }
    await reply.save();

    const query = Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikeReply", {
        postId,
        commentId: reply.topLevelCommentId || commentId,
        replyId,
        userId,
        likes: reply.likes,
        post: populatedPost,
      });
    } else {
      console.warn("likeUnlikeReply: Socket.IO instance unavailable");
    }

    res.status(200).json({ likes: reply.likes, post: populatedPost });
  } catch (err) {
    console.error("likeUnlikeReply: Error", { message: err.message, stack: err.stack, postId: req.params.postId, replyId: req.params.replyId });
    res.status(500).json({ error: `Failed to like/unlike reply: ${err.message}` });
  }
};

const banPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("banPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.isAdmin) {
      console.error("banPost: Admin access required", { userId: req.user._id });
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      console.error("banPost: Post not found", { postId: id });
      return res.status(404).json({ error: "Post not found" });
    }

    post.isBanned = true;
    post.bannedBy = req.user._id;
    post.bannedAt = new Date();
    await post.save();

    const query = Post.findById(id)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${id}`).emit("postBanned", { postId: id, post: populatedPost });
    } else {
      console.warn("banPost: Socket.IO instance unavailable");
    }
    res.status(200).json({ message: "Post banned successfully", post: populatedPost });
  } catch (err) {
    console.error("banPost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to ban post: ${err.message}` });
  }
};

const unbanPost = async (req, res) => {
  try {
    if (!req.user) {
      console.error("unbanPost: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.isAdmin) {
      console.error("unbanPost: Admin access required", { userId: req.user._id });
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      console.error("unbanPost: Post not found", { postId: id });
      return res.status(404).json({ error: "Post not found" });
    }

    post.isBanned = false;
    post.bannedBy = null;
    post.bannedAt = null;
    await post.save();

    const query = Post.findById(id)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const populatedPost = await populateReplies(query);

    if (req.io) {
      req.io.to(`post:${id}`).emit("postUnbanned", { postId: id, post: populatedPost });
    } else {
      console.warn("unbanPost: Socket.IO instance unavailable");
    }
    res.status(200).json({ message: "Post unbanned successfully", post: populatedPost });
  } catch (err) {
    console.error("unbanPost: Error", { message: err.message, stack: err.stack, postId: req.params.id });
    res.status(500).json({ error: `Failed to unban post: ${err.message}` });
  }
};

const getFeedPosts = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getFeedPosts: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      console.error("getFeedPosts: User not found", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following || [];
    const query = Post.find({
      postedBy: { $in: [...following, userId] },
      isBanned: false,
    })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const feedPosts = await populateReplies(query);

    res.status(200).json(feedPosts);
  } catch (err) {
    console.error("getFeedPosts: Error", { message: err.message, stack: err.stack, userId: req.user?._id });
    res.status(500).json({ error: `Failed to fetch feed posts: ${err.message}` });
  }
};

const getUserPosts = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getUserPosts: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      console.error("getUserPosts: User not found", { username });
      return res.status(404).json({ error: "User not found" });
    }

    const query = Post.find({ postedBy: user._id, isBanned: false })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const posts = await populateReplies(query);

    res.status(200).json(posts);
  } catch (err) {
    console.error("getUserPosts: Error", { message: err.message, stack: err.stack, username: req.params.username });
    res.status(500).json({ error: `Failed to fetch user posts: ${err.message}` });
  }
};

const getAllPosts = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getAllPosts: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.user.isAdmin) {
      console.error("getAllPosts: Admin access required", { userId: req.user._id });
      return res.status(403).json({ error: "Admin access required" });
    }

    const query = Post.find({})
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic name isAdmin")
      .populate("comments.userId", "username profilePic");
    const posts = await populateReplies(query).lean();

    res.status(200).json(posts);
  } catch (err) {
    console.error("getAllPosts: Error", { message: err.message, stack: err.stack });
    res.status(500).json({ error: `Failed to fetch all posts: ${err.message}` });
  }
};

const getStories = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getStories: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      console.error("getStories: User not found", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following || [];
    const stories = await Story.find({ postedBy: { $in: [...following, userId] } })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic");

    res.status(200).json(stories);
  } catch (err) {
    console.error("getStories: Error", { message: err.message, stack: err.stack, userId: req.user._id });
    res.status(500).json({ error: `Failed to fetch stories: ${err.message}` });
  }
};

const getSuggestedPosts = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getSuggestedPosts: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      console.error("getSuggestedPosts: User not found", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following || [];
    const query = Post.find({
      postedBy: { $nin: [userId, ...following] },
      isBanned: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    const suggestedPosts = await populateReplies(query);

    res.status(200).json(suggestedPosts);
  } catch (err) {
    console.error("getSuggestedPosts: Error", { message: err.message, stack: err.stack, userId: req.user._id });
    res.status(500).json({ error: `Failed to fetch suggested posts: ${err.message}` });
  }
};

const getPaginatedComments = async (req, res) => {
  try {
    if (!req.user) {
      console.error("getPaginatedComments: Missing req.user");
      return res.status(401).json({ error: "Authentication required" });
    }

    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic");
    if (!post || post.isBanned) {
      console.error("getPaginatedComments: Post not found or banned", { postId });
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const populatedPost = await populateReplies(Post.findById(postId));
    const comments = populatedPost.comments.slice(skip, skip + limit);

    res.status(200).json(comments);
  } catch (err) {
    console.error("getPaginatedComments: Error", { message: err.message, stack: err.stack, postId: req.params.postId });
    res.status(500).json({ error: `Failed to fetch comments: ${err.message}` });
  }
};

export {
  createPost,
  createStory,
  getPost,
  deletePost,
  likeUnlikePost,
  bookmarkUnbookmarkPost,
  getBookmarks,
  commentOnPost,
  addReply,
  likeUnlikeComment,
  likeUnlikeReply,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  banPost,
  unbanPost,
  getFeedPosts,
  getUserPosts,
  getAllPosts,
  getStories,
  editPost,
  getSuggestedPosts,
  getPaginatedComments,
};