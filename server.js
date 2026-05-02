/* ════════════════════════════════════════
   NIMBUS WEATHER  |  backend/server.js
   Express + MongoDB entry point
════════════════════════════════════════ */

const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
require("dotenv").config();

const authRoutes = require('./backend/routes/auth');
const favRoutes  = require("./routes/favourites");

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Middleware ── */
app.use(cors({ origin: "*", methods: ["GET","POST","DELETE","PUT"] }));
app.use(express.json());

/* ── Request logger (dev helper) ── */
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ── Routes ── */
app.use("/api/auth",       authRoutes);
app.use("/api/favourites", favRoutes);

/* ── Health check ── */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── 404 handler ── */
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

/* ── MongoDB connection ── */
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/nimbus")
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
