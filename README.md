# Sisu Course Reviewer

## System & Software Requirements for Development

Tested on following, but will probably work on other versions as well (e.g. Linux):

- Windows 11 Home 23H2
- Node v20.11.0 & npm 10.8.2

## Installing dependencies

```
npm install
```

## Development

Continuously make development build to `builds/build-{platform}`:

```
npm run dev
```

Continuously make release build to `builds/release-{platform}` & `builds/release-{platform}.zip`:

```
npm run dev-release
```

## Production

Make production build to `builds/release-{platform}` & `builds/release-{platform}.zip`:

```
npm run make-release
```
