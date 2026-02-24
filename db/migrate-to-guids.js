/**
 * Migration script to convert integer IDs to GUIDs
 * 
 * This script will:
 * 1. Check if migration is needed (if tables have INTEGER PRIMARY KEY)
 * 2. Create new tables with TEXT PRIMARY KEY (GUID)
 * 3. Migrate all data with new UUIDs
 * 4. Update foreign key references
 * 5. Drop old tables and rename new ones
 * 
 * Usage: node db/migrate-to-guids.js
 */

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

db.pragma('foreign_keys = OFF'); // Temporarily disable foreign keys for migration

function checkIfMigrationNeeded() {
  // Check if creators table has INTEGER id
  const tableInfo = db.prepare("PRAGMA table_info(creators)").all();
  const idColumn = tableInfo.find(col => col.name === 'id');
  
  if (!idColumn) {
    console.log('No id column found in creators table. Migration may not be needed.');
    return false;
  }
  
  // If id type is INTEGER, we need to migrate
  if (idColumn.type.toUpperCase() === 'INTEGER') {
    console.log('Found INTEGER id columns. Migration needed.');
    return true;
  }
  
  console.log('Tables already use TEXT ids. No migration needed.');
  return false;
}

function migrateData() {
  console.log('Starting migration to GUIDs...');
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  try {
    // Map old integer IDs to new UUIDs
    const creatorIdMap = new Map();
    const socialIdMap = new Map();
    
    // 1. Migrate creators table
    console.log('Migrating creators table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS creators_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT,
        created_date TEXT,
        exit_date TEXT,
        fully_forked INTEGER DEFAULT 0,
        notes TEXT,
        socials TEXT,
        nicknames TEXT
      )
    `);
    
    const creators = db.prepare('SELECT * FROM creators').all();
    const insertCreator = db.prepare(`
      INSERT INTO creators_new (id, name, image, created_date, exit_date, fully_forked, notes, socials, nicknames)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const creator of creators) {
      const newId = generateUUID();
      creatorIdMap.set(creator.id, newId);
      insertCreator.run(
        newId,
        creator.name,
        creator.image,
        creator.created_date,
        creator.exit_date,
        creator.fully_forked,
        creator.notes,
        creator.socials,
        creator.nicknames
      );
    }
    console.log(`  Migrated ${creators.length} creators`);
    
    // 2. Migrate creator_socials table with updated foreign keys
    console.log('Migrating creator_socials table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS creator_socials_new (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        channel_id TEXT,
        visible INTEGER DEFAULT 1,
        FOREIGN KEY (creator_id) REFERENCES creators_new(id) ON DELETE CASCADE
      )
    `);
    
    const socials = db.prepare('SELECT * FROM creator_socials').all();
    const insertSocial = db.prepare(`
      INSERT INTO creator_socials_new (id, creator_id, platform, url, channel_id, visible)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const social of socials) {
      const newId = generateUUID();
      const newCreatorId = creatorIdMap.get(social.creator_id);
      if (newCreatorId) {
        socialIdMap.set(social.id, newId);
        insertSocial.run(
          newId,
          newCreatorId,
          social.platform,
          social.url,
          social.channel_id,
          social.visible
        );
      }
    }
    console.log(`  Migrated ${socials.length} social links`);
    
    // 3. Migrate ads table
    console.log('Migrating ads table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS ads_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT,
        website TEXT,
        is_ad INTEGER DEFAULT 0
      )
    `);
    
    const ads = db.prepare('SELECT * FROM ads').all();
    const insertAd = db.prepare(`
      INSERT INTO ads_new (id, name, image, website, is_ad)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const ad of ads) {
      insertAd.run(generateUUID(), ad.name, ad.image, ad.website, ad.is_ad);
    }
    console.log(`  Migrated ${ads.length} ads`);
    
    // 4. Migrate suggestions table
    console.log('Migrating suggestions table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS suggestions_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT,
        created_date TEXT,
        exit_date TEXT,
        fully_forked INTEGER DEFAULT 0,
        notes TEXT,
        socials TEXT,
        nicknames TEXT,
        submission_date TEXT,
        status TEXT DEFAULT 'pending'
      )
    `);
    
    const suggestions = db.prepare('SELECT * FROM suggestions').all();
    const insertSuggestion = db.prepare(`
      INSERT INTO suggestions_new (id, name, image, created_date, exit_date, fully_forked, notes, socials, nicknames, submission_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const suggestion of suggestions) {
      insertSuggestion.run(
        generateUUID(),
        suggestion.name,
        suggestion.image,
        suggestion.created_date,
        suggestion.exit_date,
        suggestion.fully_forked,
        suggestion.notes,
        suggestion.socials,
        suggestion.nicknames,
        suggestion.submission_date,
        suggestion.status
      );
    }
    console.log(`  Migrated ${suggestions.length} suggestions`);
    
    // 5. Migrate suggested_edits table
    console.log('Migrating suggested_edits table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS suggested_edits_new (
        id TEXT PRIMARY KEY,
        original_creator_name TEXT NOT NULL,
        name TEXT NOT NULL,
        image TEXT,
        exit_date TEXT,
        fully_forked INTEGER DEFAULT 0,
        notes TEXT,
        socials TEXT,
        nicknames TEXT,
        submission_date TEXT,
        status TEXT DEFAULT 'pending'
      )
    `);
    
    const edits = db.prepare('SELECT * FROM suggested_edits').all();
    const insertEdit = db.prepare(`
      INSERT INTO suggested_edits_new (id, original_creator_name, name, image, exit_date, fully_forked, notes, socials, nicknames, submission_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const edit of edits) {
      insertEdit.run(
        generateUUID(),
        edit.original_creator_name,
        edit.name,
        edit.image,
        edit.exit_date,
        edit.fully_forked,
        edit.notes,
        edit.socials,
        edit.nicknames,
        edit.submission_date,
        edit.status
      );
    }
    console.log(`  Migrated ${edits.length} suggested edits`);
    
    // 6. Drop old tables and rename new ones
    console.log('Replacing old tables with new ones...');
    db.exec('DROP TABLE IF EXISTS creator_socials');
    db.exec('DROP TABLE IF EXISTS creators');
    db.exec('DROP TABLE IF EXISTS ads');
    db.exec('DROP TABLE IF EXISTS suggestions');
    db.exec('DROP TABLE IF EXISTS suggested_edits');
    
    db.exec('ALTER TABLE creators_new RENAME TO creators');
    db.exec('ALTER TABLE creator_socials_new RENAME TO creator_socials');
    db.exec('ALTER TABLE ads_new RENAME TO ads');
    db.exec('ALTER TABLE suggestions_new RENAME TO suggestions');
    db.exec('ALTER TABLE suggested_edits_new RENAME TO suggested_edits');
    
    // Recreate index
    db.exec('CREATE INDEX IF NOT EXISTS idx_creator_socials_creator_id ON creator_socials(creator_id)');
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('Migration completed successfully!');
    
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  }
}

// Run migration
if (checkIfMigrationNeeded()) {
  migrateData();
} else {
  console.log('No migration needed. Database is already using GUIDs.');
}

db.pragma('foreign_keys = ON');
db.close();
