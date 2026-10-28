#!/usr/bin/env node
/*
 * Builds links.html: a plain list of every active team's subscribe links, with no JavaScript.
 * It is the fallback for anyone whose browser blocks scripts, or if the calendar viewer is ever down.
 *
 * Run after editing config.js:   node tools/make-links.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), sandbox);
const C = sandbox.window.SA_CONFIG;
const S = C.settings;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ics = (id) => `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
const web = (id) => ics(id).replace(/^https:/, 'webcal:');
const gcal = (id) => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(id)}`;

const active = C.teams.filter((t) => t.active);
const sports = [...new Set(active.map((t) => t.sport))];

const group = (label, id) =>
  `<li><strong>${label}:</strong> <a href="${esc(gcal(id))}">Google Calendar</a>, ` +
  `<a href="${esc(web(id))}">Apple Calendar or Outlook</a>, ` +
  `<a href="${esc(ics(id))}">calendar file (.ics)</a></li>`;

const body = sports.map((sport) => {
  const rows = active.filter((t) => t.sport === sport).map((t) =>
    `<section><h3>${esc(t.name)}</h3><ul>` +
    group('Games and matches only', t.gamesCalId) +
    group('Games, practices and meetings', t.allCalId) +
    `</ul></section>`).join('\n');
  return `<h2>${esc(sport)}</h2>\n${rows}`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subscribe links: ${esc(S.pageTitle)}</title>
<style>
  body { font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #17212b; max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
  h1 { font-family: Georgia, serif; color: ${esc(S.accentColor)}; margin-bottom: .25rem; }
  h2 { margin-top: 2rem; border-bottom: 2px solid ${esc(S.accentColor)}; padding-bottom: .25rem; }
  h3 { margin: 1.25rem 0 .25rem; font-size: 1.05rem; }
  ul { margin: 0; padding-left: 1.25rem; }
  a { color: ${esc(S.accentColor)}; }
  .back { margin: 0 0 1.5rem; }
</style>
</head>
<body>
<h1>Subscribe links</h1>
<p class="back"><a href="index.html">Back to the calendar</a></p>
<p>Add a team's schedule to your own calendar app. Your app refreshes subscribed calendars on its own schedule, which can take several hours.</p>
${body}
<p style="margin-top:2.5rem">${esc(S.footerNote || '')}</p>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'links.html'), html);
console.log(`links.html written: ${active.length} teams in ${sports.length} sports`);
