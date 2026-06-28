const bcrypt = require("bcryptjs");
const User = require("../models/User");

const registerUser = async (req, res) => {
  try {
    console.log("Register request received");
console.log(req.body);
    const { username, email, password, avatar } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      avatar,
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  registerUser,
};