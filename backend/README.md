# Sales GenAI backend

A small FastAPI service for the mobile app. It does two things:

1. Serves the sales data in `data/Master data_Sales GenAI.xlsx`. The file is read once at startup and kept in memory; there is no database.
2. Sends push notifications to the app through the **Expo Push API**.

## Setup

You need Python 3.11 or newer. It has been tested on 3.14.

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate      macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then set API_KEY (see below)
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Startup takes about 17 seconds while the 20 MB workbook loads. Requests work once the log shows `Application startup complete`.
- Swagger UI is at http://localhost:8000/docs. To call the protected endpoints there, click **Authorize** and paste your `API_KEY`.
- `--reload` restarts the server, and so reloads the workbook, whenever a `.py` file changes. To watch only the code, add `--reload-dir app`.

### Base URL for the app

`localhost` on a phone or emulator means the device itself, not your computer. Use one of these instead:

| Where the app runs | Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Real device on the same Wi-Fi | `http://<your PC's LAN IP>:8000`, e.g. `http://192.168.1.20:8000` (find it with `ipconfig` or `ifconfig`) |

On Windows, allow Python through the firewall for private networks, or real devices can't connect.

## .env values

| Key | Default | Purpose |
|---|---|---|
| `EXCEL_PATH` | `data/Master data_Sales GenAI.xlsx` | The workbook to serve. Relative paths start from `backend/` |
| `TOKENS_PATH` | `data/tokens.json` | Where registered device tokens are stored (created automatically) |
| `API_KEY` | *(empty)* | Required in the `X-API-Key` header for `/api/sales/reload`, `/api/notifications/send` and `/api/notifications/tokens`. While it's empty those endpoints are locked. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `EXPO_ACCESS_TOKEN` | *(empty)* | Only needed if *Enhanced push security* is on for your Expo project |
| `CORS_ORIGINS` | `*` | Allowed browser origins, comma-separated. Native apps aren't affected by CORS |
| `NOTIFY_ON_RELOAD` | `true` | Whether to push "Sales data updated" to every device after a successful reload |

## Response format

Every endpoint, including errors, returns the same envelope:

```json
{ "success": true, "data": ..., "total": 25, "error": null }
```

On a list endpoint, `total` is the number of rows matching the search and filters, before paging.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Whether the workbook is loaded, plus sheet and row counts |
| GET | `/api/sales/sheets` | – | Every sheet with its `name`, `slug`, `header_row`, `rows` and `columns` |
| GET | `/api/sales/{sheet}` | – | Rows of one sheet. Supports `search`, `page` (from 1), `limit` (up to 5000), and any column as an exact filter |
| GET | `/api/sales/{sheet}/{row_id}` | – | One row. `row_id` is the row's number in Excel (the `_row_id` field) |
| GET | `/api/sales/summary` | – | KPIs, optionally filtered with `asm`, `territory`, `sales_officer` or `distributor_id` |
| POST | `/api/sales/reload` | API key | Re-reads the Excel file without a restart, then pushes "Sales data updated" to every device |
| POST | `/api/notifications/register` | – | `{ token, platform: ios\|android\|web, user? }`. Stores the token; registering the same token again updates it instead of adding a duplicate |
| POST | `/api/notifications/send` | API key | `{ title, body, data?, token? }`. Sends to one token, or to every registered token if `token` is left out |
| GET | `/api/notifications/tokens` | API key | Lists the registered devices (Expo tokens and web push subscriptions) |
| GET | `/api/notifications/webpush/key` | – | The VAPID public key the mobile app subscribes with |
| POST | `/api/notifications/webpush/subscribe` | – | `{ subscription, user: "SO018" }`. Stores a browser push subscription for that officer |
| POST | `/api/notifications/unregister` | – | `{ token }`. Removes an Expo token or a web push subscription (its endpoint) |
| GET | `/api/notifications/inbox?user=SO018` | – | A user's notifications, newest first, plus the unread count. ASMs are `asm:<name>` |
| POST | `/api/notifications/inbox/read` | – | `{ user, ids? }`. Marks those (or all) notifications read |
| POST | `/api/tracker/assign` | – | Assigns an action to a sales officer (or `Me`, the ASM) and notifies them. See [Action notifications](#action-notifications) |
| GET | `/api/tracker/actions?assigned_by=Raman` | – | Assigned actions and their status. Also `?so=SO018` |
| POST | `/api/tracker/actions/{id}/events` | – | `{ so, type: started\|comment\|complete, text?, outcome? }` from the app; notifies the ASM |
| POST | `/api/tracker/actions/{id}/review` | – | `{ by, decision: verify\|send_back, note? }` from the web Tracker. For an officer's own field action add `so`, `retailer_id`, `signal`. Notifies the officer |
| POST | `/api/tracker/actions/{id}/comment` | – | `{ by, text }` (same extra fields for a field action). The ASM's comment, shown in the officer's app |
| POST | `/api/app/visits/{id}/events` | – | `{ so, type: checkin\|checkout, retailer_id }` from the app. Kept in `tracker.json`, so a reload keeps the visit checked in; cleared by *Reset for demo* |
| POST | `/api/tracker/reminders/run` | API key | Sends due-today / overdue reminders for open assigned actions, once per action per day |
| POST | `/api/tracker/reset?assigned_by=Raman` | – (API key without `assigned_by`) | The web's *Reset for demo*: clears that ASM's assigned actions and the notifications in the mobile app, so the Action Tracker items (*Suggested by Sales AI*, *Needs an owner*) can be assigned again. See [Reset for testing](#reset-for-testing) |
| GET | `/api/web/bootstrap?asm=Raman` | – | Everything the Cortex web app (Next.js) shows, built from the workbook; `data.data_gaps` lists what's missing |
| GET | `/api/web/data-gaps` | – | What the workbook can't provide to the web app |
| GET | `/api/app/bootstrap?so=SO018` | – | Everything the mobile app shows for one sales officer (see below) |
| GET | `/api/app/sales-officers` | – | The sales officers in the workbook, for `?so=` |
| GET | `/api/app/inbox?so=SO018&since=<ms>` | – | New notifications for the app since a time, with the assigned actions they point to |
| GET | `/app/` | – | The mobile app's web build (`mobile/app`), served from the same origin; `/` redirects here |

`{sheet}` can be the exact sheet name, URL-encoded, or its slug:

```
GET /api/sales/4-retailer-master?Territory=Bhavnagar&ASM%20Name=Raman&limit=20
GET /api/sales/8.%20Actual%20Sales%20Value?search=M%20F%20B
GET /api/sales/5-retailer-credit/4
GET /api/sales/summary?asm=Raman
```

### How the Excel data is shaped

- **Header row.** Many sheets have a title row above the headers. The backend takes the row with the most text cells (searching the first 10 rows) as the header. `header_row` in `/sheets` tells you which row it picked.
- **Column names** are kept exactly as they appear in Excel. The one exception is the wide actual/target sheets, which repeat the SKU headers under each period. A repeated header is prefixed with its period label, e.g. `"Apr-26 / IWC250g"`, `"Sep-26 MTD (till 20th) / Total"`. A column with no header is named `"Column X"`, after its Excel column letter.
- **Values are not rounded or changed.** Dates are ISO strings (`2026-08-30T00:00:00`), blank cells are `null`, and text such as `"NA"` is kept as text.

### Summary KPIs (`/api/sales/summary`)

The summary is built from four sheets: `4. Retailer_Master` (ASM, territory and sales officer for each retailer), `8. Actual Sales Value`, `9. Target Sales Value` and `5. Retailer Credit`. It contains:

- `counts`: numbers of retailers, retailers with actuals, distributors, ASMs, territories and sales officers
- `sales`: the September target, September target to date, actuals to the 20th, achievement % and gap
- `half_year`: yearly and H1 targets against actuals so far
- `monthly`: actual vs target for Apr–Aug, plus September to date
- `by_category`: September figures for IWC, Repair Polymer, Acrylic Primer and Waterproofing Compound
- `credit`: outstanding, overdue, credit limit, overdue retailers, cheque bounces and risk categories
- `by_asm`, `by_territory`, `by_sales_officer`: the `sales` figures for each of those

Money is in rupees and isn't rounded. The data runs to **20 Sep 2026**.

## Market Action Plan, Pitch and Tracker data (`map`, `pitch`, `tracker` in `/api/web/bootstrap`)

Built by `app/services/web_plan.py` for the ASM, from the workbook:

| Screen | From |
|---|---|
| Plan initiatives | Distributor revival (`MAP_Distributor Assessment`, Jun→Aug de-growth; delivered = Sep MTD above Aug MTD), retail reach (distributors under 70% of their retailer universe mapped; delivered = new retailers billing in Sep), range selling (each territory's largest category gap; delivered = Sep MTD actual), dormant retailers (Q1 sales, none in Jul–Aug), influencer activation (`Data 12`). Agreed = Estimated: there are no ASM targets. |
| October draft | What September leaves open, plus each territory's retailers not visited in 30+ days |
| Market sheets | `Data 11` shares for the ASM's micro market; ₹ size = company Apr–Aug run-rate ÷ share; territories split it by their distributors' retailer universe. Reach and influencers straight from the sheets |
| Pitch | One pitch per outlet the plan reaches; KPIs and talking points from the outlet's own rows (tenure, credit, SKU gap in `11. Sep projections`, loyalty pitch statement, short supply). Visited = last SO visit on or after 1 Sep |
| Tracker | The ASM's signal groups (Needs an owner) and the officers' retailer actions (Team), plus — per request, from `tracker.json` — assignments, the officers' updates and completions, and verifications |
| Past months (Apr–Aug) | No plan records exist, so a closed month's plan rows are its territory × category targets (`9. Target Sales Value`) against what was billed (`8. Actual Sales Value`); they sum exactly to the month's plan figures |

## Org-wide plans and pitches (`org` in `/api/web/bootstrap`)

The Head of Sales's read-only Market Action Plan (`/leadership/map`) and Pitch (`/leadership/pitch`) pages. `web_plan.build_org` runs the same plan build for **every** ASM: `ORG_PLANS` (each ASM × Apr–Oct, figures from the same monthly target/actual rule as `PLAN_MONTHS`), `ORG_INITIATIVES` (per plan id), `ORG_EXECS` (each ASM's sales officers), and `ORG_PITCHES` with their outlets, KPIs and talking points. The viewing ASM's own September rows and pitches are left out — the web app reads them from `map` / `pitch`, which carry the per-request tracker overlay. Ten sales officers serve more than one ASM in the workbook, so each org pitch carries its `asm` and `region`.

## Insight states and the walkthrough thread (`cortexHome`)

- `INSIGHT_ACTIONS` / `FINDING_ACTIONS`: either a suggested action (`label` + `run`) or how the item settled — `done` (the pacing gap is already in the October draft), `closed` with `bySfa` (the SO's last visit to the short-supplied retailer is after the short supply), `closed` (an insight resting on one sheet, score under 70), or, for Huddle findings owned by another department, `done` (routed there).
- `isNew` marks items computed from the data date's own records; findings take `territory` and `isNew` from the insight or recommendation they corroborate.
- `DEMO_SCENARIO`: the thread the home cards narrow to while demo scope is on — insights still waiting on the ASM or new, and the findings that corroborate them; `leadInsights` is the ASM's own collections item on the Head of Sales homepage (`li-4`).
- `thermometer.SYNC_FEEDS` lists the sheets and agents the Thermometer Sync control steps through; `GET /api/web/sections` returns the workbook's `loaded_at`, which the control compares to tell when the server has newer data.

## Huddle data (`huddle` in `/api/web/bootstrap`)

Built by `app/services/web_huddle.py` from the `Huddle` sheet for the ASM's team. The sheet has themes (owner, urgency, session, verbatim, action count) but no dates, attendance or decisions, so:

- Sales-owned themes are the team's daily **Morning** and **Evening** huddles; other departments' themes are **ad-hoc** cross-functional calls. They are laid out over the last seven working days to 20 Sep, in sheet order.
- One action per theme (owner = its designation, the sheet's action count, due by urgency). **Assign action** calls `/api/tracker/assign` with `source_id = hud-<theme>`, so it becomes a Tracker ticket and its status shows on the huddle pages.
- High urgency = systemic blocker; medium urgency owned by another team = incomplete discussion.
- Each theme is checked against the region's workbook signals (credit, targets, short supply, market share, distributor trend, loyalty); a match shows as evidence and raises confidence.
- **Capability Building** per meeting uses SalesPulze's criteria and weights (Action Item Quality and Decisions Made 15%, BDE Performance Effectiveness 25%, Beat Plan Adherence 25%, Reach Expansion Review 25%, Throughput & Revenue 5%, Throughput & Revenue Recovery 5%). A criterion scores 0 / 60 / 80 / 100 when none, one, two or three-plus of the meeting's themes cover it; the themes are the evidence. Hygiene and actual durations show as not recorded.
- **Field Operations Health** (`ENTITIES`) scores every region (level 2), territory (3) and sales officer (4) on the same criteria from the workbook: beat plan = retailers visited in the last 30 days, reach = retailers billed in September, throughput = September MTD sales vs phased target, recovery = 1 − overdue / outstanding, BDE = influencer activation vs target, action quality = huddle themes with an owner and 3+ actions (only where huddles exist). Bands: Healthy 80–100, Moderate 60–80, Attention 40–60, Critical 0–40.
- Themes are tagged with product categories (`2. Products`), business segments and the owning function, for the repository filters, Product Discussion Coverage and Action Execution Overview.

## Mobile app data (`/api/app/bootstrap`)

Every screen's data for one sales officer comes from the Excel workbook. `?so=` takes an ID or a name and defaults to `DEFAULT_SALES_OFFICER` (`SO018`). `?today=` defaults to `APP_TODAY` (`2026-09-21`, the day after the workbook's actuals end).

**Read straight from the workbook:**
- **People and territories:** the officer, their ASM, teammates and territories.
- **Customers:** class, owner, mobile, distributor, last order (Logistics), outstanding, overdue, ageing, risk and trigger (Credit), and the last SO visit.
- **Per-SKU quantities:** Aug sales, Sep MTD, Sep target and gap.
- **KPIs:** Sep achievement, rank, and category achievement.
- **Analytics and products:** account counts, products and prices, and geography.
- **Order numbers:** these continue from the highest Order ID.

**Derived from workbook values** (the workbook has no such records):

| App data | Rule |
|---|---|
| Visit history | Each retailer's last SO visit (date and time) |
| This week's plan | 5 visits per working day, ranked by days since last visit, overdue, credit risk and target gap. Each visit carries its reason. |
| Actions | One per signal: overdue, credit limit breach or cheque bounce (Credit); Sep target gap (Projections); short supply (Logistics); next loyalty slab (14c); Q1 payout (14b); premium-variant push (Prod push logic) |
| Pitch topics | The same signals, using the workbook's own pitch statements |
| Notifications | The high-priority actions |
| Charts | Visits per month and day, and coverage per class, from the last-visit dates |

**Not in the workbook:** `data.data_gaps` (also `GET /api/app/data-gaps`, and **Data Sources** in the app menu) lists everything the workbook can't provide.

## Action notifications

The Excel workbook stays read-only. Assignments, status changes and notifications are kept in `TRACKER_PATH` (`data/tracker.json`).

1. **Assign (web app).** *Assign & Add to Tracker* and *Needs an owner → Assign* call `POST /api/tracker/assign`. The backend checks the ASM, the officer (they must serve retailers under that ASM), the territory and the retailer against `4. Retailer_Master`. It fills the action from the retailer's workbook signal, the same rule the mobile app uses, so both apps describe it the same way (for example "Collect ₹13.41L overdue for 73 days…"). Assigning the same item to the same person again returns the existing action.
2. **Notify (mobile app).** The officer gets an `assigned` notification. It's pushed to every device they registered, and it appears in the app's bell, which polls `GET /api/app/inbox` every 20 s while open. Tapping the push opens the action.
3. **Verify (web Tracker).** What the officer marks done shows in *Awaiting Verification*. The open board re-reads `GET /api/web/sections/tracker` every 15 s (and when the tab comes back to the front), so it moves there without a reload, with a toast. A field action the board doesn't list among the largest gets its own ticket (under *Team*) once the officer works on it in the app. *Verify and close* or *Send back* calls `POST /api/tracker/actions/{id}/review`; send back reopens it in the officer's app with a push. The ASM's comments go through `/comment`. Plan rows (*Send to Tracker*, *Comment*) and MAP Studio's *Save* create assignments with `/assign`.
4. **Work it (mobile app).** Start, update and complete in the app call `POST /api/tracker/actions/{id}/events`. This also works for the actions the app derives from the workbook (stored as overrides). The ASM gets `started` / `comment` / `completed` notifications in `asm:<name>`'s inbox.
5. **Remind.** `POST /api/tracker/reminders/run`, or `REMINDER_INTERVAL_MINUTES`, sends `due` / `overdue` reminders for open assigned actions, relative to `APP_TODAY`.

`GET /api/app/bootstrap` merges all of this in, so a reload shows the same status, outcomes and read state.

### Reset for testing

An item assigned from the Home page's Action Tracker stays assigned (its Assign control is hidden) until the action is closed. **Reset for demo** (bottom of the web app's agent rail) starts over: it calls `POST /api/tracker/reset?assigned_by=<ASM>`, which removes the actions that ASM assigned, the officers' updates on that ASM's retailers, and the notifications and read state of the ASM and their officers. Then the web app reloads on the ASM Home. An open mobile app reloads itself on its next inbox check (within 20 s, or when it comes to the front).

From a terminal, the same for one ASM, or everything (needs the key):

```bash
curl -X POST "http://localhost:8000/api/tracker/reset?assigned_by=Raman"
curl -X POST -H "X-API-Key: $API_KEY" "http://localhost:8000/api/tracker/reset"
```

Ids keep counting up, so a new assignment never reuses an old id.

### Web Push (the mobile app)

The mobile app is a web page, so it uses the browser Push API with VAPID instead of Expo.
- The backend generates its VAPID key on first use (`VAPID_PATH`), or uses `VAPID_PRIVATE_KEY`.
- The app subscribes from the menu (**Notifications → Turn On**) or the first-launch prompt, and the backend sends through the browser's push service (FCM for Chrome / Android, Apple for Safari).
- Push needs a **secure origin**: HTTPS, or `http://localhost`. On `http://<LAN IP>:8000` the browser has no Push API, but assignments still arrive in the bell while the app is open.
- **iPhone (iOS 16.4+)**: open the app in Safari, tap Share → **Add to Home Screen**, open it from the Home Screen, then turn notifications on.
- Subscriptions that the push service reports gone (404 / 410) are removed, like Expo's `DeviceNotRegistered`.

## Push notifications (Expo)

1. The app gets a token with `expo-notifications` (`getExpoPushTokenAsync({ projectId })`). It looks like `ExponentPushToken[xxxx]`.
2. The app sends it to `POST /api/notifications/register` on startup.
3. `POST /api/notifications/send` and `/api/sales/reload` send through `https://exp.host/--/api/v2/push/send`, 100 messages per request.
4. If Expo answers `DeviceNotRegistered` for a token, the backend deletes it from `tokens.json`.

The reload notification carries `data: { "type": "sales_data_updated", "loaded_at": "..." }`. When the app receives it, it should refetch its data.

### Getting push credentials

- **Expo access token.** Optional, and only needed if *Enhanced push security* is on. Go to https://expo.dev → Account settings → **Access tokens** → Create, then put the token in `EXPO_ACCESS_TOKEN`.
- **Android (FCM).** Expo still delivers Android pushes through Firebase, so a development or production build needs FCM credentials uploaded to Expo once:
  1. Create a Firebase project and add an Android app with your package name.
  2. Firebase console → Project settings → **Service accounts** → *Generate new private key* (this downloads a JSON file).
  3. Run `eas credentials` (Android → Google Service Account → FCM V1) and upload that JSON.
  4. Put `google-services.json` in the app and set `android.googleServicesFile` in `app.json`.

  The backend never needs this file; it only talks to Expo.
- **iOS.** `eas build` creates and uploads the APNs key for you. This requires an Apple Developer account.
- **Expo Go** can receive pushes for quick tests on iOS. On Android, SDK 53 and later need a development build.

### Testing a push

1. Run the app on a physical device and let it register; the token then shows in `GET /api/notifications/tokens`.
2. Open `/docs`, click **Authorize**, then call `POST /api/notifications/send` with `{"title":"Test","body":"Hello"}`.
3. Check the response. `sent` should be 1 and `errors` empty.

## Project layout

```
backend/
  app/
    main.py                  FastAPI app: CORS, error envelope, routers, Excel load at startup
    config.py                settings read from .env (pydantic-settings)
    security.py              X-API-Key check
    schemas.py               Pydantic request and response models
    routers/sales.py         data endpoints
    routers/notifications.py push endpoints
    services/excel_data.py   Excel loading, header detection, in-memory cache, search and filters
    services/summary.py      KPI calculations
    services/push.py         Expo sending and the tokens.json store
  data/
    Master data_Sales GenAI.xlsx
    tokens.json              (created at runtime, git-ignored)
  requirements.txt
  .env.example
```
