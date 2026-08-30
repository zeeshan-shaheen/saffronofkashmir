#!/usr/bin/env node
/* Local build: regenerates the site's HTML pages + sitemap from data/site-data.json.
   Usage:  node build.js
   (The admin panel does the same thing in the browser when you click Publish.) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const tplPath = path.join(root, 'assets/admin/templates.js');
const adminPath = path.join(root, 'assets/admin/admin.js');

/* Stamp the build id into templates.js BEFORE requiring it.

   The id is the content hash of BOTH panel scripts, templates.js and admin.js,
   because admin.html loads both as ?v=<build id>. Hashing templates.js alone
   meant an admin.js-only change did not move the URL, so a cached admin.js kept
   being served. Change either file and the id changes, which busts both cached
   copies and trips the pre-publish guard.

   Each file's BUILD_ID line is normalised out before hashing, so stamping is
   idempotent: rebuilding without changing either file produces the same id and
   no diff. admin.js carries no such line today; the normalisation is applied to
   both so that adding one later cannot introduce a circular hash.

   See the 29 Aug 2026 incident in docs/RESUME.md. */
const STAMP_RE = /var BUILD_ID = '[^']*';/;
const original = fs.readFileSync(tplPath, 'utf8');
if (!STAMP_RE.test(original)) {
  console.error('build.js: templates.js has no BUILD_ID line to stamp. Aborting.');
  process.exit(1);
}
const normalised = original.replace(STAMP_RE, "var BUILD_ID = '';");

/* Hash LF-normalised content. .gitattributes stores LF but checks out CRLF on
   Windows, so hashing raw bytes would give a different id per platform and CI
   on Linux would fail against an id generated on Windows. */
function forHash(src) {
  return src.replace(STAMP_RE, "var BUILD_ID = '';").replace(/\r\n/g, '\n');
}
const hashInput = forHash(normalised) + '\n--\n' + forHash(fs.readFileSync(adminPath, 'utf8'));
const buildId = crypto.createHash('sha256').update(hashInput, 'utf8').digest('hex').slice(0, 12);
const stamped = normalised.replace(STAMP_RE, "var BUILD_ID = '" + buildId + "';");
if (stamped !== original) {
  fs.writeFileSync(tplPath, stamped, 'utf8');
  console.log('stamped BUILD_ID', buildId, 'into templates.js');
} else {
  console.log('BUILD_ID unchanged:', buildId);
}

const T = require('./assets/admin/templates.js');
if (T.BUILD_ID !== buildId) {
  console.error('build.js: BUILD_ID mismatch after stamping. Aborting.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/site-data.json'), 'utf8'));
const files = T.renderAll(data);

Object.keys(files).forEach(function (name) {
  const dest = path.join(root, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, files[name], 'utf8');
  console.log('wrote', name, '(' + files[name].length + ' bytes)');
});
console.log('Done. Open index.html to view.');
