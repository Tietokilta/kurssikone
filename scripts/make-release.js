const fs = require('fs')
const zl = require('zip-lib')

const start = async () => {
  if (!fs.existsSync('build')) {
    console.error('Build folder does not exist. Run `npm run build` first.')
    process.exit(1)
  }

  if (fs.existsSync('release.zip')) {
    fs.rmSync('release.zip')
    console.log('Deleted old release.zip')
  }

  fs.cpSync('build', 'release', { overwrite: true, recursive: true })
  console.log('Copied build to temp release fpöder')

  const backgroundFile = fs.readFileSync('release/background.js', 'utf8')

  const newBackgroundFile = backgroundFile.replace('IS_PRODUCTION = false', 'IS_PRODUCTION = true')

  fs.writeFileSync('release/background.js', newBackgroundFile)
  console.log('Changed IS_PRODUCTION to true')

  await zl.archiveFolder('release', 'release.zip')
  console.log('Zipped release')

  fs.rmSync('release', { recursive: true })
  console.log('Deleted temp release folder')
}

start()
