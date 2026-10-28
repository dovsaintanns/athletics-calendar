/*
 * Saint Ann's Athletics Calendar
 *
 * What this file does, in full:
 *   1. Shows a team picker built from config.js.
 *   2. Reads events from the teams' PUBLIC Google Calendars (read-only, via the Google Calendar API).
 *   3. Hands those events to FullCalendar to draw.
 *   4. Builds subscribe links and a print header.
 *
 * What it does not do: no logins, no cookies or browser storage, no data collected or sent anywhere
 * except read requests to googleapis.com. All text from calendars is inserted as plain text.
 */
(function () {
  'use strict';

  var C = window.SA_CONFIG;
  var S = C.settings;
  var TZ = S.timeZone || 'America/New_York';
  var API_KEY = C.apiKey || '';
  var DEMO = !API_KEY;
  var DAY = 86400000;

  var PALETTE = ['#1f5f8b', '#a23b72', '#2e7d32', '#b34a12', '#6a4c93', '#00796b',
                 '#9c2f2f', '#5d6d1f', '#3b4a9e', '#8d5a00', '#455a64', '#ad1457'];

  var VIEW_FROM_SHORT = { list: 'listMonth', month: 'dayGridMonth', full: 'listFull' };
  var VIEW_TO_SHORT = { listMonth: 'list', dayGridMonth: 'month', listFull: 'full' };

  var teams = [];
  C.teams.forEach(function (t, i) {
    if (t.active) teams.push(Object.assign({}, t, { color: t.color || PALETTE[i % PALETTE.length] }));
  });
  var teamById = {};
  teams.forEach(function (t) { teamById[t.id] = t; });

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function wallClock(date) {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    var p = {};
    parts.forEach(function (x) { p[x.type] = x.value; });
    return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute + ':' + p.second;
  }

  // Calendar times are shown as the school's wall-clock time, wherever the visitor is.
  function floating(s) { return s.replace(/(Z|[+-]\d{2}:\d{2})$/, ''); }

  function tzName() { return TZ === 'America/New_York' ? 'Eastern Time' : TZ.replace(/_/g, ' '); }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /* ---------- state (kept in the page address so links can be shared) ---------- */

  var state = { teams: new Set(), type: 'games', view: 'listMonth' };

  function defaultTeamIds() {
    var d = (S.defaultTeams || '').trim();
    if (d.toUpperCase() === 'ALL') return teams.map(function (t) { return t.id; });
    if (!d) return [];
    return d.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return teamById[x]; });
  }

  function readHash() {
    var p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    var tp = p.get('teams');
    var ids = tp === null ? defaultTeamIds()
      : tp === 'none' ? []
      : tp.split(',').filter(function (x) { return teamById[x]; });
    state.teams = new Set(ids);
    var type = p.get('type');
    state.type = (type === 'all' || type === 'games') ? type : (S.defaultEventType === 'all' ? 'all' : 'games');
    var v = p.get('view');
    state.view = VIEW_FROM_SHORT[v] || VIEW_FROM_SHORT[S.defaultView] || 'listMonth';
  }

  function writeHash() {
    var ids = teams.filter(function (t) { return state.teams.has(t.id); }).map(function (t) { return t.id; });
    var p = new URLSearchParams();
    p.set('teams', ids.length ? ids.join(',') : 'none');
    p.set('type', state.type);
    p.set('view', VIEW_TO_SHORT[state.view] || 'list');
    try { history.replaceState(null, '', '#' + p.toString()); } catch (e) { /* embedded pages may not allow this */ }
  }

  function selectedTeams() {
    return teams.filter(function (t) { return state.teams.has(t.id); });
  }

  function calendarFor(team, type) {
    return (type || state.type) === 'all' ? team.allCalId : team.gamesCalId;
  }

  function typeLabel(type) {
    return (type || state.type) === 'all' ? 'games, practices and meetings' : 'games and matches';
  }

  /* ---------- page text ---------- */

  function applySettings() {
    document.title = S.pageTitle;
    $('pageTitle').textContent = S.pageTitle;
    $('introText').textContent = S.introText || '';
    if (!S.introText) $('introText').hidden = true;

    if (/^#[0-9a-f]{3,8}$/i.test(S.accentColor || '')) {
      document.documentElement.style.setProperty('--accent', S.accentColor);
    }

    var contact = $('contact');
    if (S.contactText) {
      if (S.contactEmail) {
        var a = el('a', null, S.contactText);
        a.href = 'mailto:' + S.contactEmail;
        contact.appendChild(a);
      } else {
        contact.textContent = S.contactText;
      }
    } else {
      contact.hidden = true;
    }
    $('footerNote').textContent = ((S.footerNote ? S.footerNote + ' ' : '') + 'All times are ' + tzName() + '.');
  }

  /* ---------- team picker ---------- */

  function buildTeamList() {
    var list = $('teamList');
    var groups = [];
    var bySport = {};
    teams.forEach(function (t) {
      if (!bySport[t.sport]) { bySport[t.sport] = []; groups.push(t.sport); }
      bySport[t.sport].push(t);
    });

    groups.forEach(function (sport) {
      var wrap = el('fieldset', 'group');
      var head = el('label', 'group-head');
      var gcb = el('input');
      gcb.type = 'checkbox';
      gcb.dataset.group = sport;
      head.appendChild(gcb);
      head.appendChild(el('span', null, sport));
      var legend = el('legend', 'sr-only', sport);
      wrap.appendChild(legend);
      wrap.appendChild(head);

      bySport[sport].forEach(function (t) {
        var lab = el('label', 'team');
        var cb = el('input');
        cb.type = 'checkbox';
        cb.value = t.id;
        cb.dataset.team = t.id;
        var dot = el('span', 'swatch');
        dot.style.backgroundColor = t.color;
        dot.setAttribute('aria-hidden', 'true');
        lab.appendChild(cb);
        lab.appendChild(dot);
        lab.appendChild(el('span', null, t.name));
        wrap.appendChild(lab);
      });
      list.appendChild(wrap);
    });

    list.addEventListener('change', function (e) {
      var t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.dataset.group) {
        teams.forEach(function (team) {
          if (team.sport === t.dataset.group) {
            if (t.checked) state.teams.add(team.id); else state.teams.delete(team.id);
          }
        });
      } else if (t.dataset.team) {
        if (t.checked) state.teams.add(t.dataset.team); else state.teams.delete(t.dataset.team);
      }
      selectionChanged();
    });

    $('selectAll').addEventListener('click', function () {
      teams.forEach(function (t) { state.teams.add(t.id); });
      selectionChanged();
    });
    $('clearAll').addEventListener('click', function () {
      state.teams.clear();
      selectionChanged();
    });
  }

  function syncControls() {
    document.querySelectorAll('#teamList input[data-team]').forEach(function (cb) {
      cb.checked = state.teams.has(cb.dataset.team);
    });
    document.querySelectorAll('#teamList input[data-group]').forEach(function (gcb) {
      var inGroup = teams.filter(function (t) { return t.sport === gcb.dataset.group; });
      var n = inGroup.filter(function (t) { return state.teams.has(t.id); }).length;
      gcb.checked = n === inGroup.length;
      gcb.indeterminate = n > 0 && n < inGroup.length;
    });
    document.querySelectorAll('input[name="type"], input[name="subType"]').forEach(function (r) {
      r.checked = r.value === state.type;
    });
    updateSummary();
    updatePrintHeader();
  }

  function updateSummary() {
    var sel = selectedTeams();
    var s;
    if (!sel.length) s = 'No teams selected.';
    else if (sel.length === 1) s = 'Showing ' + typeLabel() + ' for ' + sel[0].name + '.';
    else s = 'Showing ' + typeLabel() + ' for ' + sel.length + ' teams.';
    $('summary').textContent = s;
  }

  var refetchTimer = null;
  function selectionChanged() {
    syncControls();
    writeHash();
    if ($('subscribeDialog').open) renderSubscribe();
    clearTimeout(refetchTimer);
    refetchTimer = setTimeout(function () { if (calendar) calendar.refetchEvents(); }, 150);
  }

  function setType(type) {
    if (type !== 'games' && type !== 'all') return;
    state.type = type;
    selectionChanged();
  }

  /* ---------- loading events ---------- */

  var cache = new Map();

  function fetchCalendar(calId, timeMin, timeMax) {
    var key = calId + '|' + timeMin + '|' + timeMax;
    var hit = cache.get(key);
    if (hit && Date.now() - hit.t < 120000) return Promise.resolve(hit.items);

    var items = [];
    function page(token) {
      var u = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events');
      u.searchParams.set('key', API_KEY);
      u.searchParams.set('timeMin', timeMin);
      u.searchParams.set('timeMax', timeMax);
      u.searchParams.set('singleEvents', 'true');
      u.searchParams.set('orderBy', 'startTime');
      u.searchParams.set('maxResults', '2500');
      u.searchParams.set('timeZone', TZ);
      u.searchParams.set('fields', 'nextPageToken,items(id,status,summary,description,location,htmlLink,start,end)');
      if (token) u.searchParams.set('pageToken', token);
      return fetch(u.toString()).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) {
        items = items.concat(d.items || []);
        if (d.nextPageToken && items.length < 5000) return page(d.nextPageToken);
        return items;
      });
    }
    return page(null).then(function (all) {
      cache.set(key, { t: Date.now(), items: all });
      return all;
    });
  }

  function toEvent(team, e) {
    if (!e || !e.start || e.status === 'cancelled') return null;
    var allDay = !!e.start.date;
    var start = allDay ? e.start.date : floating(e.start.dateTime);
    var end = e.end ? (allDay ? e.end.date : floating(e.end.dateTime)) : undefined;
    return {
      id: team.id + ':' + e.id,
      title: e.summary || '(No title)',
      start: start,
      end: end,
      allDay: allDay,
      backgroundColor: team.color,
      borderColor: team.color,
      extendedProps: {
        teamName: team.name,
        location: e.location || '',
        description: e.description || '',
        link: e.htmlLink || ''
      }
    };
  }

  // Sample events used only when no API key is set, so the page can be previewed.
  function demoItems(team, start, end, type) {
    var opponents = ['Riverside Prep', 'Hillcrest School', 'Harbor Day School', 'Lakeview Academy', 'Northgate School'];
    var h = hashCode(team.id);
    var items = [];
    var d0 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    var days = Math.min(400, Math.ceil((end.getTime() - d0) / DAY));
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    for (var i = 0; i < days; i++) {
      var t = d0 + i * DAY;
      var day = new Date(t);
      var ymd = day.getUTCFullYear() + '-' + pad(day.getUTCMonth() + 1) + '-' + pad(day.getUTCDate());
      var dow = day.getUTCDay();
      var n = Math.floor(t / DAY);
      if ((n + h) % 6 === 0 && dow !== 0) {
        var home = (n + h) % 12 === 0;
        var opp = opponents[(n + h) % opponents.length];
        items.push({
          id: 'demo-g-' + n, summary: 'Sample: ' + (home ? 'vs ' : 'at ') + opp,
          location: home ? 'Saint Ann\u2019s Gym' : opp,
          start: { dateTime: ymd + 'T16:30:00' }, end: { dateTime: ymd + 'T18:00:00' }
        });
      } else if (type === 'all' && (dow === 1 || dow === 3 || dow === 4)) {
        items.push({
          id: 'demo-p-' + n, summary: 'Sample: Practice', location: 'Saint Ann\u2019s Gym',
          start: { dateTime: ymd + 'T15:30:00' }, end: { dateTime: ymd + 'T17:00:00' }
        });
      }
    }
    return items;
  }

  function loadEvents(info, success) {
    var sel = selectedTeams();
    var type = state.type;
    if (!sel.length) { showErrors([]); success([]); return; }
    var timeMin = new Date(info.start.getTime() - DAY).toISOString();
    var timeMax = new Date(info.end.getTime() + DAY).toISOString();

    var jobs = sel.map(function (team) {
      var p = DEMO
        ? Promise.resolve(demoItems(team, info.start, info.end, type))
        : fetchCalendar(calendarFor(team, type), timeMin, timeMax);
      return p.then(function (items) {
        return items.map(function (e) { return toEvent(team, e); }).filter(Boolean);
      });
    });

    Promise.allSettled(jobs).then(function (results) {
      var events = [];
      var failed = [];
      results.forEach(function (r, i) {
        if (r.status === 'fulfilled') events = events.concat(r.value);
        else failed.push(sel[i].name);
      });
      showErrors(failed);
      success(events);
    });
  }

  /* ---------- status messages ---------- */

  var statusLoading, statusError;

  function buildStatus() {
    var box = $('status');
    if (DEMO) {
      box.appendChild(el('p', 'notice',
        'Preview mode: these are sample events. Add a Google Calendar API key in config.js to show real schedules.'));
    }
    statusError = el('div', 'notice problem');
    statusError.hidden = true;
    statusLoading = el('p', 'loading', 'Loading schedule\u2026');
    statusLoading.hidden = true;
    box.appendChild(statusError);
    box.appendChild(statusLoading);
  }

  function showErrors(failed) {
    statusError.textContent = '';
    if (!failed.length) { statusError.hidden = true; return; }
    statusError.hidden = false;
    statusError.appendChild(el('span', null,
      'We couldn\u2019t load the schedule for ' + failed.join(', ') +
      '. Try again, or use the subscribe links, which don\u2019t depend on this page. '));
    var retry = el('button', 'link', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', function () { cache.clear(); calendar.refetchEvents(); });
    statusError.appendChild(retry);
  }

  /* ---------- event details ---------- */

  function htmlToText(s) {
    var withBreaks = String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n');
    var doc = new DOMParser().parseFromString(withBreaks, 'text/html');
    doc.querySelectorAll('script, style').forEach(function (n) { n.remove(); });
    return (doc.body.textContent || '').trim();
  }

  function appendLinked(parent, text) {
    var re = /https?:\/\/[^\s<>"']+/g;
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      var url = m[0].replace(/[.,;:!?)]+$/, '');
      parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el('a', null, url);
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      parent.appendChild(a);
      last = m.index + url.length;
      re.lastIndex = last;
    }
    parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  function fmtTime(d) {
    return d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
  }

  function whenText(ev) {
    var s = ev.start;
    var e = ev.end;
    if (ev.allDay) {
      var last = e ? new Date(e.getTime() - DAY) : null;
      if (last && last.getTime() > s.getTime()) return fmtDate(s) + ' to ' + fmtDate(last) + ' (all day)';
      return fmtDate(s) + ' (all day)';
    }
    var out = fmtDate(s) + ', ' + fmtTime(s);
    if (e) {
      var sameDay = s.toISOString().slice(0, 10) === e.toISOString().slice(0, 10);
      out += sameDay ? ' to ' + fmtTime(e) : ' to ' + fmtDate(e) + ', ' + fmtTime(e);
    }
    return out;
  }

  function addRow(parent, label, valueNode) {
    var row = el('div', 'ev-row');
    row.appendChild(el('dt', null, label));
    var dd = el('dd');
    if (typeof valueNode === 'string') dd.textContent = valueNode; else dd.appendChild(valueNode);
    row.appendChild(dd);
    parent.appendChild(row);
  }

  function showEvent(ev) {
    var p = ev.extendedProps;
    $('evTitle').textContent = ev.title;
    var body = $('evBody');
    body.textContent = '';
    var dl = el('dl', 'ev-detail');
    addRow(dl, 'When', whenText(ev));
    addRow(dl, 'Team', p.teamName);
    if (p.location) addRow(dl, 'Where', p.location);
    if (p.description) {
      var d = el('div', 'ev-desc');
      appendLinked(d, htmlToText(p.description));
      addRow(dl, 'Details', d);
    }
    body.appendChild(dl);
    if (/^https:\/\/(www\.)?google\.com\/calendar\//.test(p.link)) {
      var a = el('a', 'btn', 'View in Google Calendar');
      a.href = p.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      body.appendChild(a);
    }
    $('eventDialog').showModal();
  }

  /* ---------- subscribe ---------- */

  function icsUrl(id) { return 'https://calendar.google.com/calendar/ical/' + encodeURIComponent(id) + '/public/basic.ics'; }
  function webcalUrl(id) { return icsUrl(id).replace(/^https:/, 'webcal:'); }
  function gcalUrl(id) { return 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(id); }

  function copyText(text, btn) {
    function done() {
      var old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = old; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { manualCopy(text, btn); });
    } else {
      manualCopy(text, btn);
    }
  }

  function manualCopy(text, btn) {
    var input = el('input', 'manual');
    input.type = 'text';
    input.readOnly = true;
    input.value = text;
    input.setAttribute('aria-label', 'Calendar link');
    btn.replaceWith(input);
    input.focus();
    input.select();
  }

  function linkButton(label, href, external) {
    var a = el('a', 'btn', label);
    a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }

  function renderSubscribe() {
    var list = $('subList');
    list.textContent = '';
    var sel = selectedTeams();
    if (!sel.length) {
      list.appendChild(el('p', 'hint', 'Choose at least one team in the filters, then come back to subscribe.'));
      return;
    }
    sel.forEach(function (team) {
      var id = calendarFor(team);
      var row = el('div', 'sub-row');
      var name = el('h3', null, team.name);
      var sw = el('span', 'swatch');
      sw.style.backgroundColor = team.color;
      sw.setAttribute('aria-hidden', 'true');
      name.prepend(sw);
      row.appendChild(name);
      var btns = el('div', 'sub-buttons');
      btns.appendChild(linkButton('Add to Google Calendar', gcalUrl(id), true));
      btns.appendChild(linkButton('Apple Calendar or Outlook', webcalUrl(id), false));
      var copy = el('button', 'btn', 'Copy link');
      copy.type = 'button';
      copy.addEventListener('click', function () { copyText(icsUrl(id), copy); });
      btns.appendChild(copy);
      row.appendChild(btns);
      list.appendChild(row);
    });
  }

  /* ---------- print ---------- */

  function updatePrintHeader() {
    var sel = selectedTeams();
    var h = $('printHeader');
    h.textContent = '';
    h.appendChild(el('h2', null, S.pageTitle));
    h.appendChild(el('p', 'p-teams', sel.length ? sel.map(function (t) { return t.name; }).join(', ') : 'No teams selected'));
    var printed = new Date().toLocaleDateString('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' });
    h.appendChild(el('p', null, 'Showing ' + typeLabel() + '. Printed ' + printed + '. ' +
      (S.footerNote || '') + ' All times are ' + tzName() + '.'));
  }

  /* ---------- calendar ---------- */

  var calendar = null;

  function buildCalendar() {
    calendar = new FullCalendar.Calendar($('calendar'), {
      initialView: state.view,
      timeZone: 'UTC',
      now: function () { return wallClock(new Date()); },
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'listMonth,dayGridMonth,listFull' },
      buttonText: { today: 'Today' },
      views: {
        listMonth: { buttonText: 'List' },
        dayGridMonth: { buttonText: 'Month' },
        listFull: { type: 'list', duration: { days: 365 }, buttonText: 'Full schedule' }
      },
      validRange: function (nowDate) {
        return {
          start: new Date(nowDate.getTime() - (S.daysBack || 60) * DAY),
          end: new Date(nowDate.getTime() + (S.daysAhead || 365) * DAY)
        };
      },
      eventInteractive: true,
      dayMaxEvents: 3,
      eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
      events: loadEvents,
      eventContent: function (arg) {
        if (arg.view.type.indexOf('list') !== 0) return true;
        var wrap = el('span', 'ev');
        wrap.appendChild(el('span', 'ev-title', arg.event.title));
        wrap.appendChild(el('span', 'ev-team', arg.event.extendedProps.teamName));
        return { domNodes: [wrap] };
      },
      eventClick: function (info) {
        info.jsEvent.preventDefault();
        showEvent(info.event);
      },
      noEventsContent: function () {
        var msg = !state.teams.size
          ? 'Choose at least one team to see its schedule.'
          : state.type === 'games'
            ? 'No games or matches in this period. Choose \u201cGames, practices and meetings\u201d to see everything.'
            : 'Nothing scheduled in this period.';
        return { domNodes: [document.createTextNode(msg)] };
      },
      loading: function (isLoading) {
        statusLoading.hidden = !isLoading;
        $('calendar').setAttribute('aria-busy', isLoading ? 'true' : 'false');
      },
      datesSet: function () {
        state.view = calendar.view.type;
        writeHash();
      }
    });
    calendar.render();
  }

  /* ---------- start ---------- */

  function wireDialogs() {
    document.querySelectorAll('dialog').forEach(function (dlg) {
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg || (e.target instanceof Element && e.target.hasAttribute('data-close'))) dlg.close();
      });
    });
    $('subscribeBtn').addEventListener('click', function () {
      renderSubscribe();
      $('subscribeDialog').showModal();
    });
    $('printBtn').addEventListener('click', function () {
      updatePrintHeader();
      window.print();
    });
    window.addEventListener('beforeprint', updatePrintHeader);
    document.querySelectorAll('input[name="type"], input[name="subType"]').forEach(function (r) {
      r.addEventListener('change', function () { setType(r.value); });
    });
  }

  function init() {
    readHash();
    applySettings();
    buildStatus();
    buildTeamList();
    wireDialogs();
    syncControls();
    if (window.matchMedia('(max-width: 800px)').matches) $('filterPanel').open = false;
    buildCalendar();
  }

  init();
})();
