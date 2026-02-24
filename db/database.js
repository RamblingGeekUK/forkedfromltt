const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Generate a UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Initialize database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'forkedfromltt.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Creators table
  db.exec(`
    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT,
      created_date TEXT,
      exit_date TEXT,
      fully_forked INTEGER DEFAULT 0,
      notes TEXT,
      nicknames TEXT,
      live INTEGER DEFAULT 1,
      parent_id TEXT,
      FOREIGN KEY (parent_id) REFERENCES creators(id) ON DELETE CASCADE
    )
  `);

  // Add live column to existing creators table if it doesn't exist
  try {
    db.exec(`ALTER TABLE creators ADD COLUMN live INTEGER DEFAULT 1`);
    console.log('Added live column to creators table');
  } catch (err) {
    // Column already exists, ignore
  }

  // Add parent_id column for suggested edits
  try {
    db.exec(`ALTER TABLE creators ADD COLUMN parent_id TEXT`);
    console.log('Added parent_id column to creators table');
  } catch (err) {
    // Column already exists, ignore
  }

  // Remove socials column from creators table (now using creator_socials table)
  try {
    db.exec(`ALTER TABLE creators DROP COLUMN socials`);
    console.log('Removed socials column from creators table');
  } catch (err) {
    // Column doesn't exist or SQLite version doesn't support DROP COLUMN, ignore
  }

  // Creator socials table (one-to-many relationship with creators)
  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_socials (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      channel_id TEXT,
      visible INTEGER DEFAULT 1,
      FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
    )
  `);

  // Create index for faster lookups by creator_id
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_creator_socials_creator_id ON creator_socials(creator_id)
  `);

  // Ads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT,
      website TEXT,
      is_ad INTEGER DEFAULT 0
    )
  `);

  // Drop legacy tables (suggestions and suggested_edits - now using creators table)
  try {
    db.exec(`DROP TABLE IF EXISTS suggestions`);
    console.log('Dropped suggestions table');
  } catch (err) {
    // Table doesn't exist, ignore
  }
  
  try {
    db.exec(`DROP TABLE IF EXISTS suggested_edits`);
    console.log('Dropped suggested_edits table');
  } catch (err) {
    // Table doesn't exist, ignore
  }

  // FAQ table
  db.exec(`
    CREATE TABLE IF NOT EXISTS faq (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      expanded INTEGER DEFAULT 0
    )
  `);

  console.log('Database schema initialized');
}

// Migrate existing JSON socials data to the new creator_socials table
// This is a legacy migration function - safe to skip if socials column no longer exists
function migrateSocialsToNewTable() {
  console.log('Checking for socials data to migrate...');
  
  try {
    // Get all creators with socials in the JSON column (if it still exists)
    const stmt = db.prepare("SELECT id, socials FROM creators WHERE socials IS NOT NULL AND socials != '' AND socials != '{}'");
    const creators = stmt.all();
    
    let migratedCount = 0;
    
    for (const creator of creators) {
      // Check if this creator already has socials in the new table
      const checkStmt = db.prepare('SELECT COUNT(*) as count FROM creator_socials WHERE creator_id = ?');
      const existing = checkStmt.get(creator.id);
      
      if (existing.count === 0 && creator.socials) {
        try {
          const socials = JSON.parse(creator.socials);
          if (Object.keys(socials).length > 0) {
            addSocialsForCreator(creator.id, socials);
            migratedCount++;
          }
        } catch (err) {
          console.error(`Error migrating socials for creator ${creator.id}:`, err.message);
        }
      }
    }
    
    if (migratedCount > 0) {
      console.log(`Migrated socials for ${migratedCount} creators to new table`);
    } else {
      console.log('No socials data to migrate');
    }
  } catch (err) {
    // Socials column no longer exists, migration not needed
    console.log('Socials column not found - migration not needed');
  }
}

// ==================== CREATORS ====================

function getAllCreators() {
  // Only get original creators (not pending edits)
  const stmt = db.prepare('SELECT * FROM creators WHERE parent_id IS NULL ORDER BY name');
  const rows = stmt.all();
  return rows.map(row => {
    const socials = getSocialsByCreatorId(row.id);
    return {
      id: row.id,
      name: row.name,
      image: row.image,
      CreatedDate: row.created_date,
      ExitDate: row.exit_date,
      FullyForked: Boolean(row.fully_forked),
      Notes: row.notes,
      socials: socials,
      nicknames: row.nicknames ? JSON.parse(row.nicknames) : [],
      live: row.live === undefined ? true : Boolean(row.live),
      parentId: row.parent_id || null
    };
  });
}

function getLiveCreators() {
  // Only get live original creators (not pending edits)
  const stmt = db.prepare('SELECT * FROM creators WHERE live = 1 AND parent_id IS NULL ORDER BY name');
  const rows = stmt.all();
  return rows.map(row => {
    const socials = getSocialsByCreatorId(row.id);
    return {
      id: row.id,
      name: row.name,
      image: row.image,
      CreatedDate: row.created_date,
      ExitDate: row.exit_date,
      FullyForked: Boolean(row.fully_forked),
      Notes: row.notes,
      socials: socials,
      nicknames: row.nicknames ? JSON.parse(row.nicknames) : [],
      live: true,
      parentId: null
    };
  });
}

function getPendingCreators() {
  // Get pending new creators (live=0 and no parent - these are new submissions, not edits)
  const stmt = db.prepare('SELECT * FROM creators WHERE live = 0 AND parent_id IS NULL ORDER BY name');
  const rows = stmt.all();
  return rows.map(row => {
    const socials = getSocialsByCreatorId(row.id);
    return {
      id: row.id,
      name: row.name,
      image: row.image,
      CreatedDate: row.created_date,
      ExitDate: row.exit_date,
      FullyForked: Boolean(row.fully_forked),
      Notes: row.notes,
      socials: socials,
      nicknames: row.nicknames ? JSON.parse(row.nicknames) : [],
      live: false,
      parentId: null
    };
  });
}

function getPendingEdits() {
  // Get pending edits (have a parent_id - these are edits to existing creators)
  const stmt = db.prepare('SELECT * FROM creators WHERE parent_id IS NOT NULL ORDER BY name');
  const rows = stmt.all();
  return rows.map(row => {
    const socials = getSocialsByCreatorId(row.id);
    return {
      id: row.id,
      name: row.name,
      image: row.image,
      CreatedDate: row.created_date,
      ExitDate: row.exit_date,
      FullyForked: Boolean(row.fully_forked),
      Notes: row.notes,
      socials: socials,
      nicknames: row.nicknames ? JSON.parse(row.nicknames) : [],
      live: false,
      parentId: row.parent_id
    };
  });
}

function getCreatorById(id) {
  const stmt = db.prepare('SELECT * FROM creators WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return null;
  
  const socials = getSocialsByCreatorId(row.id);
  
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    CreatedDate: row.created_date,
    ExitDate: row.exit_date,
    FullyForked: Boolean(row.fully_forked),
    Notes: row.notes,
    socials: socials,
    nicknames: row.nicknames ? JSON.parse(row.nicknames) : [],
    live: row.live === undefined ? true : Boolean(row.live),
    parentId: row.parent_id || null
  };
}

function addCreator(creator) {
  const creatorId = generateUUID();
  const stmt = db.prepare(`
    INSERT INTO creators (id, name, image, created_date, exit_date, fully_forked, notes, nicknames, live)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    creatorId,
    creator.name,
    creator.image || '',
    creator.CreatedDate || new Date().toISOString(),
    creator.ExitDate || '',
    creator.FullyForked ? 1 : 0,
    creator.Notes || '',
    JSON.stringify(creator.nicknames || []),
    creator.live !== undefined ? (creator.live ? 1 : 0) : 1
  );
  
  // Add socials to the creator_socials table
  if (creator.socials) {
    addSocialsForCreator(creatorId, creator.socials);
  }
  
  return creatorId;
}

function updateCreator(id, creator) {
  const stmt = db.prepare(`
    UPDATE creators 
    SET name = ?, image = ?, created_date = ?, exit_date = ?, fully_forked = ?, notes = ?, nicknames = ?, live = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    creator.name,
    creator.image || '',
    creator.CreatedDate || '',
    creator.ExitDate || '',
    creator.FullyForked ? 1 : 0,
    creator.Notes || '',
    JSON.stringify(creator.nicknames || []),
    creator.live !== undefined ? (creator.live ? 1 : 0) : 1,
    id
  );
  
  // Update socials in the creator_socials table
  if (creator.socials) {
    replaceSocialsForCreator(id, creator.socials);
  }
  
  return result.changes > 0;
}

function deleteCreator(id) {
  const stmt = db.prepare('DELETE FROM creators WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function setCreatorLive(id, live) {
  const stmt = db.prepare('UPDATE creators SET live = ? WHERE id = ?');
  const result = stmt.run(live ? 1 : 0, id);
  return result.changes > 0;
}

// Add a suggested edit to an existing creator
function addCreatorEdit(parentId, editData) {
  const editId = generateUUID();
  const stmt = db.prepare(`
    INSERT INTO creators (id, name, image, created_date, exit_date, fully_forked, notes, nicknames, live, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);
  stmt.run(
    editId,
    editData.name,
    editData.image || '',
    editData.CreatedDate || '',
    editData.ExitDate || '',
    editData.FullyForked ? 1 : 0,
    editData.Notes || '',
    JSON.stringify(editData.nicknames || []),
    parentId
  );
  
  // Add socials for the pending edit
  if (editData.socials) {
    addSocialsForCreator(editId, editData.socials);
  }
  
  return editId;
}

// Approve a pending edit - copy data to parent and delete the edit row
function approveCreatorEdit(editId) {
  const edit = getCreatorById(editId);
  if (!edit || !edit.parentId) return false;
  
  const parentId = edit.parentId;
  
  // Update the parent creator with the edit data
  const stmt = db.prepare(`
    UPDATE creators 
    SET name = ?, image = ?, created_date = ?, exit_date = ?, fully_forked = ?, notes = ?, nicknames = ?
    WHERE id = ?
  `);
  stmt.run(
    edit.name,
    edit.image || '',
    edit.CreatedDate || '',
    edit.ExitDate || '',
    edit.FullyForked ? 1 : 0,
    edit.Notes || '',
    JSON.stringify(edit.nicknames || []),
    parentId
  );
  
  // Replace parent's socials with the edit's socials
  if (edit.socials) {
    replaceSocialsForCreator(parentId, edit.socials);
  }
  
  // Delete the pending edit row and its socials
  deleteSocialsByCreatorId(editId);
  const deleteStmt = db.prepare('DELETE FROM creators WHERE id = ?');
  deleteStmt.run(editId);
  
  return true;
}

// Reject a pending edit - just delete it
function rejectCreatorEdit(editId) {
  const edit = getCreatorById(editId);
  if (!edit || !edit.parentId) return false;
  
  // Delete the pending edit's socials and the edit itself
  deleteSocialsByCreatorId(editId);
  const stmt = db.prepare('DELETE FROM creators WHERE id = ?');
  const result = stmt.run(editId);
  return result.changes > 0;
}

// ==================== CREATOR SOCIALS ====================

function getSocialsByCreatorId(creatorId) {
  const stmt = db.prepare('SELECT * FROM creator_socials WHERE creator_id = ?');
  const rows = stmt.all(creatorId);
  
  // Convert flat rows to the nested structure expected by the app
  const socials = {};
  for (const row of rows) {
    if (!socials[row.platform]) {
      socials[row.platform] = [];
    }
    socials[row.platform].push({
      id: row.id,
      url: row.url,
      channelId: row.channel_id || '',
      visible: Boolean(row.visible)
    });
  }
  return socials;
}

function addSocialForCreator(creatorId, platform, socialData) {
  const socialId = generateUUID();
  const stmt = db.prepare(`
    INSERT INTO creator_socials (id, creator_id, platform, url, channel_id, visible)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    socialId,
    creatorId,
    platform,
    socialData.url,
    socialData.channelId || '',
    socialData.visible !== false ? 1 : 0
  );
  return socialId;
}

function addSocialsForCreator(creatorId, socials) {
  if (!socials || typeof socials !== 'object') return;
  
  for (const [platform, accounts] of Object.entries(socials)) {
    if (Array.isArray(accounts)) {
      for (const account of accounts) {
        if (account.url) {
          addSocialForCreator(creatorId, platform, account);
        }
      }
    }
  }
}

function updateSocialById(socialId, socialData) {
  const stmt = db.prepare(`
    UPDATE creator_socials 
    SET url = ?, channel_id = ?, visible = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    socialData.url,
    socialData.channelId || '',
    socialData.visible !== false ? 1 : 0,
    socialId
  );
  return result.changes > 0;
}

function deleteSocialById(socialId) {
  const stmt = db.prepare('DELETE FROM creator_socials WHERE id = ?');
  const result = stmt.run(socialId);
  return result.changes > 0;
}

function deleteSocialsByCreatorId(creatorId) {
  const stmt = db.prepare('DELETE FROM creator_socials WHERE creator_id = ?');
  const result = stmt.run(creatorId);
  return result.changes;
}

function replaceSocialsForCreator(creatorId, socials) {
  // Delete all existing socials and add new ones (for full replacement)
  deleteSocialsByCreatorId(creatorId);
  addSocialsForCreator(creatorId, socials);
}

// ==================== ADS ====================

function getAllAds() {
  const stmt = db.prepare('SELECT * FROM ads ORDER BY name');
  return stmt.all().map(row => ({
    id: row.id,
    name: row.name,
    image: row.image,
    website: row.website,
    ad: Boolean(row.is_ad)
  }));
}

function getAdById(id) {
  const stmt = db.prepare('SELECT * FROM ads WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    website: row.website,
    ad: Boolean(row.is_ad)
  };
}

function addAd(ad) {
  const adId = generateUUID();
  const stmt = db.prepare(`
    INSERT INTO ads (id, name, image, website, is_ad)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(adId, ad.name, ad.image || '', ad.website || '', ad.ad ? 1 : 0);
  return adId;
}

function updateAd(id, ad) {
  const stmt = db.prepare(`
    UPDATE ads 
    SET name = ?, image = ?, website = ?, is_ad = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    ad.name,
    ad.image || '',
    ad.website || '',
    ad.ad ? 1 : 0,
    id
  );
  return result.changes > 0;
}

function deleteAd(id) {
  const stmt = db.prepare('DELETE FROM ads WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ==================== FAQ ====================

function getAllFaq() {
  const stmt = db.prepare('SELECT * FROM faq ORDER BY id');
  return stmt.all().map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    expanded: Boolean(row.expanded)
  }));
}

function getFaqById(id) {
  const stmt = db.prepare('SELECT * FROM faq WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return null;
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    expanded: Boolean(row.expanded)
  };
}

function addFaq(faq) {
  const faqId = faq.id || generateUUID();
  const stmt = db.prepare(`
    INSERT INTO faq (id, question, answer, expanded)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(faqId, faq.question, faq.answer, faq.expanded ? 1 : 0);
  return faqId;
}

function updateFaq(id, faq) {
  const stmt = db.prepare(`
    UPDATE faq 
    SET question = ?, answer = ?, expanded = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    faq.question,
    faq.answer,
    faq.expanded ? 1 : 0,
    id
  );
  return result.changes > 0;
}

function deleteFaq(id) {
  const stmt = db.prepare('DELETE FROM faq WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ==================== CLOSE ====================

function closeDatabase() {
  db.close();
}

module.exports = {
  db,
  initializeDatabase,
  migrateSocialsToNewTable,
  // Creators
  getAllCreators,
  getLiveCreators,
  getPendingCreators,
  getPendingEdits,
  getCreatorById,
  addCreator,
  updateCreator,
  deleteCreator,
  setCreatorLive,
  addCreatorEdit,
  approveCreatorEdit,
  rejectCreatorEdit,
  // Creator Socials
  getSocialsByCreatorId,
  addSocialForCreator,
  addSocialsForCreator,
  updateSocialById,
  deleteSocialById,
  deleteSocialsByCreatorId,
  replaceSocialsForCreator,
  // Ads
  getAllAds,
  getAdById,
  addAd,
  updateAd,
  deleteAd,
  // FAQ
  getAllFaq,
  getFaqById,
  addFaq,
  updateFaq,
  deleteFaq,
  // Utility
  closeDatabase
};
