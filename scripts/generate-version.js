const fs = require('fs');
const path = require('path');

const version = process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
const versionData = { version };

const publicDir = path.join(__dirname, '..', 'public');
const versionFile = path.join(publicDir, 'version.json');

// Đảm bảo thư mục public tồn tại
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Ghi file version.json
fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2), 'utf8');

console.log(`✓ Generated version.json with version: ${version}`);

