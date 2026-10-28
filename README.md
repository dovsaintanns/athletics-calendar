# Saint Ann's Athletics Calendar (static viewer)

A single static page: no server, no database, no logins. It reads the teams' **public Google Calendars**
(read-only) and draws them with [FullCalendar](https://fullcalendar.io) (MIT license, included in `vendor/`).

## What is in the folder

| File | What it is |
|---|---|
| `index.html` | The page. Includes a strict Content Security Policy: only its own scripts may run, and the only outside site it may contact is `www.googleapis.com`. |
| `app.js` | Roughly 650 lines, heavily commented: team picker, event loading, subscribe links, print header. Calendar text is always inserted as plain text. |
| `config.js` | **The file you edit.** API key, page wording, and the team list with calendar IDs. |
| `styles.css` | Look, small-screen layout, print layout. |
| `vendor/fullcalendar.min.js` | FullCalendar 6.1.22, copied locally so no third-party script loads at runtime. |
| `links.html` | Plain list of every subscribe link with no JavaScript. This is the fallback if the viewer is ever down. Rebuild it with `node tools/make-links.js` after editing `config.js`. |

## 1. Get a Google Calendar API key (about 5 minutes)

The browser cannot read Google's `.ics` addresses directly, so the page asks the read-only Calendar API instead.
It only works for calendars that are already public.

1. In the Google Cloud console, create a project (for example "SA Athletics Calendar") under the school account.
2. APIs & Services, then Library: enable **Google Calendar API**.
3. APIs & Services, then Credentials: **Create credentials, API key**.
4. Edit the key and restrict it:
   - **Application restrictions:** Websites. Add `https://YOURNAME.github.io/*` for testing. Later add the school site, for example `https://www.saintannsny.org/*`.
   - **API restrictions:** Restrict key, then choose only **Google Calendar API**.
5. Paste the key into `apiKey` in `config.js`.

The key is visible to anyone who views the page source. That is normal for this kind of key. The two restrictions above are what keep it from being useful elsewhere.

## 2. Put it on GitHub Pages for testing

1. Create a new repository and upload everything in this folder (keep the folder structure).
2. Settings, then Pages: deploy from the `main` branch, root folder.
3. Open `https://YOURNAME.github.io/REPO/`.

With no API key set, the page runs in **preview mode** with clearly labelled sample events, so you can show the layout before the key exists.

## 3. Day-to-day changes

- Turn a team on or off: change `active: true/false` in `config.js`.
- Rename a team or change wording: edit `config.js`.
- Then run `node tools/make-links.js` so `links.html` matches.

## Check before showing it around

- Open each active team's page view with real data and confirm events appear. A wrong ID or a non-public calendar shows a clear "couldn't load" message naming the team.
- Try "Add to Google Calendar" and "Apple Calendar or Outlook" on a phone.
- Confirm times show in Eastern time.
