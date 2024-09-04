const fs = require('fs')
const zl = require('zip-lib')

const makeReleaseFromDir = async (dir, fileName) => {
  const mainFolder = 'builds/'
  const dirWithFolder = mainFolder + dir

  if (!fs.existsSync(dirWithFolder)) {
    console.error('Build folder does not exist. Run `npm run build` first.')
    process.exit(1)
  }

  const zipFileName = mainFolder + `${fileName}.zip`
  const folderName = mainFolder + fileName
  const backgroundFileName = `${folderName}/background.js`

  if (fs.existsSync(zipFileName)) {
    fs.rmSync(zipFileName)
    console.log(`Deleted old ${zipFileName} file`)
  }

  fs.cpSync(dirWithFolder, folderName, { overwrite: true, recursive: true })
  console.log('Copied build to release folder')

  const backgroundFile = fs.readFileSync(backgroundFileName, 'utf8')

  const newBackgroundFile = backgroundFile.replace('IS_PRODUCTION = false', 'IS_PRODUCTION = true')

  fs.writeFileSync(backgroundFileName, newBackgroundFile)
  console.log('Changed IS_PRODUCTION to true')

  await zl.archiveFolder(folderName, zipFileName)
  console.log('Zipped release')
}

const main = async () => {
  await makeReleaseFromDir('build-firefox', 'release-firefox')
  await makeReleaseFromDir('build-chrome', 'release-chrome')
}

main()
