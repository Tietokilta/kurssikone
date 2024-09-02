const fs = require('fs')
const zl = require('zip-lib')

const makeReleaseFromDir = async (dir, fileName) => {
  if (!fs.existsSync(dir)) {
    console.error('Build folder does not exist. Run `npm run build` first.')
    process.exit(1)
  }

  if (fs.existsSync(fileName)) {
    fs.rmSync(fileName)
    console.log(`Deleted old ${fileName} file`)
  }

  fs.cpSync(dir, 'release', { overwrite: true, recursive: true })
  console.log('Copied build to temp release fpöder')

  const backgroundFile = fs.readFileSync('release/background.js', 'utf8')

  const newBackgroundFile = backgroundFile.replace('IS_PRODUCTION = false', 'IS_PRODUCTION = true')

  fs.writeFileSync('release/background.js', newBackgroundFile)
  console.log('Changed IS_PRODUCTION to true')

  await zl.archiveFolder('release', fileName)
  console.log('Zipped release')

  fs.rmSync('release', { recursive: true })
  console.log('Deleted temp release folder')
}

const main = async () => {
  await makeReleaseFromDir('build-firefox', 'firefox-release.zip')
  await makeReleaseFromDir('build-chrome', 'chrome-release.zip')
}

main()
