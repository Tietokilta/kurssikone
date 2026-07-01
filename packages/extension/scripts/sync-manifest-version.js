const fs = require('fs')
const path = require('path')

const version = process.argv[2]

if (!version) {
  console.error('Usage: node sync-manifest-version.js <version>')
  process.exit(1)
}

const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

manifest.version = version

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Updated manifest.json version to ${version}`)
