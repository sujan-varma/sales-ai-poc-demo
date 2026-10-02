# Mobile app

| Folder | What it is |
|---|---|
| `mockups/` | The original UI mockup (static, hardcoded data). Kept as the design reference and not edited. |
| `app/` | The working app. This is the mockup with every data set fetched from the backend (`GET /api/app/bootstrap`), all of it built from the Excel file. The menu's **Data Sources** item lists what the Excel file doesn't have. It is generated, so don't edit it by hand. |
| `pwa/` | Service worker, web app manifest and icon for push notifications. Copied into `app/` by the build. |
| `tools/build_app.py` | Builds `app/index.html` from the mockup. Run it again after changing the mockup: `python mobile/tools/build_app.py` |

## Run

1. Start the backend (see `backend/README.md`). It serves the app at **http://localhost:8000/app/**.
2. On a phone on the same Wi-Fi, open `http://<PC LAN IP>:8000/app/`.

| Option | Example |
|---|---|
| Another sales officer | `/app/?so=SO017` (IDs come from `GET /api/app/sales-officers`) |
| Another backend | `?api=http://192.168.1.20:8000`. Otherwise the app uses the same origin, or port 8000 on the same host. |

## How data loads

1. The page shows a loading screen while it fetches `/api/app/bootstrap`.
2. It then starts the UI with that data.
3. If the request fails, the page shows the error with a **Try again** button.

Starting, updating and completing an action is saved to the backend (`POST /api/tracker/actions/{id}/events`), and so are notification read state and visit check-in / check-out (`POST /api/app/visits/{id}/events`), so a reload or a push tap that reopens the app keeps the visit checked in. Orders and follow-up actions created in the app are still kept in memory only, so a reload starts them again from the backend data.

## Notifications

- **Assigned actions.** When the ASM assigns an action in the web app, it appears in the bell, the Action Tracker and Today's Priorities. While the app is open it checks `GET /api/app/inbox` every 20 s, and immediately when a push arrives. Tapping a notification opens the action.
- **Push.** The menu's **Notifications** item turns push on or off for the phone; the app also asks once on first launch. `pwa/sw.js` is the service worker that shows the push and opens the action when it is tapped. `pwa/manifest.webmanifest` lets iPhones add the app to the Home Screen, which iOS requires for push.
- Push needs HTTPS (or `http://localhost`). See *Web Push* in `backend/README.md`.

`build_app.py` copies `pwa/` next to `app/index.html`.
