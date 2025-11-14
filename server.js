require("dotenv").config();
const express = require("express");
const nodemailer = require('nodemailer');
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use('/data', express.static('data'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Handle creator suggestions submission
app.post("/api/suggestions", async (req, res) => {
  console.log("API endpoint /api/suggestions called with data:", req.body);
  try {
    const { name, image, fullyForked, youtube, twitter, instagram, website, bluesky, linkedin, notes } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Creator name is required" });
    }

    // Parse fullyForked value (comes as string from form)
    const isFullyForked = fullyForked === 'true' || fullyForked === true;

    // Create suggestion object in creators.json format
    const suggestion = {
      name: name.trim(),
      image: image?.trim() || "",
      CreatedDate: new Date().toISOString(),
      ExitDate: "",
      nicknames: [],
      FullyForked: isFullyForked,
      socials: {
        youtube: youtube?.trim() ? [{ channelId: "", url: youtube.trim(), visible: true }] : [],
        twitter: twitter?.trim() ? [{ url: twitter.trim(), visible: true }] : [],
        instagram: instagram?.trim() ? [{ url: instagram.trim(), visible: true }] : [],
        website: website?.trim() ? [{ url: website.trim(), visible: true }] : [],
        bluesky: bluesky?.trim() ? [{ url: bluesky.trim(), visible: true }] : [],
        linkedin: linkedin?.trim() ? [{ url: linkedin.trim(), visible: true }] : []
      },
      Notes: notes?.trim() || "",
      submissionDate: new Date().toISOString(),
      status: "pending"
    };

    // Read existing suggestions file or create empty array
    let suggestions = [];
    const suggestionsPath = "data/suggestions.json";
    
    if (fs.existsSync(suggestionsPath)) {
      try {
        const data = fs.readFileSync(suggestionsPath, 'utf8');
        suggestions = JSON.parse(data);
      } catch (parseErr) {
        console.error("Error parsing existing suggestions file:", parseErr);
        suggestions = [];
      }
    }

    // Add new suggestion
    suggestions.push(suggestion);

    // Write back to file
    fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2));
    
    console.log(`New suggestion added for creator: ${name}`);
    res.json({ success: true, message: "Suggestion submitted successfully!" });
    
  } catch (err) {
    console.error("Error handling suggestion submission:", err);
    res.status(500).json({ error: "Failed to submit suggestion" });
  }
});

// Authentication routes
app.post("/api/login", async (req, res) => {
  console.log("API endpoint /api/login called");
  try {
    const { username, password, rememberMe } = req.body;
    
    // For demo purposes, using simple hardcoded credentials
    // In production, this should use proper password hashing and database lookup
    const validCredentials = [
      { username: 'admin', password: 'admin123', email: 'admin@ltt.com' },
      { username: 'user', password: 'user123', email: 'user@ltt.com' }
    ];
    
    const user = validCredentials.find(u => 
      (u.username === username || u.email === username) && u.password === password
    );
    
    if (user) {
      // Generate simple token (in production, use JWT or similar)
      const token = Buffer.from(`${user.username}:${Date.now()}`).toString('base64');
      
      console.log(`User ${user.username} logged in successfully`);
      res.json({ 
        success: true, 
        message: "Login successful", 
        token: token,
        user: { username: user.username, email: user.email },
        redirect: 'index.html'
      });
    } else {
      console.log(`Failed login attempt for username: ${username}`);
      res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
    
  } catch (err) {
    console.error("Error handling login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  console.log("API endpoint /api/forgot-password called");
  try {
    const { email } = req.body;
    
    // In production, this would:
    // 1. Check if email exists in database
    // 2. Generate secure reset token
    // 3. Send email with reset link
    // 4. Store token with expiration
    
    console.log(`Password reset requested for email: ${email}`);
    
    // Simulate successful email send
    res.json({ 
      success: true, 
      message: "Password reset link sent to your email" 
    });
    
  } catch (err) {
    console.error("Error handling forgot password:", err);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

app.post("/api/verify-token", async (req, res) => {
  console.log("API endpoint /api/verify-token called");
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, message: "No token provided" });
    }
    
    const token = authHeader.substring(7);
    
    // Simple token validation (in production, use proper JWT verification)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [username, timestamp] = decoded.split(':');
      
      // Check if token is less than 24 hours old
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenAge < maxAge && username) {
        res.json({ valid: true, username: username });
      } else {
        res.status(401).json({ valid: false, message: "Token expired" });
      }
    } catch (decodeError) {
      res.status(401).json({ valid: false, message: "Invalid token format" });
    }
    
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(500).json({ error: "Token verification failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
