// Keep this entry point free of third-party dependencies. During an update,
// the installer can still be replacing app.asar.unpacked when a shortcut opens.
const {app,dialog}=require('electron');
require('./startup-guard.cjs').launchApplication({app,dialog,load:()=>require('./main.cjs')});
