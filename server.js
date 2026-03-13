import "dotenv/config";
import express from "express";
import cors from "cors";
import { getProducts } from "./services/wix.js";
import { analyzeAndRecommend } from "./services/claude.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "35mb" })); // photos up to 25MB → ~34MB base64
app.use(express.static("public"));

// POST /api/recommend
// Body: { age, gender, skinType, concerns[], sensitivities, routine, photo: "data:image/jpeg;base64,..." }
app.post("/api/recommend", async (req, res) => {
  const { age, gender, skinType, concerns, sensitivities, routine, photo } = req.body;

  if (!age || !skinType || !concerns?.length) {
    return res.status(400).json({ error: "גיל, סוג עור ומאפיינים הם שדות חובה." });
  }

  // Parse base64 photo
  const match = photo.match(/^data:(.+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: "Invalid photo format" });
  const [, photoMimeType, photoBase64] = match;

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(photoMimeType)) {
    return res.status(400).json({ error: "Photo must be JPEG, PNG, GIF, or WebP" });
  }

  try {
    const products = await getProducts();
    if (!products.length) {
      return res.status(503).json({ error: "Could not load product catalog" });
    }

    const result = await analyzeAndRecommend({
      age,
      gender,
      skinType,
      concerns,
      sensitivities,
      routine,
      photoBase64,
      photoMimeType,
      products,
    });

    // Attach product images from catalog (Claude doesn't have them)
    result.recommendations = result.recommendations.map((rec) => {
      const product = products.find((p) => p.name === rec.product_name);
      return { ...rec, product_image: product?.image || "" };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products — useful for debugging
app.get("/api/products", async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Skincare AI running on http://localhost:${PORT}`));
