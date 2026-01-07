# Kurssikompassi

## System & Software Requirements for Development

Tested on following, but will probably work on other versions as well (e.g. Linux):

- Windows 11 Home 23H2
- Node v20.11.0 & npm 10.8.2

## Installing dependencies

```
npm install
```

## Building & testing the extension

You can make a release build (connects to an external backend) of the extension by running

```
npm run make-release
```

The extension will be built in the `builds` folder as `release-{platform}` and `release-{platform}.zip`.

## Seeing extension in action

This extension works on Aalto University's Sisu website.

You see the search result ratings by going to https://sisu.aalto.fi/student/search/main, and searching for courses.
You can see and make reviews by selecting a course from the afformentioned search, and going to the "Reviews" tab. E.g. [here](https://sisu.aalto.fi/student/courseunit/aalto-CU-1150973070-20240801/brochure).
