require("dotenv").config();
const express = require("express");
const nodemailer = require('nodemailer');
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.static("public"));
app.use('/data', express.static('data'));

// --- Submit Creator Endpoint ---
app.post('/api/submit-creator', express.json(), async (req, res) => {
  const { name, youtube, twitter, instagram, bluesky, turnstileToken } = req.body;
  if (!name || !youtube) return res.status(400).json({ error: 'Missing required fields' });
  if (!turnstileToken) return res.status(400).json({ error: 'Missing CAPTCHA' });
  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET,
        response: turnstileToken
      })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return res.status(400).json({ error: 'CAPTCHA failed' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'CAPTCHA verification error' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.CONTACT_EMAIL_USER,
      pass: process.env.CONTACT_EMAIL_PASS
    }
  });

  // Compose email body
  let text = `New Creator Submission\n`;
  text += `Name: ${name}\n`;
  text += `YouTube: ${youtube}\n`;
  if (twitter) text += `Twitter/X: ${twitter}\n`;
  if (instagram) text += `Instagram: ${instagram}\n`;
  if (bluesky) text += `BlueSky: ${bluesky}\n`;

  try {
    await transporter.sendMail({
      from: process.env.CONTACT_EMAIL_USER,
      to: process.env.CONTACT_EMAIL_USER,
      subject: 'New Creator Submission',
      text
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Cache info endpoint for frontend footer
app.get('/api/cache-info', (req, res) => {
  const CACHE_FILE = 'data/latestVideos.json';
  const CACHE_TTL = 48 * 60 * 60; // 48 hours in seconds
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return res.json({ lastUpdated: null, ttl: CACHE_TTL });
    }
    const stats = fs.statSync(CACHE_FILE);
    return res.json({
      lastUpdated: stats.mtime,
      ttl: CACHE_TTL
    });
  } catch (e) {
    return res.status(500).json({ lastUpdated: null, ttl: CACHE_TTL });
  }
});

app.post('/api/contact', express.json(), async (req, res) => {
  const { name, email, message, turnstileToken } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' });
  // Cloudflare Turnstile verification
  if (!turnstileToken) return res.status(400).json({ error: 'Missing CAPTCHA' });
  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET,
        response: turnstileToken
      })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return res.status(400).json({ error: 'CAPTCHA failed' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'CAPTCHA verification error' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.CONTACT_EMAIL_USER,
      pass: process.env.CONTACT_EMAIL_PASS
    }
  });

  // Compose email body
  let text = `Contact Form Submission\n`;
  text += `Name: ${name}\n`;
  text += `Email: ${email}\n`;
  text += `Message: ${message}\n`;

  try {
    await transporter.sendMail({
      from: process.env.CONTACT_EMAIL_USER,
      to: process.env.CONTACT_EMAIL_USER,
      subject: 'Contact Form Submission',
      text
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
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
        title: null, // No video title since we're not using YouTube API
        videoId: null, // No video ID since we're not using YouTube API
        thumbnail: creator.image || null, // Use creator's image if available
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
