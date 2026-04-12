const fs = require('fs/promises');
const path = require('path');

const db = require('./database');

const creatorsDir = path.join(__dirname, '..', 'public', 'images', 'creators');
const defaultMappingPath = path.join(__dirname, '..', 'data', 'creator-image-mapping.json');

function parseArgs(argv) {
  const options = {
    dryRun: false,
    dbOnly: false,
    mappingPath: null,
    fromMappingPath: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--db-only') {
      options.dbOnly = true;
      continue;
    }

    if (arg === '--write-mapping') {
      options.mappingPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--write-mapping=')) {
      options.mappingPath = arg.split('=')[1];
      continue;
    }

    if (arg === '--from-mapping') {
      options.fromMappingPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--from-mapping=')) {
      options.fromMappingPath = arg.split('=')[1];
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.dbOnly && !options.fromMappingPath) {
    throw new Error('--db-only requires --from-mapping <path>');
  }

  return options;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node db/mirror-creator-images.js');
  console.log('  node db/mirror-creator-images.js --dry-run');
  console.log('  node db/mirror-creator-images.js --write-mapping data/creator-image-mapping.json');
  console.log('  node db/mirror-creator-images.js --from-mapping data/creator-image-mapping.json --db-only');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function extensionFromContentType(contentType) {
  const normalizedType = String(contentType || '').split(';')[0].trim().toLowerCase();

  switch (normalizedType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/avif':
      return '.avif';
    default:
      return '';
  }
}

function extensionFromUrl(imageUrl) {
  try {
    const pathname = new URL(imageUrl).pathname;
    const ext = path.extname(pathname).toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
  } catch (error) {
    return '';
  }

  return '';
}

function buildLocalImageInfo(creator, contentType) {
  const extension = extensionFromContentType(contentType) || extensionFromUrl(creator.image) || '.jpg';
  const fileName = `${slugify(creator.name) || creator.id}${extension}`;

  return {
    fileName,
    filePath: path.join(creatorsDir, fileName),
    localPath: `images/creators/${fileName}`
  };
}

function toMappingEntry(creator, localInfo) {
  return {
    id: creator.id,
    name: creator.name,
    remoteImage: creator.image,
    localPath: localInfo.localPath,
    fileName: localInfo.fileName
  };
}

async function writeMappingFile(mappingPath, entries) {
  const resolvedPath = path.resolve(mappingPath);
  const payload = {
    generatedAt: new Date().toISOString(),
    entries
  };

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`);

  return resolvedPath;
}

async function readMappingFile(mappingPath) {
  const resolvedPath = path.resolve(mappingPath);
  const raw = await fs.readFile(resolvedPath, 'utf8');
  const payload = JSON.parse(raw);
  const entries = Array.isArray(payload) ? payload : payload.entries;

  if (!Array.isArray(entries)) {
    throw new Error('Mapping file must contain an array or an entries array');
  }

  return {
    resolvedPath,
    entries
  };
}

async function downloadCreatorImage(creator) {
  const response = await fetch(creator.image, {
    headers: {
      'User-Agent': 'forkedfromltt-image-mirror/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const localInfo = buildLocalImageInfo(creator, response.headers.get('content-type'));
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(localInfo.filePath, imageBuffer);

  return localInfo;
}

function updateCreatorImagePath(creator, localPath) {
  db.updateCreator(creator.id, {
    ...creator,
    image: localPath
  });
}

async function mirrorRemoteImages(options) {
  const creators = db.getAllCreators();
  const remoteCreators = creators.filter((creator) => creator.image && /^https?:\/\//i.test(creator.image));

  if (remoteCreators.length === 0) {
    console.log('No remote creator images found.');
    return { successes: [], failures: [], entries: [] };
  }

  if (!options.dryRun) {
    await fs.mkdir(creatorsDir, { recursive: true });
  }

  const successes = [];
  const failures = [];
  const entries = [];

  for (const creator of remoteCreators) {
    try {
      const localInfo = options.dryRun
        ? buildLocalImageInfo(creator)
        : await downloadCreatorImage(creator);

      const entry = toMappingEntry(creator, localInfo);
      entries.push(entry);

      if (!options.dryRun) {
        updateCreatorImagePath(creator, localInfo.localPath);
      }

      successes.push(entry);
      console.log(`${options.dryRun ? 'Planned' : 'Mirrored'} ${creator.name} -> ${localInfo.localPath}`);
    } catch (error) {
      failures.push({
        id: creator.id,
        name: creator.name,
        image: creator.image,
        error: error.message
      });
      console.error(`Failed to process ${creator.name}: ${error.message}`);
    }
  }

  return { successes, failures, entries };
}

async function applyMapping(options) {
  const { resolvedPath, entries } = await readMappingFile(options.fromMappingPath);
  const creators = db.getAllCreators();
  const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));
  const successes = [];
  const failures = [];

  for (const entry of entries) {
    const creator = creatorsById.get(entry.id);

    if (!creator) {
      failures.push({
        id: entry.id,
        name: entry.name,
        error: 'Creator not found in current database'
      });
      continue;
    }

    if (!entry.localPath) {
      failures.push({
        id: entry.id,
        name: entry.name,
        error: 'Mapping entry is missing localPath'
      });
      continue;
    }

    if (!options.dryRun) {
      updateCreatorImagePath(creator, entry.localPath);
    }

    successes.push({
      id: creator.id,
      name: creator.name,
      localPath: entry.localPath
    });
    console.log(`${options.dryRun ? 'Would update' : 'Updated'} ${creator.name} -> ${entry.localPath}`);
  }

  return {
    resolvedPath,
    successes,
    failures,
    entries
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.fromMappingPath
    ? await applyMapping(options)
    : await mirrorRemoteImages(options);

  const mappingPath = options.mappingPath || (!options.fromMappingPath ? defaultMappingPath : null);

  if (mappingPath && result.entries.length > 0) {
    const writtenPath = await writeMappingFile(mappingPath, result.entries);
    console.log(`${options.dryRun ? 'Planned' : 'Wrote'} mapping file: ${writtenPath}`);
  }

  if (options.fromMappingPath) {
    console.log(`Applied mapping source: ${path.resolve(options.fromMappingPath)}`);
  }

  console.log('');
  console.log(`${options.dryRun ? 'Planned' : 'Processed'} ${result.successes.length} creator image(s).`);

  if (result.failures.length > 0) {
    console.log(`Failed to process ${result.failures.length} creator image(s).`);
    console.log(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
