/* ════════════════════════════════════════
   backend/controllers/authController.js
   Signup, Login logic
════════════════════════════════════════ */

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/* ── Helper: create signed JWT ── */
function signToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/* ── Helper: send token response ── */
function sendToken(res, statusCode, user, token) {
  res.status(statusCode).json({
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
}

/* ── POST /api/auth/register ── */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password." });
    }

    // Check duplicate
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered." });

    // Create user (password hashed by pre-save hook)
    const user  = await User.create({ name, email, password });
    const token = signToken(user._id);

    sendToken(res, 201, user, token);
  } catch (err) {
    console.error("Register error:", err);
    // Mongoose validation error
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map(e => e.message).join(". ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

/* ── POST /api/auth/login ── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }

    // Explicitly select password (excluded by default in schema)
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const match = await user.comparePassword(password);
    if (!match)  return res.status(401).json({ message: "Invalid credentials." });

    const token = signToken(user._id);
    sendToken(res, 200, user, token);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

/* ── GET /api/auth/me ── (protected, optional) */
exports.getMe = async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
};
