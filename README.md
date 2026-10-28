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
| `links.html` | Plain list of every subscribe link with no JavaScript. This is the fallback if the viewer is ever down. Generated together with `config.js`; always replace the two as a pair. |
| `admin-tools/ExportSiteConfig.gs` | Apps Script for the admin Sheet. Adds Site tools > Export site config, which produces `config.js` and `links.html`. Not part of the public site. |

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

## 3. Day-to-day changes (teams, calendar IDs, wording)

The admin console Sheet is the control panel. `config.js` and `links.html` are both generated from it, together.

1. Edit the **Teams** or **Settings** tab in the Sheet (tick or untick Active, add a team, paste a calendar ID, and so on).
2. In the Sheet, choose **Site tools > Export site config**. It checks for mistakes (bad or duplicate IDs, a calendar that is not public, an unknown default team) and, if all is well, shows both files with Copy and Download buttons.
3. Replace **both** `config.js` and `links.html` in the site folder with the new versions.
4. Publish: on GitHub Pages, commit and push (GitHub Desktop: Commit, then Push origin). Elsewhere, upload the two files.

Do not hand-edit either file; the next export overwrites them. The exporter is in `admin-tools/ExportSiteConfig.gs`, with setup steps at the top.

## Moving to another host (WordPress server, school web host, etc.)

The site is plain files with no build step and no server code. To move it, copy `index.html`, `app.js`, `config.js`, `styles.css`, `links.html` and the `vendor` folder to the new host, keeping the folder structure. From then on, an update is just replacing `config.js` and `links.html`.

- Link or embed the page (for example in an iframe) from the WordPress site rather than pasting it into a post; a pasted copy would not carry the security policy in `index.html`.
- Add the new site's address to the API key's website restrictions in Google Cloud.
- Nothing in the page depends on GitHub.

## Check before showing it around

- Open each active team's page view with real data and confirm events appear. A wrong ID or a non-public calendar shows a clear "couldn't load" message naming the team.
- Try "Add to Google Calendar" and "Apple Calendar or Outlook" on a phone.
- Confirm times show in Eastern time.
