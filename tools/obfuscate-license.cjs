const fs = require('fs');
const path = require('path');
const obfuscator = require('javascript-obfuscator');

const src = path.join(__dirname, '..', 'electron', 'license.cjs');
const bak = path.join(__dirname, '..', 'electron', 'license.cjs.bak');
const code = fs.readFileSync(src, 'utf-8');

fs.copyFileSync(src, bak);

const result = obfuscator.obfuscate(code, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.8,
  numbersToExpressions: true,
  simplify: false,
  splitStrings: true,
  splitStringsChunkLength: 5,
});

fs.writeFileSync(src, result.getObfuscatedCode(), 'utf-8');
console.log('Obfuscated electron/license.cjs -> electron/license.cjs.bak');
