/* ════════════════════════════════════════
   backend/models/Favourite.js
   Mongoose schema for saved locations
════════════════════════════════════════ */

const mongoose = require("mongoose");

const favouriteSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    city: {
      type:     String,
      required: [true, "City is required"],
      trim:     true,
    },
    country: {
      type:    String,
      default: "",
      trim:    true,
    },
  },
  { timestamps: true }
);

/* ── Prevent duplicate city per user ── */
favouriteSchema.index({ userId: 1, city: 1 }, { unique: true });

module.exports = mongoose.model("Favourite", favouriteSchema);
