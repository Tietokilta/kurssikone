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

  fs.rmSync('builds/build-firefox/manifest.json', { recursive: true })
  fs.rmSync('builds/build-firefox/manifest-chrome.json', { recursive: true })
  fs.rmSync('builds/build-firefox/manifest-firefox.json', { recursive: true })

  fs.rmSync('builds/build-chrome/manifest.json', { recursive: true })
  fs.rmSync('builds/build-chrome/manifest-chrome.json', { recursive: true })
  fs.rmSync('builds/build-chrome/manifest-firefox.json', { recursive: true })

  const manifestFirefoxExtra = JSON.parse(fs.readFileSync('./build/manifest-firefox.json', 'utf8'))
  const manifestChromeExtra = JSON.parse(fs.readFileSync('./build/manifest-chrome.json', 'utf8'))
  const manifestCommon = JSON.parse(fs.readFileSync('./build/manifest.json', 'utf8'))

  fs.rmSync('build', { recursive: true })

  const manifestFirefox = { ...manifestCommon, ...manifestFirefoxExtra }
  const manifestChrome = { ...manifestCommon, ...manifestChromeExtra }

  fs.writeFileSync('builds/build-firefox/manifest.json', JSON.stringify(manifestFirefox, null, 2))
  fs.writeFileSync('builds/build-chrome/manifest.json', JSON.stringify(manifestChrome, null, 2))

  console.log('Combined manifest files')
}

module.exports = { renameManifestFiles }
