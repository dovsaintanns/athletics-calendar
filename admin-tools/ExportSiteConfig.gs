/**
 * Export site config: adds a "Site tools" menu to the athletics admin console Sheet.
 *
 * "Export site config" reads the Teams and Settings tabs, checks them for mistakes, and produces TWO
 * files for the public calendar page: config.js (the team list and settings) and links.html (a plain
 * list of every subscribe link, no JavaScript needed). Teams are grouped into High School and Middle
 * School from their names (or from an optional "Division" column on the Teams tab). They are always generated together from the
 * same data, so replace both whenever you replace either. Nothing is published or changed by this
 * script: it only reads the Sheet and shows text. You copy or download the files and upload them.
 *
 * SETUP (once):
 *   1. In the Sheet: Extensions > Apps Script. Add a new file and paste this whole file in.
 *   2. This project may already have an onOpen() function. If it does, add the line
 *          siteCfgAddMenu();
 *      inside it. If it does not, add this to the file:
 *          function onOpen() { siteCfgAddMenu(); }
 *   3. Paste the restricted Google Calendar API key between the quotes below (it is not secret:
 *      it is visible on the public page, and is limited by website and by API).
 *   4. Save, reload the Sheet, and use Site tools > Export site config.
 */

var SITECFG_API_KEY = '';

var SITECFG_TEAMS_TAB = 'Teams';
var SITECFG_SETTINGS_TAB = 'Settings';

function siteCfgAddMenu() {
  SpreadsheetApp.getUi()
    .createMenu('Site tools')
    .addItem('Export site config', 'siteCfgExport')
    .addToUi();
}

function siteCfgExport() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamsSheet = ss.getSheetByName(SITECFG_TEAMS_TAB);
  var settingsSheet = ss.getSheetByName(SITECFG_SETTINGS_TAB);
  if (!teamsSheet || !settingsSheet) {
    ui.alert('Could not find a tab named "' + SITECFG_TEAMS_TAB + '" and one named "' + SITECFG_SETTINGS_TAB + '".');
    return;
  }
  var today = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
  var result = siteCfgBuild_(
    teamsSheet.getDataRange().getValues(),
    settingsSheet.getDataRange().getValues().slice(1),
    SITECFG_API_KEY,
    today
  );

  var html = '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.4">';
  if (result.errors.length) {
    html += '<p style="color:#7a2020;font-weight:bold">Fix these in the Sheet, then export again:</p><ul>' +
      result.errors.map(function (e) { return '<li>' + siteCfgEsc_(e) + '</li>'; }).join('') + '</ul>';
  }
  if (result.warnings.length) {
    html += '<p style="color:#8a5a00;font-weight:bold">Worth a look:</p><ul>' +
      result.warnings.map(function (w) { return '<li>' + siteCfgEsc_(w) + '</li>'; }).join('') + '</ul>';
  }
  if (!result.errors.length) {
    html += '<p><b>Both files are ready.</b> Always replace them together: copy or download each one, ' +
      'put them in the site folder (replacing the old ones), then commit and push or upload.</p>' +
      siteCfgFileBlock_('config.js', 'cfg', result.config) +
      siteCfgFileBlock_('links.html', 'lnk', result.links) +
      '<script>' +
      'function cp(id,b){var t=document.getElementById(id);t.select();document.execCommand("copy");' +
      'var o=b.textContent;b.textContent="Copied";setTimeout(function(){b.textContent=o},1800)}' +
      'function dl(id,name){var t=document.getElementById(id).value;' +
      'var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"}));' +
      'a.download=name;document.body.appendChild(a);a.click();a.remove()}' +
      '</script>';
  }
  html += '</div>';
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(760).setHeight(result.errors.length ? 420 : 680),
    'Export site config');
}

function siteCfgEsc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function siteCfgFileBlock_(filename, id, content) {
  return '<h3 style="margin:14px 0 4px">' + filename + '</h3>' +
    '<textarea id="' + id + '" readonly style="width:100%;height:150px;font-family:monospace;font-size:12px">' +
    siteCfgEsc_(content) + '</textarea>' +
    '<p style="margin:4px 0"><button onclick="cp(\'' + id + '\',this)">Copy</button> ' +
    '<button onclick="dl(\'' + id + '\',\'' + filename + '\')">Download</button></p>';
}

/**
 * Pure function (no Sheet access) so it can be tested: turns Sheet values into config.js text.
 * teamValues: all values of the Teams tab including the header row.
 * settingValues: rows of the Settings tab without its header row.
 */
function siteCfgBuild_(teamValues, settingValues, apiKey, today) {
  var errors = [];
  var warnings = [];

  /* ----- settings ----- */
  var raw = {};
  settingValues.forEach(function (r) {
    var k = String(r[0] == null ? '' : r[0]).trim().toLowerCase();
    if (k) raw[k] = r[1];
  });
  function has(name) { return Object.prototype.hasOwnProperty.call(raw, name.toLowerCase()); }
  function text(name, dflt) {
    if (!has(name)) return dflt;
    var v = raw[name.toLowerCase()];
    var s = (v == null) ? '' : String(v).trim();
    return s === '' ? dflt : s;
  }
  function blankable(name, dflt) { // a blank cell means "none", a missing row means the default
    if (!has(name)) return dflt;
    var v = raw[name.toLowerCase()];
    return (v == null) ? '' : String(v).trim();
  }
  function whole(name, dflt) {
    var s = text(name, String(dflt));
    var n = Number(s);
    if (!isFinite(n) || n < 0 || Math.floor(n) !== n) {
      errors.push('Settings: "' + name + '" must be a whole number (got "' + s + '").');
      return dflt;
    }
    return n;
  }

  var settings = {
    pageTitle: text('Page Title', "Saint Ann's Athletics Calendar"),
    introText: blankable('Intro Text', ''),
    defaultTeams: blankable('Default Teams', 'ALL'),
    defaultEventType: text('Default Event Type', 'games').toLowerCase(),
    defaultView: text('Default View', 'list').toLowerCase(),
    timeZone: text('Time Zone', 'America/New_York'),
    daysBack: whole('Days Back', 60),
    daysAhead: whole('Days Ahead', 365),
    accentColor: text('Accent Color', '#234e70'),
    feedName: text('Feed Name', "Saint Ann's Athletics"),
    contactText: blankable('Contact Text', ''),
    contactEmail: blankable('Contact Email', ''),
    footerNote: blankable('Footer Note', '')
  };

  if (settings.defaultEventType !== 'games' && settings.defaultEventType !== 'all') {
    errors.push('Settings: "Default Event Type" must be games or all.');
  }
  if (settings.defaultView !== 'list' && settings.defaultView !== 'month') {
    errors.push('Settings: "Default View" must be list or month.');
  }
  if (!/^#[0-9a-f]{3,8}$/i.test(settings.accentColor)) {
    errors.push('Settings: "Accent Color" must be a hex color like #234e70.');
  }
  if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
    errors.push('Settings: "Contact Email" does not look like an email address.');
  }
  if (typeof Intl !== 'undefined') {
    try { new Intl.DateTimeFormat('en-US', { timeZone: settings.timeZone }); }
    catch (e) { errors.push('Settings: "Time Zone" is not a recognized zone (got "' + settings.timeZone + '").'); }
  }

  /* ----- teams ----- */
  var errorsBeforeCols = errors.length;
  var header = (teamValues[0] || []).map(function (h) { return String(h).trim().toLowerCase(); });
  function col(prefix, required) {
    for (var i = 0; i < header.length; i++) if (header[i].indexOf(prefix) === 0) return i;
    if (required) errors.push('Teams: could not find a column starting with "' + prefix + '".');
    return -1;
  }
  var cActive = col('active', true), cSport = col('sport', true), cName = col('team name', true),
      cSeason = col('season', false), cGames = col('games calendar id', true),
      cAll = col('all events calendar id', true), cColor = col('color', false),
      cId = col('id', false), cStatus = col('status', false), cDivision = col('division', false);

  var teams = [];
  if (errors.length === errorsBeforeCols) {
    var seenIds = {};
    var seenCals = {};
    for (var r = 1; r < teamValues.length; r++) {
      var row = teamValues[r];
      var cell = function (c) { return c < 0 || row[c] == null ? '' : String(row[c]).trim(); };
      var name = cell(cName);
      if (!name) continue;
      var rowNo = r + 1;
      var activeVal = cActive < 0 ? false : row[cActive];
      var active = activeVal === true || String(activeVal).trim().toUpperCase() === 'TRUE';
      var id = cell(cId) || siteCfgSlug_(name);
      var team = {
        id: id, active: active, sport: cell(cSport), name: name, season: cell(cSeason),
        division: siteCfgDivision_(name, cell(cDivision)),
        color: cell(cColor), gamesCalId: cell(cGames), allCalId: cell(cAll)
      };
      var label = 'Teams row ' + rowNo + ' (' + name + ')';

      if (seenIds[id]) errors.push(label + ': the ID "' + id + '" is already used by row ' + seenIds[id] + '.');
      seenIds[id] = rowNo;
      if (team.color && !/^#[0-9a-f]{3,8}$/i.test(team.color)) errors.push(label + ': color must be a hex value like #1f5f8b.');

      if (active) {
        if (team.division === 'Other') warnings.push(label + ': could not tell High School from Middle School from the name, so it is listed under "Other". Rename it (for example include Varsity, JV, or 6th/7th/8th) or add a "Division" column to the Teams tab and fill it in.');
        if (!team.sport) errors.push(label + ': Sport / Group is blank.');
        ['gamesCalId', 'allCalId'].forEach(function (f) {
          var v = team[f];
          var what = f === 'gamesCalId' ? 'Games Calendar ID' : 'All Events Calendar ID';
          if (!v) errors.push(label + ': ' + what + ' is blank.');
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push(label + ': ' + what + ' does not look like a calendar ID.');
          else {
            if (seenCals[v] && seenCals[v] !== name) warnings.push(label + ': ' + what + ' is also used by ' + seenCals[v] + '.');
            seenCals[v] = name;
          }
        });
        if (team.gamesCalId && team.gamesCalId === team.allCalId) {
          warnings.push(label + ': the games and all-events calendars are the same, so the "Show" choice will make no difference for this team.');
        }
        var status = cell(cStatus);
        if (status && (!/^OK/i.test(status) || /private|not public/i.test(status))) {
          warnings.push(label + ': Status column says "' + status + '". The public page needs both calendars to be public.');
        }
      }
      teams.push(team);
    }
  }

  teams = siteCfgSort_(teams);
  var activeTeams = teams.filter(function (t) { return t.active; });
  if (!activeTeams.length && errors.length === errorsBeforeCols) errors.push('Teams: no team is marked Active.');

  var dt = settings.defaultTeams;
  if (dt && dt.toUpperCase() !== 'ALL') {
    dt.split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (tid) {
      var match = teams.filter(function (t) { return t.id === tid; })[0];
      if (!match) errors.push('Settings: "Default Teams" lists "' + tid + '", which is not a team ID on the Teams tab.');
      else if (!match.active) warnings.push('Settings: "Default Teams" lists "' + tid + '", which is not Active, so it will not be selected.');
    });
  }
  if (!apiKey) warnings.push('No API key is set in the script (SITECFG_API_KEY), so the page will show sample events instead of real ones.');

  if (errors.length) return { config: '', links: '', errors: errors, warnings: warnings };
  return {
    config: siteCfgRender_(apiKey, settings, teams, today),
    links: siteCfgRenderLinks_(settings, teams, today),
    errors: errors, warnings: warnings
  };
}

/**
 * Division: High School (Varsity, JV, 9th-12th) or Middle School (6th-8th). A "Division" column on
 * the Teams tab, if present and filled in, always wins over the name.
 */
function siteCfgDivision_(name, raw) {
  var d = String(raw || '').trim();
  if (d) {
    var l = d.toLowerCase();
    if (/^(hs|high school|upper school|us)$/.test(l)) return 'High School';
    if (/^(ms|middle school)$/.test(l)) return 'Middle School';
    return d;
  }
  var n = String(name || '');
  if (/\b(varsity|jv|junior varsity|freshman|frosh|9th|10th|11th|12th)\b/i.test(n)) return 'High School';
  if (/\b(6th|7th|8th|sixth|seventh|eighth)\b|middle school|\bms\b/i.test(n)) return 'Middle School';
  return 'Other';
}

function siteCfgGender_(name) {
  var n = String(name || '').toLowerCase();
  if (/\b(girls?|women'?s?|female)\b/.test(n)) return 1;
  if (/\b(boys?|men'?s?|male)\b/.test(n)) return 0;
  if (/\b(co-?ed|mixed)\b/.test(n)) return 2;
  return 3;
}

function siteCfgLevel_(name) {
  var n = String(name || '').toLowerCase();
  if (/\b(jv|junior varsity)\b/.test(n)) return 1;
  if (/\bvarsity\b/.test(n)) return 0;
  if (/\b(freshman|frosh|9th|10th|11th|12th)\b/.test(n)) return 2;
  if (/7(th)?\s*(\/|&|and|-)\s*8(th)?/.test(n)) return 6;
  if (/\b(6th|sixth)\b/.test(n)) return 3;
  if (/\b(7th|seventh)\b/.test(n)) return 4;
  if (/\b(8th|eighth)\b/.test(n)) return 5;
  if (/middle school/.test(n)) return 7;
  return 9;
}

/**
 * Display order: High School, then Middle School, then anything else; sports A to Z within a division;
 * boys, then girls, then other; then Varsity, JV, 6th, 7th, 8th, 7th/8th; then the Sheet's own order.
 */
function siteCfgSort_(teams) {
  function divRank(d) { return d === 'High School' ? 0 : d === 'Middle School' ? 1 : d === 'Other' ? 3 : 2; }
  function cmp(a, b) { a = String(a).toLowerCase(); b = String(b).toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }
  var indexed = teams.map(function (t, i) { return { t: t, i: i }; });
  indexed.sort(function (x, y) {
    var A = x.t, B = y.t;
    return (divRank(A.division) - divRank(B.division)) ||
      cmp(A.division, B.division) ||
      cmp(A.sport, B.sport) ||
      (siteCfgGender_(A.name) - siteCfgGender_(B.name)) ||
      (siteCfgLevel_(A.name) - siteCfgLevel_(B.name)) ||
      (x.i - y.i);
  });
  return indexed.map(function (x) { return x.t; });
}

function siteCfgSlug_(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function siteCfgRender_(apiKey, settings, teams, today) {
  var q = JSON.stringify;
  var out = [];
  out.push('/*');
  out.push(' * Saint Ann\'s Athletics Calendar: configuration');
  out.push(' *');
  out.push(' * GENERATED from the athletics admin console Sheet on ' + today + ' (Site tools > Export site config).');
  out.push(' * Change teams and settings in the Sheet and export again; edits made here will be overwritten.');
  out.push(' *');
  out.push(' *  - apiKey:   a read-only Google Calendar API key (restricted by website and by API).');
  out.push(' *  - settings: wording, defaults and limits for the page.');
  out.push(' *  - teams:    one entry per team, already in display order (division, sport, boys then girls, level).');
  out.push(' *              "active: false" hides a team from the page.');
  out.push(' *');
  out.push(' * Calendar IDs are not secret: they belong to public calendars.');
  out.push(' */');
  out.push('window.SA_CONFIG = {');
  out.push('  apiKey: ' + q(apiKey || '') + ',');
  out.push('');
  out.push('  settings: {');
  var lines = [
    ['pageTitle', settings.pageTitle], ['introText', settings.introText],
    ['defaultTeams', settings.defaultTeams], ['defaultEventType', settings.defaultEventType],
    ['defaultView', settings.defaultView], ['timeZone', settings.timeZone],
    ['daysBack', settings.daysBack], ['daysAhead', settings.daysAhead],
    ['accentColor', settings.accentColor], ['feedName', settings.feedName],
    ['contactText', settings.contactText], ['contactEmail', settings.contactEmail],
    ['footerNote', settings.footerNote]
  ];
  lines.forEach(function (kv, i) {
    out.push('    ' + kv[0] + ': ' + q(kv[1]) + (i < lines.length - 1 ? ',' : ''));
  });
  out.push('  },');
  out.push('');
  out.push('  teams: [');
  teams.forEach(function (t, i) {
    var first = '      id: ' + q(t.id) + ', active: ' + (t.active ? 'true' : 'false') + ', division: ' + q(t.division) +
      ', sport: ' + q(t.sport) + ', name: ' + q(t.name) + ', season: ' + q(t.season) +
      (t.color ? ', color: ' + q(t.color) : '') + ',';
    out.push('    {');
    out.push(first);
    out.push('      gamesCalId: ' + q(t.gamesCalId) + ',');
    out.push('      allCalId: ' + q(t.allCalId));
    out.push('    }' + (i < teams.length - 1 ? ',' : ''));
  });
  out.push('  ]');
  out.push('};');
  out.push('');
  return out.join('\n');
}

/** links.html: every active team's subscribe links as plain HTML, with no JavaScript. */
function siteCfgRenderLinks_(settings, teams, today) {
  function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ics(id) { return 'https://calendar.google.com/calendar/ical/' + encodeURIComponent(id) + '/public/basic.ics'; }
  function web(id) { return ics(id).replace(/^https:/, 'webcal:'); }
  function gcal(id) { return 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(id); }

  var active = teams.filter(function (t) { return t.active; });
  var divisions = [];
  active.forEach(function (t) { if (divisions.indexOf(t.division) < 0) divisions.push(t.division); });

  function group(label, id) {
    return '<li><strong>' + label + ':</strong> <a href="' + esc(gcal(id)) + '">Google Calendar</a>, ' +
      '<a href="' + esc(web(id)) + '">Apple Calendar or Outlook</a>, ' +
      '<a href="' + esc(ics(id)) + '">calendar file (.ics)</a></li>';
  }

  var body = divisions.map(function (div) {
    var inDiv = active.filter(function (t) { return t.division === div; });
    var sports = [];
    inDiv.forEach(function (t) { if (sports.indexOf(t.sport) < 0) sports.push(t.sport); });
    var sportBlocks = sports.map(function (sport) {
      var rows = inDiv.filter(function (t) { return t.sport === sport; }).map(function (t) {
        return '<section><h4>' + esc(t.name) + '</h4><ul>' +
          group('Games and matches only', t.gamesCalId) +
          group('Games, practices and meetings', t.allCalId) +
          '</ul></section>';
      }).join('\n');
      return '<h3>' + esc(sport) + '</h3>\n' + rows;
    }).join('\n');
    return '<h2>' + esc(div) + '</h2>\n' + sportBlocks;
  }).join('\n');

  return '<!doctype html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<!-- Generated from the athletics admin console Sheet on ' + today + '. Do not edit by hand; export again. -->\n' +
'<title>Subscribe links: ' + esc(settings.pageTitle) + '</title>\n' +
'<style>\n' +
'  body { font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #17212b; max-width: 46rem; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }\n' +
'  h1 { font-family: Georgia, serif; color: ' + esc(settings.accentColor) + '; margin-bottom: .25rem; }\n' +
'  h2 { margin-top: 2rem; border-bottom: 2px solid ' + esc(settings.accentColor) + '; padding-bottom: .25rem; }\n' +
'  h3 { margin: 1.5rem 0 0; font-size: 1.15rem; }\n' +
'  h4 { margin: 1rem 0 .25rem; font-size: 1rem; }\n' +
'  ul { margin: 0; padding-left: 1.25rem; }\n' +
'  a { color: ' + esc(settings.accentColor) + '; }\n' +
'  .back { margin: 0 0 1.5rem; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<h1>Subscribe links</h1>\n' +
'<p class="back"><a href="index.html">Back to the calendar</a></p>\n' +
'<p>Add a team\'s schedule to your own calendar app. Your app refreshes subscribed calendars on its own schedule, which can take several hours.</p>\n' +
body + '\n' +
'<p style="margin-top:2.5rem">' + esc(settings.footerNote || '') + '</p>\n' +
'</body>\n' +
'</html>\n';
}
