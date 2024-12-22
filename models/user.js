const mongoose = require("mongoose");
const brcypt = require("bcryptjs");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
});

userSchema.methods.correctPassword = async function () {
  canditatePassword, // 123456
    userPassword; // hash paswword
  return await brcypt.compare(canditatePassword, userPassword);
};
const User = new mongoose.model("User", userSchema);
module.exports = User;
