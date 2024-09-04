const fs = require('fs')

const renameManifestFiles = async () => {
  if (!fs.existsSync('builds')) {
    fs.mkdirSync('builds')
  }

  if (!fs.existsSync('build')) {
    console.error('Build folder does not exist. Run `npm run build` first.')
    process.exit(1)
  }

  fs.cpSync('build', 'builds/build-firefox', { overwrite: true, recursive: true })
  fs.cpSync('build', 'builds/build-chrome', { overwrite: true, recursive: true })
  fs.rmSync('build', { recursive: true })

  console.log('Copied build to folders')

  fs.renameSync(
    './builds/build-firefox/manifest-firefox.json',
    './builds/build-firefox/manifest.json'
  )
  fs.rmSync('./builds/build-firefox/manifest-chrome.json')

  fs.renameSync('./builds/build-chrome/manifest-chrome.json', './builds/build-chrome/manifest.json')
  fs.rmSync('./builds/build-chrome/manifest-firefox.json')

  console.log('Renamed manifest files')
}

module.exports = { renameManifestFiles }
