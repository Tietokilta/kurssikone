import path from 'path'

const pathToExtension = path.join(process.cwd(), 'builds/build-chrome')

const settings = {
  launch: {
    headless: false,
    product: 'chrome',
    args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
  },
}

export default settings
