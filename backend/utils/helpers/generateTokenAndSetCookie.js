import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (userId, res) => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET);
	console.log("JWT_SECRET in generateToken:", process.env.JWT_SECRET);
	console.log("Token in generateToken:", token);
	// Set the token in the cookie
	res.cookie("jwt", token, {
		httpOnly: true, // more secure
		maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
		sameSite: "strict", // CSRF
	});

	return token;
};

export default generateTokenAndSetCookie;
