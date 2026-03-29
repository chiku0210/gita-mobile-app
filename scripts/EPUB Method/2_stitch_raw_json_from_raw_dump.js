const rawData = require('../assets/gita_raw_dump.json');

// Stitch all pages into one massive text block
const fullText = rawData.map(page => page.content).join(' ');
// Save the stitched text to a new file
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, '..', 'assets', 'gita_full_text.txt');
fs.writeFileSync(outputFile, fullText);

console.log(`Stitched text saved to ${outputFile}`);