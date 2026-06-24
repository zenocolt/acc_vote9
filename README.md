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

## Data Storage

- The backend now stores candidates, votes, and admin settings in MongoDB.
- On the first startup with an empty MongoDB database, the server seeds default candidates automatically.
- If [db.json](db.json) exists from the previous file-based version, the server migrates that data into MongoDB on first startup.
