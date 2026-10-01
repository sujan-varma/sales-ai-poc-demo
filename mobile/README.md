# Mobile app

| Folder | What it is |
|---|---|
| `mockups/` | The original UI mockup (static, hardcoded data). Kept as the design reference and not edited. |
| `app/` | The working app. This is the mockup with every data set fetched from the backend (`GET /api/app/bootstrap`), all of it built from the Excel file. The menu's **Data Sources** item lists what the Excel file doesn't have. It is generated, so don't edit it by hand. |
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

Actions you take in the app (check-in, completing actions, orders) are kept in memory only for now. A reload starts again from the backend data.
