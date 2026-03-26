# MarketFlow

Client marketing dashboard: plans, campaign analytics, invoices, tasks, and collaboration in one place.

## Stack

- [Vite](https://vitejs.dev/) + TypeScript + React
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Firebase](https://firebase.google.com/) (Auth, Firestore)

## Setup

Requires [Node.js](https://nodejs.org/) (LTS recommended).

```sh
git clone <YOUR_REPO_URL>
cd marketflow
npm install
cp .env.example .env
# Fill in Firebase and optional email / public URL values
npm run dev
```

Dev server runs at `http://localhost:8080` (see `vite.config.ts`).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Development server       |
| `npm run build`| Production build → `dist`|
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint                   |
| `npm run test` | Vitest                   |

## Deploy

Build with `npm run build`, then host the `dist` folder (e.g. Firebase Hosting, Vercel, Netlify). Use SPA fallback so client routes resolve to `index.html`.

After deploy, set `VITE_APP_URL` and `VITE_PUBLIC_SITE_URL` to your live domain, rebuild, and update `index.html` / `public/sitemap.xml` / `public/robots.txt` if your canonical domain is not `https://app.marketflow.com`.

## Docs

See `APPLICATION_WORKFLOW.md` for routes and product flows.
