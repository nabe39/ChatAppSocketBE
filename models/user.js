const mongoose = require("mongoose");
const brcypt = require("bcryptjs");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const crypto = require("crypto");
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: function (email) {
        return emailPattern.test(String(email).toLowerCase());
      },
      message: (props) => `Invalid (${props.value}) email`,
    },
  },
  password: {
    type: String,
  },
  passwordConfirm: {
    type: String,
  },
  passwordChangeAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
  },
  updateAt: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: Number,
  },
  otp_expiry_time: {
    type: Date,
  },
});
userSchema.pre("save", async function (next) {
  // Only run this function if OTP is actually modified
  if (!this.isModified("otp")) return next();
  //Hash the OTP with the cost of 12
  this.otp = await brcyptjs.hash(this.otp, 12);
  next();
});

userSchema.pre("save", async function (next) {
  // Only run this function if OTP is actually modified
  if (!this.isModified("password")) return next();
  //Hash the OTP with the cost of 12
  this.password = await brcyptjs.hash(this.password, 12);
  next();
});
userSchema.methods.correctPassword = async function () {
  canditatePassword, // 123456
    userPassword; // hash paswword
  return await brcypt.compare(canditatePassword, userPassword);
};
userSchema.methods.correctOTP = async function () {
  canditateOTP, // 123456
    userOTP; // hash paswword
  return await brcypt.compare(canditateOTP, userOTP);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
userSchema.methods.changedPasswordAfter = function (timestamp) {
  return timestamp < this.passwordChangeAt;
};

const User = new mongoose.model("User", userSchema);
module.exports = User;
