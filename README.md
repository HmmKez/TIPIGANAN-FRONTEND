# TIPIGANAN — Frontend

MDC Online Repository of Special and Rare Collections  
React + Vite + Tailwind CSS Frontend

## Requirements

- Node.js 18+
- npm

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/tipiganan-frontend.git
cd tipiganan-frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the dev server
```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

## Backend

Make sure the Laravel backend is running at `http://localhost:8000`  
See: https://github.com/HmmKez/TIPIGANAN-BACKEND

By default the app calls `http://127.0.0.1:8000/api`. To point it somewhere
else, set `VITE_API_BASE_URL` (see `.env.production.example`). Note that Vite
bakes this value into the bundle at **build** time — changing it means
rebuilding, not just restarting.

## Deploying to Vercel

Vercel hosts this frontend on its free tier. The Laravel backend **cannot** go
there — it needs a persistent disk for uploaded theses and their checksums, and
Vercel's filesystem is ephemeral. Host the API elsewhere (or expose a local one
with a tunnel) and point the frontend at it.

1. Import the repo at vercel.com. The Vite preset is detected automatically.
2. Set the environment variable `VITE_API_BASE_URL` to the API's full base URL,
   including the trailing `/api` — e.g. `https://api.example.com/api`.
3. Under **Environments → Production → Branch Tracking**, set the branch to
   `dev`. Vercel otherwise builds the repo's default branch (`main`), which is
   not where this project's work lands.
4. On the backend, set `FRONTEND_URL` to the Vercel domain. CORS is locked to
   that value, so the browser blocks every API call until it matches.

`vercel.json` rewrites unmatched paths to `index.html`. Without it a direct hit
on a client-side route (`/browse`, a refreshed page, a shared link) would 404,
since only `/` exists as a real file.

## Team

Group 7 — Capstone Project  
Concha · Esto · Mendez · Miano