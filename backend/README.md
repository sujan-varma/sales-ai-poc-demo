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

- Startup takes about 17 seconds while the 27 MB workbook loads. Requests work once the log shows `Application startup complete`.
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
| GET | `/api/notifications/tokens` | API key | Lists the registered tokens |
| GET | `/api/web/bootstrap?asm=Raman` | – | Everything the Cortex web app (Next.js) shows, built from the workbook; `data.data_gaps` lists what's missing |
| GET | `/api/web/data-gaps` | – | What the workbook can't provide to the web app |
| GET | `/api/app/bootstrap?so=SO018` | – | Everything the mobile app shows for one sales officer (see below) |
| GET | `/api/app/sales-officers` | – | The sales officers in the workbook, for `?so=` |
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
