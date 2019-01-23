# impressPlayer

impress.js Viewer with console etc. It is built using electron and obiously impress.js library. This app does not help you create impress.js presentations. It only helps with playing them. It can accept html and md files (markpress version)

## Building process

I use electron-builder and steps described [electron.rocks](http://electron.rocks/electron-builder-explained/)

## Known Issues

Because of some binary dependencies, you have to run this after

npm install --save-dev electron-rebuild
./node_modules/.bin/electron-rebuild
