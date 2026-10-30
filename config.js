/*
 * Saint Ann's Athletics Calendar: configuration
 *
 * GENERATED from the athletics admin console Sheet on 2026-10-30 (Site tools > Export site config).
 * Change teams and settings in the Sheet and export again; edits made here will be overwritten.
 *
 *  - apiKey:   a read-only Google Calendar API key (restricted by website and by API).
 *  - settings: wording, defaults and limits for the page.
 *  - teams:    one entry per team, already in display order (division, sport, boys then girls, level).
 *              "active: false" hides a team from the page.
 *
 * Calendar IDs are not secret: they belong to public calendars.
 */
window.SA_CONFIG = {
  apiKey: "AIzaSyBtn8R_trxNdWelHFlUef5EnbK4HRjlsCs",

  settings: {
    pageTitle: "Saint Ann's Athletics Calendar",
    introText: "Choose your teams, decide whether to include practices, then view, print, or subscribe.",
    defaultTeams: "ALL",
    defaultEventType: "games",
    defaultView: "list",
    timeZone: "America/New_York",
    daysBack: 60,
    daysAhead: 365,
    accentColor: "#234e70",
    feedName: "Saint Ann's Athletics",
    contactText: "Questions about a schedule? Contact the Athletics Office.",
    contactEmail: "support@saintannsny.org",
    footerNote: "Schedules can change. Check back often."
  },

  teams: [
    {
      id: "boys-varsity-basketball", active: true, division: "High School", sport: "Basketball", name: "Boys Varsity Basketball", season: "Winter",
      gamesCalId: "c_ba8bad70d7b0643fbfc76cfd992d3e1c1eb6bb1ea5aa61c11dbd81918e91f789@group.calendar.google.com",
      allCalId: "c_f6ea97acabecf415e2f926b6117fc3463e23ea5a98af98f974c8f0a216befa81@group.calendar.google.com"
    },
    {
      id: "boys-jv-basketball", active: true, division: "High School", sport: "Basketball", name: "Boys JV Basketball", season: "Winter",
      gamesCalId: "c_283b9ea2b57748728dce115e4f28c659c1018ac61269d2d1c886dbd306257c6b@group.calendar.google.com",
      allCalId: "c_3d80961f215fbee6a6116fb67ff28fdb5b1ca1cade91626d2086976124ca465d@group.calendar.google.com"
    },
    {
      id: "girls-varsity-basketball", active: true, division: "High School", sport: "Basketball", name: "Girls Varsity Basketball", season: "Winter",
      gamesCalId: "c_84cd9dfb7e784bd2a8892e5e0a0acfda56ad345b4cf5d72192eb82a65564eb0d@group.calendar.google.com",
      allCalId: "c_b839f6385be4efafb7f76f95d8c2df434acc93c7030c37e5c6492b64297945d5@group.calendar.google.com"
    },
    {
      id: "varsity-indoor-track", active: true, division: "High School", sport: "Indoor Track", name: "Varsity Indoor Track", season: "Winter",
      gamesCalId: "c_46d407c66d38566cbf3d7a34a95ebdbe98eadea050f6785dc2a8a3ac8cf063e5@group.calendar.google.com",
      allCalId: "c_7278c3495ce44d3501378c4b7b12d4a2dbc6174489aa60b086ee28bf704df50d@group.calendar.google.com"
    },
    {
      id: "boys-6th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Boys 6th Grade Basketball", season: "Winter",
      gamesCalId: "c_34436948c75363fc6edef0ee9c6089300698de867140aa5946ccef56be8fb9bc@group.calendar.google.com",
      allCalId: "c_ba578b05f2c44e997efd3be49696da9097c431dfecdcb3c761c4090930300b0c@group.calendar.google.com"
    },
    {
      id: "boys-7th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Boys 7th Grade Basketball", season: "Winter",
      gamesCalId: "c_47650af46534e3b2d4cb0dd0698af7f4d163f002a549c568cf4ee646d6baac39@group.calendar.google.com",
      allCalId: "c_31322a6ea0bce4ba565fe40a387e27798bfc7d6d8d5c33d4ada193c1ec809074@group.calendar.google.com"
    },
    {
      id: "boys-8th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Boys 8th Grade Basketball", season: "Winter",
      gamesCalId: "c_8ce9af1b7d2e10d8d4856ed14dd4be6b8d09002ee6d1ac77563b8d4518aec5f7@group.calendar.google.com",
      allCalId: "c_e8563c70d30cf817eb7c45e0f47495d71019d878e09b9ebff66f8796b90b7904@group.calendar.google.com"
    },
    {
      id: "boys-7th-8th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Boys 7th/8th Grade Basketball", season: "Winter",
      gamesCalId: "c_369ecad6a36f032fafecfbfa24dd8f3fd1a26c2d8442c76b9a4e291aef3e1507@group.calendar.google.com",
      allCalId: "c_589fa2a53afe6c70dfad1bc714c62c03a0caee350b5e3644c82f447a71c6e002@group.calendar.google.com"
    },
    {
      id: "girls-6th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Girls 6th Grade Basketball", season: "Winter",
      gamesCalId: "c_847433576d7a21eb1a2c1ff785b0484fa16c3fc2300a02473b30983ac3831995@group.calendar.google.com",
      allCalId: "c_4d779eaf9d88c177623f24a3e50de243ee3f1edd9aff505a782dc468f663cf85@group.calendar.google.com"
    },
    {
      id: "girls-7th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Girls 7th Grade Basketball", season: "Winter",
      gamesCalId: "c_31bc98f1155b736f0b0c483a51cc9df37f6561f909f025a65fb2a13132e2424b@group.calendar.google.com",
      allCalId: "c_75a64726d6d7fd0798e479e42d5f541bb6f012124144b9fc957e80c15a41a5bd@group.calendar.google.com"
    },
    {
      id: "girls-8th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Girls 8th Grade Basketball", season: "Winter",
      gamesCalId: "c_4422eb911db1fed29fc946500a4af89b39edc23908b2d224579181f49940ec76@group.calendar.google.com",
      allCalId: "c_7297270f1c12110e3bf5935af27f46679759f0f6d265e1a4cd531120b1598b37@group.calendar.google.com"
    },
    {
      id: "girls-7th-8th-grade-basketball", active: true, division: "Middle School", sport: "Basketball", name: "Girls 7th/8th Grade Basketball", season: "Winter",
      gamesCalId: "c_efcceab424d3f8478f5cd4ba56e03d981e75832f64afffd5f171aee86c8806c3@group.calendar.google.com",
      allCalId: "c_ac67f503d04c21daade37299e4eedc85c208dae63b0ede8af807fac6c115f326@group.calendar.google.com"
    }
  ]
};
