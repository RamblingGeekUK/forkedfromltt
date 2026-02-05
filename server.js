require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const nodemailer = require('nodemailer');
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy in production (required for Render and other reverse proxies)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    // Check if user is an admin
    const adminUsernames = (process.env.ADMIN_GITHUB_USERNAMES || '').split(',').map(u => u.trim());
    const isAdmin = adminUsernames.includes(profile.username);
    
    const user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      profileUrl: profile.profileUrl,
      avatarUrl: profile.photos?.[0]?.value,
      isAdmin: isAdmin
    };
    
    return done(null, user);
  }
));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: 'Access denied. Admin privileges required.' });
}

// API routes must be defined before static file serving
// (API routes will be added below)

// GitHub OAuth routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Successful authentication
    if (req.user.isAdmin) {
      res.redirect('/admin.html');
    } else {
      res.redirect('/?logged_in=true');
    }
  }
);

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/');
  });
});

// Get current user info
app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Static file serving
app.use(express.static("public"));
app.use('/data', express.static('data'));

// Serve index.html at root without showing filename in URL
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

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
    const { 
      name, 
      image, 
      fullyForked, 
      youtube, 
      twitter, 
      instagram, 
      twitch,
      bluesky, 
      linkedin,
      reddit,
      soundcloud,
      lttforum,
      website, 
      notes 
    } = req.body;
    
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
        twitch: twitch?.trim() ? [{ url: twitch.trim(), visible: true }] : [],
        bluesky: bluesky?.trim() ? [{ url: bluesky.trim(), visible: true }] : [],
        linkedin: linkedin?.trim() ? [{ url: linkedin.trim(), visible: true }] : [],
        reddit: reddit?.trim() ? [{ url: reddit.trim(), visible: true }] : [],
        soundcloud: soundcloud?.trim() ? [{ url: soundcloud.trim(), visible: true }] : [],
        lttforum: lttforum?.trim() ? [{ url: lttforum.trim(), visible: true }] : [],
        website: website?.trim() ? [{ url: website.trim(), visible: true }] : []
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

// Handle suggested edits submissions
app.post("/api/suggested-edits", async (req, res) => {
  console.log("API endpoint /api/suggested-edits called");
  try {
    const { 
      name, 
      originalCreatorName,
      fullyForked, 
      image, 
      youtube, 
      twitter, 
      instagram, 
      twitch,
      bluesky, 
      linkedin,
      reddit,
      soundcloud,
      lttforum,
      website, 
      notes 
    } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ error: "Creator name is required" });
    }

    // Parse fullyForked status
    const isFullyForked = fullyForked === "true" || fullyForked === true;

    // Create edit suggestion object
    const editSuggestion = {
      originalCreatorName: originalCreatorName || name,
      name: name.trim(),
      image: image?.trim() || "",
      ExitDate: "",
      nicknames: [],
      FullyForked: isFullyForked,
      socials: {
        youtube: youtube?.trim() ? [{ channelId: "", url: youtube.trim(), visible: true }] : [],
        twitter: twitter?.trim() ? [{ url: twitter.trim(), visible: true }] : [],
        instagram: instagram?.trim() ? [{ url: instagram.trim(), visible: true }] : [],
        twitch: twitch?.trim() ? [{ url: twitch.trim(), visible: true }] : [],
        bluesky: bluesky?.trim() ? [{ url: bluesky.trim(), visible: true }] : [],
        linkedin: linkedin?.trim() ? [{ url: linkedin.trim(), visible: true }] : [],
        reddit: reddit?.trim() ? [{ url: reddit.trim(), visible: true }] : [],
        soundcloud: soundcloud?.trim() ? [{ url: soundcloud.trim(), visible: true }] : [],
        lttforum: lttforum?.trim() ? [{ url: lttforum.trim(), visible: true }] : [],
        website: website?.trim() ? [{ url: website.trim(), visible: true }] : []
      },
      Notes: notes?.trim() || "",
      submissionDate: new Date().toISOString(),
      status: "pending"
    };

    // Read existing suggested edits file or create empty array
    let suggestedEdits = [];
    const suggestedEditsPath = "data/suggestedEdits.json";
    
    if (fs.existsSync(suggestedEditsPath)) {
      try {
        const data = fs.readFileSync(suggestedEditsPath, 'utf8');
        suggestedEdits = JSON.parse(data);
      } catch (parseErr) {
        console.error("Error parsing existing suggested edits file:", parseErr);
        suggestedEdits = [];
      }
    }

    // Add new edit suggestion
    suggestedEdits.push(editSuggestion);

    // Write back to file
    fs.writeFileSync(suggestedEditsPath, JSON.stringify(suggestedEdits, null, 2));
    
    console.log(`Edit suggestion added for creator: ${originalCreatorName} -> ${name}`);
    res.json({ success: true, message: "Edit suggestion submitted successfully!" });
    
  } catch (err) {
    console.error("Error handling edit suggestion submission:", err);
    res.status(500).json({ error: "Failed to submit edit suggestion" });
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

// Admin API routes (protected)
app.get("/api/admin/suggestions", isAdmin, (req, res) => {
  try {
    const suggestions = JSON.parse(fs.readFileSync("data/suggestions.json"));
    res.json(suggestions);
  } catch (err) {
    console.error("Error loading suggestions:", err);
    res.status(500).json({ error: "Failed to load suggestions" });
  }
});

app.get("/api/admin/suggested-edits", isAdmin, (req, res) => {
  try {
    const suggestedEdits = JSON.parse(fs.readFileSync("data/suggestedEdits.json"));
    res.json(suggestedEdits);
  } catch (err) {
    console.error("Error loading suggested edits:", err);
    res.status(500).json({ error: "Failed to load suggested edits" });
  }
});

app.post("/api/admin/creators", isAdmin, (req, res) => {
  try {
    const newCreator = req.body;
    const creators = JSON.parse(fs.readFileSync("data/creators.json"));
    creators.push(newCreator);
    fs.writeFileSync("data/creators.json", JSON.stringify(creators, null, 2));
    res.json({ success: true, message: "Creator added successfully" });
  } catch (err) {
    console.error("Error adding creator:", err);
    res.status(500).json({ error: "Failed to add creator" });
  }
});

app.put("/api/admin/creators/:index", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const updatedCreator = req.body;
    const creators = JSON.parse(fs.readFileSync("data/creators.json"));
    
    if (index >= 0 && index < creators.length) {
      creators[index] = updatedCreator;
      fs.writeFileSync("data/creators.json", JSON.stringify(creators, null, 2));
      res.json({ success: true, message: "Creator updated successfully" });
    } else {
      res.status(404).json({ error: "Creator not found" });
    }
  } catch (err) {
    console.error("Error updating creator:", err);
    res.status(500).json({ error: "Failed to update creator" });
  }
});

app.delete("/api/admin/creators/:index", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const creators = JSON.parse(fs.readFileSync("data/creators.json"));
    
    if (index >= 0 && index < creators.length) {
      creators.splice(index, 1);
      fs.writeFileSync("data/creators.json", JSON.stringify(creators, null, 2));
      res.json({ success: true, message: "Creator deleted successfully" });
    } else {
      res.status(404).json({ error: "Creator not found" });
    }
  } catch (err) {
    console.error("Error deleting creator:", err);
    res.status(500).json({ error: "Failed to delete creator" });
  }
});

app.delete("/api/admin/suggestions/:index", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const suggestions = JSON.parse(fs.readFileSync("data/suggestions.json"));
    
    if (index >= 0 && index < suggestions.length) {
      suggestions.splice(index, 1);
      fs.writeFileSync("data/suggestions.json", JSON.stringify(suggestions, null, 2));
      res.json({ success: true, message: "Suggestion deleted successfully" });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  } catch (err) {
    console.error("Error deleting suggestion:", err);
    res.status(500).json({ error: "Failed to delete suggestion" });
  }
});

app.put("/api/admin/suggestions/:index", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const updatedSuggestion = req.body;
    const suggestions = JSON.parse(fs.readFileSync("data/suggestions.json"));
    
    if (index >= 0 && index < suggestions.length) {
      // Preserve submission date
      const submissionDate = suggestions[index].submissionDate;
      suggestions[index] = {
        ...updatedSuggestion,
        submissionDate: submissionDate
      };
      
      fs.writeFileSync("data/suggestions.json", JSON.stringify(suggestions, null, 2));
      res.json({ success: true, message: "Suggestion updated successfully" });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  } catch (err) {
    console.error("Error updating suggestion:", err);
    res.status(500).json({ error: "Failed to update suggestion" });
  }
});

app.post("/api/admin/suggestions/:index/approve", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const suggestions = JSON.parse(fs.readFileSync("data/suggestions.json"));
    const creators = JSON.parse(fs.readFileSync("data/creators.json"));
    
    if (index >= 0 && index < suggestions.length) {
      const suggestion = suggestions[index];
      const { status, submissionDate, ...creatorData } = suggestion;
      creators.push(creatorData);
      
      fs.writeFileSync("data/creators.json", JSON.stringify(creators, null, 2));
      
      suggestions.splice(index, 1);
      fs.writeFileSync("data/suggestions.json", JSON.stringify(suggestions, null, 2));
      
      res.json({ success: true, message: "Suggestion approved and added to creators" });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  } catch (err) {
    console.error("Error approving suggestion:", err);
    res.status(500).json({ error: "Failed to approve suggestion" });
  }
});

// Apply a suggested edit (update the creator with the edit's data)
app.post("/api/admin/suggested-edits/:index/apply", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const suggestedEdits = JSON.parse(fs.readFileSync("data/suggestedEdits.json"));
    const creators = JSON.parse(fs.readFileSync("data/creators.json"));
    
    if (index >= 0 && index < suggestedEdits.length) {
      const edit = suggestedEdits[index];
      
      // Find the original creator by name
      const creatorIndex = creators.findIndex(c => c.name === edit.originalCreatorName);
      
      if (creatorIndex === -1) {
        return res.status(404).json({ error: "Original creator not found" });
      }
      
      // Update the creator with the edit's data (excluding metadata)
      const { originalCreatorName, submissionDate, ...updatedData } = edit;
      creators[creatorIndex] = {
        ...creators[creatorIndex],
        ...updatedData
      };
      
      fs.writeFileSync("data/creators.json", JSON.stringify(creators, null, 2));
      
      // Remove the suggested edit
      suggestedEdits.splice(index, 1);
      fs.writeFileSync("data/suggestedEdits.json", JSON.stringify(suggestedEdits, null, 2));
      
      res.json({ success: true, message: "Edit applied successfully" });
    } else {
      res.status(404).json({ error: "Suggested edit not found" });
    }
  } catch (err) {
    console.error("Error applying suggested edit:", err);
    res.status(500).json({ error: "Failed to apply suggested edit" });
  }
});

// Delete a suggested edit
app.delete("/api/admin/suggested-edits/:index", isAdmin, (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const suggestedEdits = JSON.parse(fs.readFileSync("data/suggestedEdits.json"));
    
    if (index >= 0 && index < suggestedEdits.length) {
      suggestedEdits.splice(index, 1);
      fs.writeFileSync("data/suggestedEdits.json", JSON.stringify(suggestedEdits, null, 2));
      res.json({ success: true, message: "Suggested edit deleted successfully" });
    } else {
      res.status(404).json({ error: "Suggested edit not found" });
    }
  } catch (err) {
    console.error("Error deleting suggested edit:", err);
    res.status(500).json({ error: "Failed to delete suggested edit" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
