<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/694da3dc-3acc-4932-853d-93e587ec3d49

## Run Locally

**Prerequisites:** Node.js, MongoDB

1. Install dependencies:
   `npm install`
2. Create `.env` or `.env.local` from [.env.example](.env.example)
3. Set `MONGODB_URI`, for example `mongodb://127.0.0.1:27017`
4. Optionally set `MONGODB_DB_NAME` if you do not want to use the default database name `vote_starmoon_accounting`
5. If you use Gemini features, set `GEMINI_API_KEY`
6. Start MongoDB, then run the app:
   `npm run dev`

Production template:
- Use [.env.production.example](.env.production.example) as the baseline for Render/Railway variables.

## Data Storage

- The backend now stores candidates, votes, and admin settings in MongoDB.
- On the first startup with an empty MongoDB database, the server seeds default candidates automatically.
- If [db.json](db.json) exists from the previous file-based version, the server migrates that data into MongoDB on first startup.

## Deploy Online

You can deploy this app as a single Node service (frontend + backend served by Express).

### Option A: Render (recommended)

1. Push this project to GitHub.
2. In Render, create a **Web Service** from this repository.
3. Use the following settings:
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start`
4. Add environment variables in Render:
   - `NODE_ENV=production`
   - `PORT=10000` (Render usually provides this automatically)
   - `MONGODB_URI=...`
   - `MONGODB_DB_NAME=acc_vote` (or your preferred db name)
   - `GEMINI_API_KEY=...` (optional)
5. Deploy and open your Render URL.

### Option B: Railway

1. Create a new project from this GitHub repository.
2. Set variables in Railway:
   - `NODE_ENV=production`
   - `MONGODB_URI=...`
   - `MONGODB_DB_NAME=acc_vote`
   - `GEMINI_API_KEY=...` (optional)
3. Railway can auto-detect Node, then run:
   - Build: `npm run build`
   - Start: `npm run start`

## CI/CD With GitHub Actions

This repo uses split workflows:

1. CI for pull requests: `.github/workflows/ci.yml`
2. CD for main branch: `.github/workflows/cd-render.yml`

### CI (Pull Request)

Runs on every PR targeting `main` and does:
1. Install dependencies
2. Type check (`npm run lint`)
3. Build (`npm run build`)

### CD (Main Branch)

Runs on every push to `main` and does:
1. Install dependencies
2. Type check (`npm run lint`)
3. Build (`npm run build`)
4. Trigger Render deploy hook (if configured)

### Required GitHub Secret

Add this secret in GitHub repository settings:

- `RENDER_DEPLOY_HOOK_URL`

How to get it:
1. In Render service settings, open **Deploy Hooks**.
2. Create a new hook for your service.
3. Copy the URL and store it in GitHub as `RENDER_DEPLOY_HOOK_URL`.

If this secret is not set, the workflow still validates build quality but skips deploy trigger.
