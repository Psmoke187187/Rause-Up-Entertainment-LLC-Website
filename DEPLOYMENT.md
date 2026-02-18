# GitHub Pages deployment (Raise Up Entertainment LLC)

This repo is configured to deploy your website automatically to **GitHub Pages**.

## What triggers deployment
- Any push to `main` or `master`
- Manual run from **Actions → Deploy static content to Pages → Run workflow**

## One-time GitHub settings
1. Open your repo: `Psmoke187187/Rause-Up-Entertainment-LLC-Website`
2. Go to **Settings → Pages**
3. Under **Build and deployment**, select **GitHub Actions**
4. Save

## Publish your latest changes
1. Merge the latest PR into `main` (or `master`)
2. Go to **Actions** and confirm the deploy workflow passed
3. Open your live site URL from the workflow output

## Domain
- `CNAME` is already present for custom-domain routing.

## Audio previews (important)
If beats do not play, upload these files into `assets/audio/`:
- `Club.mp3`
- `Dark Detroit.mp3`
- `Motovation.mp3`

The player is wired to those filenames by default.
