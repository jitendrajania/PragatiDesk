const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'jitendrajania';
const REPO_NAME = 'PragatiDesk';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.argv[2];

if (!GITHUB_TOKEN) {
  console.error('Usage: node upload_to_github.js <YOUR_GITHUB_TOKEN>');
  process.exit(1);
}

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', '.system_generated', 'logs'];
const ROOT_DIR = path.resolve(__dirname, '..');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function uploadFile(filePath, relPath, retries = 3) {
  const content = fs.readFileSync(filePath).toString('base64');
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${relPath.replace(/\\/g, '/')}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if file already exists to get SHA
      let sha = undefined;
      try {
        const checkRes = await fetch(url, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'User-Agent': 'PragatiDesk-Deployer',
            Accept: 'application/vnd.github+json',
          },
        });
        if (checkRes.ok) {
          const data = await checkRes.json();
          sha = data.sha;
        }
      } catch (e) {}

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'PragatiDesk-Deployer',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update ${relPath} for PostgreSQL migration`,
          content,
          ...(sha ? { sha } : {}),
        }),
      });

      if (res.ok) {
        console.log(`✅ Uploaded: ${relPath}`);
        return true;
      } else {
        const err = await res.text();
        console.warn(`⚠️ Attempt ${attempt} failed for ${relPath}: ${err}`);
      }
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt} network error for ${relPath}: ${err.message}`);
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  console.error(`❌ Failed permanently: ${relPath}`);
  return false;
}

async function main() {
  console.log(`🚀 Starting GitHub upload to https://github.com/${REPO_OWNER}/${REPO_NAME}...`);
  const allFiles = getAllFiles(ROOT_DIR);
  console.log(`📁 Found ${allFiles.length} source code files to upload (node_modules excluded).`);

  let successCount = 0;
  for (const file of allFiles) {
    const rel = path.relative(ROOT_DIR, file);
    const ok = await uploadFile(file, rel);
    if (ok) successCount++;
    await new Promise((r) => setTimeout(r, 200)); // gentle pacing to avoid rate limit
  }

  console.log(`🎉 ${successCount}/${allFiles.length} files uploaded successfully to GitHub!`);
}

main().catch(console.error);
