const jwt = require("jsonwebtoken");

//
const User = reuqire("../models/user.js");

const signToken = (userId) => jwt.sign({ userId },process.env.JWT_SECRET);
exports.login = async (req, res, next) => {
  //
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
  }
  const user = await User.findOne({ email: email }).select("+password"); // User from models
  if (!userDoc || (await userDoc.correctPassword(password, userDoc.password))) {
    //user from database
    res.status(400).json({
      status: "error",
      message: "Email or Password is incorrect",
    });
  }
  const token = signToken(userDoc._id);
  res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    token,
  });
};
