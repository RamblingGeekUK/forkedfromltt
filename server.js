require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const nodemailer = require('nodemailer');

// Database
const db = require('./db/database');
db.initializeDatabase();
db.migrateSocialsToNewTable(); // Migrate existing JSON socials to new table

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
app.use('/images', express.static('public/images', {
  maxAge: '30d',
  immutable: true
}));
app.use(express.static("public"));
app.use('/data', express.static('data'));

// Serve index.html at root without showing filename in URL
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.get("/api/faq", async (req, res) => {
  console.log("API endpoint /api/faq called");
  try {
    const faqData = db.getAllFaq();
    res.json(faqData);
  } catch (err) {
    console.error("Error loading FAQ data:", err);
    res.status(500).json({ error: "Failed to load FAQ data" });
  }
});

app.get("/api/creators", async (req, res) => {
  console.log("API endpoint /api/creators called");
  try {
    // Load creators and ads from database
    const creators = db.getAllCreators();
    const ads = db.getAllAds();
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
        ExitDate: creator.ExitDate || null,
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
      youtube2,
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

    // Build YouTube array
    const youtubeLinks = [];
    if (youtube?.trim()) youtubeLinks.push({ channelId: "", url: youtube.trim(), visible: true });
    if (youtube2?.trim()) youtubeLinks.push({ channelId: "", url: youtube2.trim(), visible: true });

    // Create pending creator (live: false until approved)
    const newCreator = {
      name: name.trim(),
      image: image?.trim() || "",
      CreatedDate: new Date().toISOString(),
      ExitDate: "",
      nicknames: [],
      FullyForked: isFullyForked,
      socials: {
        youtube: youtubeLinks,
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
      live: false  // Pending approval
    };

    // Add new pending creator to database
    db.addCreator(newCreator);
    
    console.log(`New creator suggestion added: ${name}`);
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
      exitDate,
      youtube,
      youtube2,
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

    // Find the original creator by name
    const allCreators = db.getAllCreators();
    const originalCreator = allCreators.find(c => c.name === (originalCreatorName || name));
    
    if (!originalCreator) {
      return res.status(404).json({ error: "Original creator not found" });
    }

    // Parse fullyForked status
    const isFullyForked = fullyForked === "true" || fullyForked === true;

    // Build YouTube array
    const youtubeLinks = [];
    if (youtube?.trim()) youtubeLinks.push({ channelId: "", url: youtube.trim(), visible: true });
    if (youtube2?.trim()) youtubeLinks.push({ channelId: "", url: youtube2.trim(), visible: true });

    // Create edit data
    const editData = {
      name: name.trim(),
      image: image?.trim() || "",
      ExitDate: exitDate?.trim() || "",
      nicknames: [],
      FullyForked: isFullyForked,
      socials: {
        youtube: youtubeLinks,
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
      Notes: notes?.trim() || ""
    };

    // Add pending edit linked to original creator
    db.addCreatorEdit(originalCreator.id, editData);
    
    console.log(`Edit suggestion added for creator: ${originalCreatorName} -> ${name}`);
    res.json({ success: true, message: "Edit suggestion submitted successfully!" });
    
  } catch (err) {
    console.error("Error handling edit suggestion submission:", err);
    res.status(500).json({ error: "Failed to submit edit suggestion" });
  }
});

// Handle generic site feedback submissions
app.post('/api/feedback', async (req, res) => {
  try {
    const {
      name,
      email,
      type,
      message
    } = req.body;

    const trimmedMessage = message?.trim();
    if (!trimmedMessage) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const normalizedType = (type || 'other').toString().trim().toLowerCase();
    const allowedTypes = new Set(['idea', 'suggestion', 'bug', 'other']);

    const feedbackData = {
      name: name?.toString().trim().slice(0, 100) || '',
      email: email?.toString().trim().slice(0, 255) || '',
      type: allowedTypes.has(normalizedType) ? normalizedType : 'other',
      message: trimmedMessage.slice(0, 5000)
    };

    db.addSiteFeedback(feedbackData);
    res.json({ success: true, message: 'Thanks for your feedback!' });
  } catch (err) {
    console.error('Error handling feedback submission:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
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
    const suggestions = db.getPendingCreators();
    res.json(suggestions);
  } catch (err) {
    console.error("Error loading suggestions:", err);
    res.status(500).json({ error: "Failed to load suggestions" });
  }
});

app.get("/api/admin/suggested-edits", isAdmin, (req, res) => {
  try {
    const suggestedEdits = db.getPendingEdits();
    res.json(suggestedEdits);
  } catch (err) {
    console.error("Error loading suggested edits:", err);
    res.status(500).json({ error: "Failed to load suggested edits" });
  }
});

app.get("/api/admin/feedback", isAdmin, (req, res) => {
  try {
    const feedback = db.getSiteFeedback();
    res.json(feedback);
  } catch (err) {
    console.error("Error loading feedback:", err);
    res.status(500).json({ error: "Failed to load feedback" });
  }
});

app.get("/api/admin/creators", isAdmin, (req, res) => {
  try {
    const creators = db.getAllCreators();
    res.json(creators);
  } catch (err) {
    console.error("Error loading creators:", err);
    res.status(500).json({ error: "Failed to load creators" });
  }
});

app.get("/api/admin/creators/:id", isAdmin, (req, res) => {
  try {
    const creator = db.getCreatorById(req.params.id);
    if (!creator) {
      return res.status(404).json({ error: "Creator not found" });
    }
    res.json(creator);
  } catch (err) {
    console.error("Error loading creator:", err);
    res.status(500).json({ error: "Failed to load creator" });
  }
});

app.post("/api/admin/creators", isAdmin, (req, res) => {
  try {
    const newCreator = req.body;
    db.addCreator(newCreator);
    res.json({ success: true, message: "Creator added successfully" });
  } catch (err) {
    console.error("Error adding creator:", err);
    res.status(500).json({ error: "Failed to add creator" });
  }
});

app.put("/api/admin/creators/:id", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const updatedCreator = req.body;
    
    const success = db.updateCreator(id, updatedCreator);
    if (success) {
      res.json({ success: true, message: "Creator updated successfully" });
    } else {
      res.status(404).json({ error: "Creator not found" });
    }
  } catch (err) {
    console.error("Error updating creator:", err);
    res.status(500).json({ error: "Failed to update creator" });
  }
});

app.delete("/api/admin/creators/:id", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    
    const success = db.deleteCreator(id);
    if (success) {
      res.json({ success: true, message: "Creator deleted successfully" });
    } else {
      res.status(404).json({ error: "Creator not found" });
    }
  } catch (err) {
    console.error("Error deleting creator:", err);
    res.status(500).json({ error: "Failed to delete creator" });
  }
});

app.delete("/api/admin/suggestions/:id", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    
    const success = db.deleteCreator(id);
    if (success) {
      res.json({ success: true, message: "Suggestion deleted successfully" });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  } catch (err) {
    console.error("Error deleting suggestion:", err);
    res.status(500).json({ error: "Failed to delete suggestion" });
  }
});

app.put("/api/admin/suggestions/:id", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const updatedSuggestion = req.body;
    
    const success = db.updateCreator(id, updatedSuggestion);
    if (success) {
      res.json({ success: true, message: "Suggestion updated successfully" });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  } catch (err) {
    console.error("Error updating suggestion:", err);
    res.status(500).json({ error: "Failed to update suggestion" });
  }
});

app.post("/api/admin/suggestions/:id/approve", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    
    const success = db.setCreatorLive(id, true);
    if (success) {
      res.json({ success: true, message: "Suggestion approved and creator is now live" });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  } catch (err) {
    console.error("Error approving suggestion:", err);
    res.status(500).json({ error: "Failed to approve suggestion" });
  }
});

// Apply a suggested edit (update the creator with the edit's data)
app.post("/api/admin/suggested-edits/:id/apply", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    
    const success = db.approveCreatorEdit(id);
    if (success) {
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
app.delete("/api/admin/suggested-edits/:id", isAdmin, (req, res) => {
  try {
    const id = req.params.id;
    
    const success = db.rejectCreatorEdit(id);
    if (success) {
      res.json({ success: true, message: "Suggested edit deleted successfully" });
    } else {
      res.status(404).json({ error: "Suggested edit not found" });
    }
  } catch (err) {
    console.error("Error deleting suggested edit:", err);
    res.status(500).json({ error: "Failed to delete suggested edit" });
  }
});

// ==================== ADS ADMIN ROUTES ====================

app.get("/api/admin/ads", isAdmin, (req, res) => {
  try {
    const ads = db.getAllAds();
    res.json(ads);
  } catch (err) {
    console.error("Error loading ads:", err);
    res.status(500).json({ error: "Failed to load ads" });
  }
});

app.get("/api/admin/ads/:id", isAdmin, (req, res) => {
  try {
    const ad = db.getAdById(req.params.id);
    if (ad) {
      res.json(ad);
    } else {
      res.status(404).json({ error: "Ad not found" });
    }
  } catch (err) {
    console.error("Error loading ad:", err);
    res.status(500).json({ error: "Failed to load ad" });
  }
});

app.post("/api/admin/ads", isAdmin, (req, res) => {
  try {
    const adId = db.addAd(req.body);
    res.json({ success: true, id: adId, message: "Ad created successfully" });
  } catch (err) {
    console.error("Error creating ad:", err);
    res.status(500).json({ error: "Failed to create ad" });
  }
});

app.put("/api/admin/ads/:id", isAdmin, (req, res) => {
  try {
    const success = db.updateAd(req.params.id, req.body);
    if (success) {
      res.json({ success: true, message: "Ad updated successfully" });
    } else {
      res.status(404).json({ error: "Ad not found" });
    }
  } catch (err) {
    console.error("Error updating ad:", err);
    res.status(500).json({ error: "Failed to update ad" });
  }
});

app.delete("/api/admin/ads/:id", isAdmin, (req, res) => {
  try {
    const success = db.deleteAd(req.params.id);
    if (success) {
      res.json({ success: true, message: "Ad deleted successfully" });
    } else {
      res.status(404).json({ error: "Ad not found" });
    }
  } catch (err) {
    console.error("Error deleting ad:", err);
    res.status(500).json({ error: "Failed to delete ad" });
  }
});

// ==================== FAQ ADMIN ROUTES ====================

app.get("/api/admin/faq", isAdmin, (req, res) => {
  try {
    const faq = db.getAllFaq();
    res.json(faq);
  } catch (err) {
    console.error("Error loading FAQ:", err);
    res.status(500).json({ error: "Failed to load FAQ" });
  }
});

app.get("/api/admin/faq/:id", isAdmin, (req, res) => {
  try {
    const faq = db.getFaqById(req.params.id);
    if (faq) {
      res.json(faq);
    } else {
      res.status(404).json({ error: "FAQ not found" });
    }
  } catch (err) {
    console.error("Error loading FAQ:", err);
    res.status(500).json({ error: "Failed to load FAQ" });
  }
});

app.post("/api/admin/faq", isAdmin, (req, res) => {
  try {
    const faqId = db.addFaq(req.body);
    res.json({ success: true, id: faqId, message: "FAQ created successfully" });
  } catch (err) {
    console.error("Error creating FAQ:", err);
    res.status(500).json({ error: "Failed to create FAQ" });
  }
});

app.put("/api/admin/faq/:id", isAdmin, (req, res) => {
  try {
    const success = db.updateFaq(req.params.id, req.body);
    if (success) {
      res.json({ success: true, message: "FAQ updated successfully" });
    } else {
      res.status(404).json({ error: "FAQ not found" });
    }
  } catch (err) {
    console.error("Error updating FAQ:", err);
    res.status(500).json({ error: "Failed to update FAQ" });
  }
});

app.delete("/api/admin/faq/:id", isAdmin, (req, res) => {
  try {
    const success = db.deleteFaq(req.params.id);
    if (success) {
      res.json({ success: true, message: "FAQ deleted successfully" });
    } else {
      res.status(404).json({ error: "FAQ not found" });
    }
  } catch (err) {
    console.error("Error deleting FAQ:", err);
    res.status(500).json({ error: "Failed to delete FAQ" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
