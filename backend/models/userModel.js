import mongoose from "mongoose";

const userSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		username: {
			type: String,
			required: true,
			unique: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			minLength: 6,
			required: true,
		},
		profilePic: {
			type: String,
			default: "",
		},
		followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
		bio: {
			type: String,
			default: "",
		},
		isFrozen: {
			type: Boolean,
			default: false,
		},
		isAdmin: {
			type: Boolean,
			default: false,
		},
		isBanned: {
			type: Boolean,
			default: false,
		},
		isVerified: {
			type: Boolean,
			default: false,
		  },
	},
	{
		timestamps: true,
	}
);
userSchema.pre("save", function (next) {
	if (this.isAdmin) {
	  this.isVerified = true;
	}
	next();
  });

const User = mongoose.model("User", userSchema);

export default User;