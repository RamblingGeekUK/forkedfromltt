require("dotenv").config();
const express = require("express");
const nodemailer = require('nodemailer');
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use('/data', express.static('data'));

app.get("/api/faq", async (req, res) => {
  console.log("API endpoint /api/faq called");
  try {
    const faqData = JSON.parse(fs.readFileSync("data/faq.json"));
    res.json(faqData);
  } catch (err) {
    console.error("Error loading FAQ data:", err);
    res.status(500).json({ error: "Failed to load FAQ data" });
  }
});

app.get("/api/creators", async (req, res) => {
  console.log("API endpoint /api/creators called");
  try {
    // Load creators and ads directly from JSON files
    const creators = JSON.parse(fs.readFileSync("data/creators.json"));
    const ads = JSON.parse(fs.readFileSync("data/ads.json"));
    console.log(`Loaded ${creators.length} creators and ${ads.length} ads`);
    const results = [];

    // Add ads to results
    for (const ad of ads) {
      console.log(`Adding ad: ${ad.name}`);
      results.push({
        channel: ad.name,
        ad: ad.ad,
        isAd: true,
        title: null,
        videoId: null,
        thumbnail: ad.image,
        website: ad.website
      });
    }

    // Add creators to results
    for (const creator of creators) {
      console.log(`Adding creator: ${creator.name}, FullyForked: ${creator.FullyForked}`);
      results.push({
        channel: creator.name,
        FullyForked: creator.FullyForked === true,
        title: null, 
        thumbnail: creator.image || null,
        socials: creator.socials || {},
        website: creator.socials?.website?.[0]?.url || undefined,
        image: creator.image || undefined,
        notes: creator.Notes || null,
        nicknames: creator.nicknames || []
      });
    }

    console.log(`Total results: ${results.length}`);
    
    // Shuffle final results to mix ads and creators randomly
    const shuffledResults = results.slice().sort(() => Math.random() - 0.5);
    
    res.json(shuffledResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load creators" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
