# 💰 Expense Tracker — Tariq & Nawshin

A live shared expense tracker. Both users can add entries from any device and see each other's spending in real-time, with automatic behavioral insights.

## Features
- 🔐 PIN-based login (separate PIN per person)
- 📱 Works on mobile & desktop
- 📊 Auto-generated insights: who spends more, impulsive vs necessary, commute burden, top transactions
- 🗂️ Filter by month, person, category
- 🗑️ Delete your own entries
- 📡 Live — both people see the same data

---

## Local Setup (test on your computer first)

```bash
# 1. Clone / enter the folder
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker

# 2. Install dependencies
npm install

# 3. Run
npm run dev      # development (auto-reload)
# or
npm start        # production

# 4. Open http://localhost:3000
# Default PINs: Tariq = 1111, Nawshin = 2222
```

---

## Deploy to Railway (Free — recommended)

Railway gives you a free persistent server. The database lives on the server.

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### Step 2 — Deploy on Railway
1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `expense-tracker` repo
4. Railway auto-detects Node.js and runs `npm start`

### Step 3 — Set your PINs (important!)
In Railway dashboard → your project → **Variables** tab, add:
```
TARIQ_PIN   = your_chosen_pin
NAWSHIN_PIN = nawshins_chosen_pin
```

### Step 4 — Persistent storage (database won't reset on redeploy)
1. In Railway → your project → **+ New** → **Volume**
2. Mount path: `/data`
3. The database will now survive restarts and redeployments ✓

### Step 5 — Get your URL
Railway gives you a public URL like `https://expense-tracker-production-xxxx.up.railway.app`
Share this URL with Nawshin. Done.

---

## Alternative: Deploy to Render (also free)

1. Push to GitHub (same as above)
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables: `TARIQ_PIN` and `NAWSHIN_PIN`
7. For persistent storage: Add a Disk at mount path `/data`

---

## Changing PINs

Set environment variables on your host:
- `TARIQ_PIN` — Tariq's login PIN
- `NAWSHIN_PIN` — Nawshin's login PIN

For local dev only, defaults are `1111` and `2222`.

---

## Project Structure

```
expense-tracker/
├── server.js        ← Express backend + all API routes
├── db.js            ← SQLite database setup
├── package.json
├── public/
│   └── index.html   ← Full frontend (login, dashboard, add, entries, insights)
└── README.md
```

## API Endpoints

All endpoints (except `/api/login`) require headers:
- `person: tariq` or `person: nawshin`
- `pin: YOUR_PIN`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Verify PIN |
| GET | `/api/entries?year=&month=` | Get entries |
| POST | `/api/entries` | Add entry |
| DELETE | `/api/entries/:id` | Delete own entry |
| GET | `/api/insights?year=&month=` | Computed analytics |
| GET | `/api/months` | Months with data |
