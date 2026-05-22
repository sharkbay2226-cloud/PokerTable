const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'electron', 'license.cjs');
const bak = path.join(__dirname, '..', 'electron', 'license.cjs.bak');

if (fs.existsSync(bak)) {
  fs.copyFileSync(bak, src);
  fs.unlinkSync(bak);
  console.log('Restored electron/license.cjs from backup');
}
