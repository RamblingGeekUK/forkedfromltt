/**
 * Migration script to import existing JSON data into SQLite database
 * Run this once to migrate your data: node db/migrate.js
 */

const fs = require('fs');
const path = require('path');
const {
  initializeDatabase,
  addCreator,
  addCreatorEdit,
  getAllCreators,
  addAd,
  addFaq,
  closeDatabase,
  db
} = require('./database');

const dataDir = path.join(__dirname, '..', 'data');

function loadJsonFile(filename) {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filename}, skipping...`);
    return [];
  }
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return [];
  }
}

function migrateCreators() {
  console.log('\n--- Migrating Creators ---');
  const creators = loadJsonFile('creators.json');
  let count = 0;
  
  for (const creator of creators) {
    try {
      addCreator({
        name: creator.name,
        image: creator.image,
        CreatedDate: creator.CreatedDate,
        ExitDate: creator.ExitDate,
        FullyForked: creator.FullyForked,
        Notes: creator.Notes,
        socials: creator.socials,
        nicknames: creator.nicknames
      });
      count++;
    } catch (err) {
      console.error(`Error adding creator ${creator.name}:`, err.message);
    }
  }
  
  console.log(`Migrated ${count} creators`);
}

function migrateAds() {
  console.log('\n--- Migrating Ads ---');
  const ads = loadJsonFile('ads.json');
  let count = 0;
  
  for (const ad of ads) {
    try {
      addAd({
        name: ad.name,
        image: ad.image,
        website: ad.website,
        ad: ad.ad
      });
      count++;
    } catch (err) {
      console.error(`Error adding ad ${ad.name}:`, err.message);
    }
  }
  
  console.log(`Migrated ${count} ads`);
}

function migrateSuggestions() {
  console.log('\n--- Migrating Suggestions (as pending creators) ---');
  const suggestions = loadJsonFile('suggestions.json');
  let count = 0;
  
  for (const suggestion of suggestions) {
    try {
      // Add as pending creator (live: false)
      addCreator({
        name: suggestion.name,
        image: suggestion.image,
        CreatedDate: suggestion.CreatedDate,
        ExitDate: suggestion.ExitDate,
        FullyForked: suggestion.FullyForked,
        Notes: suggestion.Notes,
        socials: suggestion.socials,
        nicknames: suggestion.nicknames,
        live: false  // Pending approval
      });
      count++;
    } catch (err) {
      console.error(`Error adding suggestion ${suggestion.name}:`, err.message);
    }
  }
  
  console.log(`Migrated ${count} suggestions as pending creators`);
}

function migrateSuggestedEdits() {
  console.log('\n--- Migrating Suggested Edits ---');
  const edits = loadJsonFile('suggestedEdits.json');
  let count = 0;
  let skipped = 0;
  
  // Get all creators to find parent by name
  const allCreators = getAllCreators();
  
  for (const edit of edits) {
    try {
      // Find the original creator by name
      const parentCreator = allCreators.find(c => c.name === edit.originalCreatorName);
      
      if (!parentCreator) {
        console.log(`  Skipping edit for "${edit.originalCreatorName}" - creator not found`);
        skipped++;
        continue;
      }
      
      // Add as pending edit linked to parent
      addCreatorEdit(parentCreator.id, {
        name: edit.name,
        image: edit.image,
        ExitDate: edit.ExitDate,
        FullyForked: edit.FullyForked,
        Notes: edit.Notes,
        socials: edit.socials,
        nicknames: edit.nicknames
      });
      count++;
    } catch (err) {
      console.error(`Error adding suggested edit for ${edit.name}:`, err.message);
    }
  }
  
  console.log(`Migrated ${count} suggested edits (${skipped} skipped)`);
}

function migrateFaq() {
  console.log('\n--- Migrating FAQ ---');
  const faqItems = loadJsonFile('faq.json');
  let count = 0;
  
  for (const faq of faqItems) {
    try {
      addFaq({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        expanded: faq.expanded
      });
      count++;
    } catch (err) {
      console.error(`Error adding FAQ ${faq.id}:`, err.message);
    }
  }
  
  console.log(`Migrated ${count} FAQ items`);
}

function runMigration() {
  console.log('===========================================');
  console.log('Starting JSON to SQLite Migration');
  console.log('===========================================');
  
  // Initialize database schema
  initializeDatabase();
  
  // Check if we already have data
  const existingCreators = db.prepare('SELECT COUNT(*) as count FROM creators').get();
  if (existingCreators.count > 0) {
    console.log('\nWarning: Database already contains data!');
    console.log(`Found ${existingCreators.count} existing creators.`);
    console.log('To re-migrate, delete the database file first: data/forkedfromltt.db');
    console.log('\nAborting migration to prevent duplicates.');
    closeDatabase();
    return;
  }
  
  // Run migrations in a transaction for atomicity
  const migration = db.transaction(() => {
    migrateCreators();
    migrateAds();
    migrateSuggestions();
    migrateSuggestedEdits();
    migrateFaq();
  });
  
  try {
    migration();
    console.log('\n===========================================');
    console.log('Migration completed successfully!');
    console.log('===========================================');
    console.log('\nDatabase file created at: data/forkedfromltt.db');
    console.log('Your JSON files are still intact as backups.');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    console.error('Rolling back all changes...');
  }
  
  closeDatabase();
}

// Run if executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
