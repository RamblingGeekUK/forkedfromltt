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

// Duplicate checking helper functions
function creatorExistsByName(name) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM creators WHERE name = ? AND live = 1');
  const result = stmt.get(name);
  return result.count > 0;
}

function adExistsByName(name) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM ads WHERE name = ?');
  const result = stmt.get(name);
  return result.count > 0;
}

function faqExistsByQuestion(question) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM faq WHERE question = ?');
  const result = stmt.get(question);
  return result.count > 0;
}

function pendingCreatorExistsByName(name) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM creators WHERE name = ? AND live = 0 AND parent_id IS NULL');
  const result = stmt.get(name);
  return result.count > 0;
}

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
  let skipped = 0;
  
  for (const creator of creators) {
    try {
      // Check for duplicate by name
      if (creatorExistsByName(creator.name)) {
        console.log(`  Skipping duplicate creator: ${creator.name}`);
        skipped++;
        continue;
      }
      
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
  
  console.log(`Migrated ${count} creators (${skipped} duplicates skipped)`);
}

function migrateAds() {
  console.log('\n--- Migrating Ads ---');
  const ads = loadJsonFile('ads.json');
  let count = 0;
  let skipped = 0;
  
  for (const ad of ads) {
    try {
      // Check for duplicate by name
      if (adExistsByName(ad.name)) {
        console.log(`  Skipping duplicate ad: ${ad.name}`);
        skipped++;
        continue;
      }
      
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
  
  console.log(`Migrated ${count} ads (${skipped} duplicates skipped)`);
}

function migrateSuggestions() {
  console.log('\n--- Migrating Suggestions (as pending creators) ---');
  const suggestions = loadJsonFile('suggestions.json');
  let count = 0;
  let skipped = 0;
  
  for (const suggestion of suggestions) {
    try {
      // Check for duplicate (already exists as live creator or pending suggestion)
      if (creatorExistsByName(suggestion.name) || pendingCreatorExistsByName(suggestion.name)) {
        console.log(`  Skipping duplicate suggestion: ${suggestion.name}`);
        skipped++;
        continue;
      }
      
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
  
  console.log(`Migrated ${count} suggestions as pending creators (${skipped} duplicates skipped)`);
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
  let skipped = 0;
  
  for (const faq of faqItems) {
    try {
      // Check for duplicate by question
      if (faqExistsByQuestion(faq.question)) {
        console.log(`  Skipping duplicate FAQ: ${faq.question.substring(0, 50)}...`);
        skipped++;
        continue;
      }
      
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
  
  console.log(`Migrated ${count} FAQ items (${skipped} duplicates skipped)`);
}

function runMigration() {
  console.log('===========================================');
  console.log('Starting JSON to SQLite Migration');
  console.log('===========================================');
  
  // Initialize database schema
  initializeDatabase();
  
  // Check if we already have data (informational only)
  const existingCreators = db.prepare('SELECT COUNT(*) as count FROM creators').get();
  if (existingCreators.count > 0) {
    console.log('\nNote: Database already contains data.');
    console.log(`Found ${existingCreators.count} existing creators.`);
    console.log('Duplicate entries will be skipped automatically.\n');
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
