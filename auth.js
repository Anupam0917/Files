/* ════════════════════════════════════════
   backend/middleware/auth.js
   JWT authentication middleware
════════════════════════════════════════ */

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware that verifies the Authorization Bearer token.
 * Attaches req.user if valid.
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated. Please sign in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    // Attach fresh user (without password) to request
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User no longer exists." });
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
}

module.exports = { protect };
