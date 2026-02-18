# Rause Up Entertainment — Static Site

This repository is a static website (HTML + CSS). No build tool required.

Quick local preview

```bash
# from the repository root
python3 -m http.server 8000
# then open http://localhost:8000/
```

Publish to GitHub Pages

This repo contains a GitHub Actions workflow that deploys the repository root to GitHub Pages on pushes to `main`.

Files added by the workflow:
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

Notes
- The `CNAME` file is present for a custom domain; verify DNS when using a custom domain.
- Optionally optimize images in `assets/img/` before publishing.
