const jwt = require("jsonwebtoken");
const filterObj = require("../utils/filterObj");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const { promisify } = require("util");

//
const User = reuqire("../models/user.js");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

//Signup => register - sendOTP = verifyOTP
// https://api.tawk.com/auth/register

//Register New User
exports.register = async (res, req, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );

  //check if verfied user with given email exists
  const existing_user = await User.findOne({ email: email });
  if (existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is already is use, Please login.",
    });
  } else if (existing_user) {
    const updated_user = await User.findOneAndUpdate(
      { email: email },
      filteredBody,
      { new: true, validateModifiedOnly: true }
    );

    //generate OTP and send email to user
    req.userId = existing_user._id;
    next();
  } else {
    //if user record is not available in DB
    const new_user = await User.create(filteredBody);
    //generate OTP and send email to user
    req.userId = new_user._id;
    next();
  }
};
exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 mins after otp is sent
  //
  await User.findByIdAndUpdate(userId, {
    otp: new_otp,
    otp_expiry_time,
  });
  // TODO Send Mail
  res.status(200).json({
    stauts: "success",
    message: "OTP Sent successfully!",
  });
};

exports.verifyOTP = async (req, res, next) => {
  // verify OTP and update user record accordingly
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Data.now() },
  });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Email is Invalid or OTP expired",
    });
    return;
  }
  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });
  }
  // OTP is correct
  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });
};
const token = signToken(userDoc._id);
res.status(200).json({
  status: "success",
  message: "OTP verified successfully!",
  token,
});

exports.login = async (req, res, next) => {
  //
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
  }
  const userDoc = await User.findOne({ email: email }).select("+password"); // User from models
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
exports.protect = async (req, res, next) => {
  // 1. Getting token (JWT) and check if it's there
  let token;
  // 'Bearer fadfadf1143'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split("")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else {
    req.status[400].json({
      status: "error",
      message: "You are not logged in! Please log in to get access",
    });
    return;
  }
  // 2. verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3. check if user still exist
  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    res.status(400).json({
      status: "error",
      message: "The user doesn't exist",
    });
  }
  // 4. Check if user changed their password after token was issued

  if (this_user.changePasswordAfter(decoded.iat)) {
    res.status(400).json({
      status: "error",
      message: "User recently updated password! Please log in again",
    });
  }
  //
  req.user = this_user;
  next();
};
// Types of routes => Protected (only logged in users can access these) & UnProtected
exports.forgotPassword = async (req, res, next) => {
  // 1. get users email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "There is no user with given email address",
    });
    return;
  }
  // 2. generate the random reset token
  const resetToken = user.createPasswordResetToken();
  const resetURL = `https://tawk.com/auth/reset-password/?code-${resetToken}`;
  try {
    // TODO => Send email with reset URL
    res.status(200).json({
      status: "success",
      message: "Reset password link sent to Email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({
      status: "error",
      message: "There was an error sending the email, Please try again later.",
    });
  }

  //https: // ?code=iuiajdfa
};
exports.resetPassword = async (req, res, next) => {
  // 1. get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Data.now() },
  });
  // 2. if token has expired or submission is out of time window
  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Token is invalid or expired",
    });
    return;
  }
  // 3. update users password and set resetToken & expiry to undeifned
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;

  await user.save();
  // 4. Log in the user and send new JWT
  // TODO => send an email to user informing about password

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    message: "Password reseted successfully",
    token,
  });
};
