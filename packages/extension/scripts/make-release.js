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

  if (fs.existsSync(zipFileName)) {
    fs.rmSync(zipFileName)
    console.log(`Deleted old ${zipFileName} file`)
  }

  fs.cpSync(dirWithFolder, folderName, { overwrite: true, recursive: true })
  console.log('Copied build to release folder')

  const backgroundFileName = `${folderName}/background.js`
  const backgroundFile = fs.readFileSync(backgroundFileName, 'utf8')
  const newBackgroundFile = backgroundFile.replace('IS_PRODUCTION = false', 'IS_PRODUCTION = true')
  fs.writeFileSync(backgroundFileName, newBackgroundFile)
  console.log('Changed IS_PRODUCTION to true')

  const manifestFileName = `${folderName}/manifest.json`
  const manifestFile = fs.readFileSync(manifestFileName, 'utf8')
  const manifestJson = JSON.parse(manifestFile)
  manifestJson.host_permissions = manifestJson.host_permissions.filter(
    (item) => !item.includes('localhost')
  )
  fs.writeFileSync(manifestFileName, JSON.stringify(manifestJson, null, 2))

  await zl.archiveFolder(folderName, zipFileName)
  console.log('Zipped release')
}

const main = async () => {
  await makeReleaseFromDir('build-firefox', 'release-firefox')
  await makeReleaseFromDir('build-chrome', 'release-chrome')
}

main()
