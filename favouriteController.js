/* ════════════════════════════════════════════
   backend/controllers/favouriteController.js
   Get, Add, Remove favourite locations
════════════════════════════════════════════ */

const Favourite = require("../models/Favourite");

/* ── GET /api/favourites ── */
exports.getFavourites = async (req, res) => {
  try {
    const favs = await Favourite.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ favourites: favs });
  } catch (err) {
    console.error("getFavourites error:", err);
    res.status(500).json({ message: "Could not fetch favourites." });
  }
};

/* ── POST /api/favourites ── */
exports.addFavourite = async (req, res) => {
  try {
    const { city, country = "" } = req.body;
    if (!city) return res.status(400).json({ message: "City name is required." });

    const fav = await Favourite.create({ userId: req.user._id, city, country });
    res.status(201).json({ message: "Added to favourites.", favourite: fav });
  } catch (err) {
    // Duplicate key (unique index: userId + city)
    if (err.code === 11000) {
      return res.status(409).json({ message: "City already in favourites." });
    }
    console.error("addFavourite error:", err);
    res.status(500).json({ message: "Could not add favourite." });
  }
};

/* ── DELETE /api/favourites/:city ── */
exports.removeFavourite = async (req, res) => {
  try {
    const city   = decodeURIComponent(req.params.city);
    const result = await Favourite.findOneAndDelete({ userId: req.user._id, city });
    if (!result) return res.status(404).json({ message: "Favourite not found." });
    res.json({ message: "Removed from favourites." });
  } catch (err) {
    console.error("removeFavourite error:", err);
    res.status(500).json({ message: "Could not remove favourite." });
  }
};
