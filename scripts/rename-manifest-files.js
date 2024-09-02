const fs = require('fs')

const renameManifestFiles = async () => {
  if (!fs.existsSync('build')) {
    console.error('Build folder does not exist. Run `npm run build` first.')
    process.exit(1)
  }

  fs.cpSync('build', 'build-firefox', { overwrite: true, recursive: true })
  fs.cpSync('build', 'build-chrome', { overwrite: true, recursive: true })
  fs.rmSync('build', { recursive: true })

  console.log('Copied build to folders')

  fs.renameSync('./build-firefox/manifest-firefox.json', './build-firefox/manifest.json')
  fs.rmSync('./build-firefox/manifest-chrome.json')

  fs.renameSync('./build-chrome/manifest-chrome.json', './build-chrome/manifest.json')
  fs.rmSync('./build-chrome/manifest-firefox.json')

  console.log('Renamed manifest files')
}

module.exports = { renameManifestFiles }
