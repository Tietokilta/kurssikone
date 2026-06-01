## Commands

To build the production code, run

```bash
npm ci
npm  run make-release
```

## Operating system & environment

This environment was used, but other are likely to work as well.

Node v22.19.0
npm 10.9.3
Windows 11 25H2

## Store texts (for Chrome and Firefox extension stores)

### Short description (forced < 132 characters by Chrome Web Store)

[The short extension description is in the "description" field of the manifest.json file](/packages/extension/public/manifest.json)

### Long description (recommended < 250 characters by Firefox Add-ons)

```
KurssiKone seamlessly integrates with Sisu (the Finnish student information system) used by Aalto University.

Features:
- Course reviews by students
- Custom timeline view
- Past exams for courses
```
