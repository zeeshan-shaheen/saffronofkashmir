#!/usr/bin/env node
/* Local build: regenerates the site's HTML pages + sitemap from data/site-data.json.
   Usage:  node build.js
   (The admin panel does the same thing in the browser when you click Publish.) */
const fs = require('fs');
const path = require('path');
const T = require('./assets/admin/templates.js');

const root = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/site-data.json'), 'utf8'));
const files = T.renderAll(data);

Object.keys(files).forEach(function (name) {
  fs.writeFileSync(path.join(root, name), files[name], 'utf8');
  console.log('wrote', name, '(' + files[name].length + ' bytes)');
});
console.log('Done. Open index.html to view.');
