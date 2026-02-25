const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '..', 'node_modules', 'baileys', 'lib', 'Socket', 'messages-send.js');

const plaintextFixedSnippet = `tag: 'plaintext',
                    attrs: extraAttrs,
                    content: bytes`;

const plaintextLegacyFixedSnippet = `tag: 'plaintext',
                    attrs: { ...extraAttrs },
                    content: bytes`;

const plaintextBuggySnippet = `tag: 'plaintext',
                    attrs: {},
                    content: bytes`;

const newsletterStanzaExpectedSnippet = `attrs: {
                        to: jid,
                        id: msgId,
                        type: getMessageType(message),
                        ...(additionalAttributes || {})
                    },`;

const newsletterStanzaBuggySnippet = `attrs: {
                        to: jid,
                        id: msgId,
                        type: getMessageType(message),
                        ...extraAttrs,
                        ...(additionalAttributes || {})
                    },`;

if (!fs.existsSync(targetPath)) {
  console.warn(`[patch-baileys-newsletter-media] File not found: ${targetPath}`);
  process.exit(0);
}

const source = fs.readFileSync(targetPath, 'utf8');

let patched = source;
let changed = false;

if (patched.includes(plaintextBuggySnippet)) {
  patched = patched.replace(plaintextBuggySnippet, plaintextFixedSnippet);
  changed = true;
  console.log('[patch-baileys-newsletter-media] Patched plaintext attrs from {} to extraAttrs.');
} else if (patched.includes(plaintextLegacyFixedSnippet)) {
  patched = patched.replace(plaintextLegacyFixedSnippet, plaintextFixedSnippet);
  changed = true;
  console.log('[patch-baileys-newsletter-media] Normalized plaintext attrs from spread to extraAttrs.');
} else if (patched.includes(plaintextFixedSnippet)) {
  console.log('[patch-baileys-newsletter-media] Plaintext block already patched to extraAttrs.');
} else {
  console.warn('[patch-baileys-newsletter-media] Plaintext pattern not found.');
}

if (patched.includes(newsletterStanzaBuggySnippet)) {
  patched = patched.replace(newsletterStanzaBuggySnippet, newsletterStanzaExpectedSnippet);
  changed = true;
  console.log('[patch-baileys-newsletter-media] Removed extraAttrs from newsletter stanza attrs.');
} else if (patched.includes(newsletterStanzaExpectedSnippet)) {
  console.log('[patch-baileys-newsletter-media] Newsletter stanza attrs already in expected format.');
} else {
  console.warn('[patch-baileys-newsletter-media] Newsletter stanza pattern not found.');
}

if (!changed) {
  console.log('[patch-baileys-newsletter-media] No changes applied.');
  process.exit(0);
}

fs.writeFileSync(targetPath, patched, 'utf8');
console.log('[patch-baileys-newsletter-media] Patch applied successfully.');
