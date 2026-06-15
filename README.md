# YouTube Analytics

A [Next.js](https://nextjs.org) app for exploring and comparing YouTube channels and discovering trends. Search channels, run AI-assisted analysis on a single channel, compare multiple channels side by side, browse trending topics, and save comparisons to Google Sheets — with Google sign-in backed by Firebase.

## Features

- **Channel search & analysis** — look up channels and get AI-generated summaries of their performance.
- **Channel comparison** — compare multiple channels and let an LLM highlight differences.
- **Trends** — explore trending videos/topics with caching to stay within API quotas.
- **AI summaries** — powered by [Groq](https://groq.com).
- **Google sign-in** — authentication via Firebase Auth.
- **Save to Google Sheets** — persist comparison results to a spreadsheet.

## Tech stack

- **Framework:** Next.js 15 (Pages Router), React 19
- **Styling:** Tailwind CSS
- **Auth & data:** Firebase (Auth + Firestore)
- **APIs:** YouTube Data API v3 (`googleapis`), Google Sheets API (`gapi`)
- **AI:** Groq SDK
- **HTTP:** axios

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# then edit .env.local and fill in your keys (see the table below)

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. `.env.local` is gitignored and must never be committed.

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `NEXT_PUBLIC_YOUTUBE_API_KEY` / `YOUTUBE_API_KEY` | Yes | [Google Cloud Console](https://console.cloud.google.com/) — enable **YouTube Data API v3**. Set both to the same key (one is used client-side, one server-side). |
| `NEXT_PUBLIC_GROQ_API_KEY` / `GROQ_API_KEY` / `groq_api_key` | Yes | [Groq console](https://console.groq.com/keys). The code references the key under three names — set all three to the same value. |
| `NEXT_PUBLIC_GROQ_MODEL` / `groq_api_model` / `QWEN_MODEL_ID` | No | Groq model ids; defaults are provided in code. |
| `NEXT_PUBLIC_FIREBASE_*` (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `MEASUREMENT_ID`) | Yes | [Firebase console](https://console.firebase.google.com/) → Project settings → Your apps → Web app config. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Sheets | Google Cloud Console → OAuth 2.0 **Web** client ID. |
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` | For Sheets | The ID of the spreadsheet comparisons are appended to. |
| `MAX_REQUESTS_PER_MINUTE` | No | Rate limit for the trends API route (default `60`). |

> **Security note:** Earlier revisions of this repo committed the Firebase web config and Google OAuth client ID directly in source. They have since been moved to environment variables. If you treat any of those values as sensitive, rotate them in the Google/Firebase consoles, since they remain in git history.

## Project structure

```
pages/         # Routes: index, search, analyze, compare, trends, videos, searches
pages/api/     # API routes: channel analysis, comparison, trends, cache
lib/           # YouTube/trends helpers, Firebase init, Sheets client, caching
components/    # Nav, Google auth, protected route, debug helpers
contexts/      # AuthContext (auth state)
scripts/       # Maintenance scripts (e.g. cache checks)
styles/        # Global + module CSS
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Run the production build. |
| `npm run lint` | Lint with Next.js ESLint. |
