# Protein Tracker (Hebrew) — Ready for GitHub Pages

## Quick start (no terminal needed)
1. Create a **public** repo on GitHub named **protein-tracker** (exact name).
2. Click **Add file → Upload files** and upload everything from this folder.
3. Go to **Settings → Pages** and set **Build and deployment** to **GitHub Actions**.
4. Wait ~1–2 minutes for the action to finish. Your site will be live at:
   `https://<your-username>.github.io/protein-tracker/`

> If you change the repository name, edit `vite.config.js` and set `base: "/<your-repo-name>/"`.

## Local run (optional)
```bash
npm i
npm run dev
```

## Features
- Daily protein target (auto by weight or manual)
- Add entries by grams or by free text (Hebrew parser — "ביצה אחת", "150 גרם חזה עוף", "סקופ חלבון", "סלמון", "עדשים מבושלות", "חלב סויה", "פיתה", "לחם חלבוני")
- 14-day history chart (Recharts)
- Local storage only (no server)
