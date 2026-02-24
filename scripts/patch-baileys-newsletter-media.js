const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '..', 'node_modules', 'baileys', 'lib', 'Socket', 'messages-send.js');

const buggySnippet = `tag: 'plaintext',
                    attrs: {},
                    content: bytes`;

const fixedSnippet = `tag: 'plaintext',
                    attrs: { ...extraAttrs },
                    content: bytes`;

if (!fs.existsSync(targetPath)) {
  console.warn(`[patch-baileys-newsletter-media] File not found: ${targetPath}`);
  process.exit(0);
}

const source = fs.readFileSync(targetPath, 'utf8');

if (source.includes(fixedSnippet)) {
  console.log('[patch-baileys-newsletter-media] Already patched.');
  process.exit(0);
}

if (!source.includes(buggySnippet)) {
  console.warn('[patch-baileys-newsletter-media] Pattern not found. No changes applied.');
  process.exit(0);
}

const patched = source.replace(buggySnippet, fixedSnippet);
fs.writeFileSync(targetPath, patched, 'utf8');
console.log('[patch-baileys-newsletter-media] Patch applied successfully.');
