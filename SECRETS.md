# GitHub Secrets Required

This project uses DigitalOcean deployment via GitHub Actions. Configure these secrets in your repository settings.

**Settings → Secrets and variables → Actions**

## Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `DO_HOST` | Production DigitalOcean droplet IP/hostname | `162.243.1.1` |
| `DO_HOST_STAGING` | Staging DigitalOcean droplet IP/hostname | `162.243.1.2` |
| `DO_PORT` | SSH port | `22` |
| `DO_USER` | SSH user | `root` |
| `DO_SSH_KEY` | SSH private key for the droplet | (private key content) |
| `BACKEND_URL` | Public production backend URL | `https://server.shohojhisab.com` |
| `BACKEND_URL_STAGING` | Public staging backend URL | `https://staging.shohojhisab.com` |
| `FRONTEND_URL` | Public production frontend URL | `https://shohojhisab.com` |
| `FRONTEND_URL_STAGING` | Public staging frontend URL | `https://staging.shohojhisab.com` |

## Adding Secrets via CLI

```bash
gh auth login
gh secret set DO_HOST --body="162.243.1.1" --repo="owner/repo"
gh secret set DO_SSH_KEY --body="$(cat ~/.ssh/id_ed25519)" --repo="owner/repo"
gh secret set BACKEND_URL --body="https://server.shohojhisab.com" --repo="owner/repo"
```

## Workflow Triggers

| Trigger | Environment |
|---------|-------------|
| Push to `main` | Production (auto-deploy via SSH) |
| Push to `develop` | Staging (auto-deploy via SSH) |
| `workflow_dispatch` | User-selected environment |
| Release published | Production |

All deployments use SSH + `corepack`/`pnpm` on the DigitalOcean droplet. No Docker involved.
