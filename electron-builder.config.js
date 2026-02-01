export default {
  appId: 'com.kingsbakery.pos',
  productName: 'The Kings Bakery POS',
  directories: {
    buildResources: 'build',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'node_modules/**/*',
    'package.json',
  ],
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
  },
  mac: {
    target: 'dmg',
    icon: 'assets/icon.icns',
  },
  linux: {
    target: 'AppImage',
    icon: 'assets/icon.png',
  },
};

