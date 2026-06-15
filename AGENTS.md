# NeuoTech.com Autonomous Agents

Three GitHub Actions agents run on schedule — no human intervention needed.

## Agents

1. **News Publisher** — Mon/Wed/Fri 8am UTC — writes neurotech news article → content/news/
2. **Directory Updater** — Monday 8am UTC — adds 3 new neurotech companies → content/companies/
3. **Newsletter Composer** — Sunday 9am UTC — sends NeuoTech Digest to Resend audience

## Required Secrets (GitHub repo settings)

- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `NEUROTECH_AUDIENCE_ID`

## Required Env Vars (Netlify)

- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `NEUROTECH_AUDIENCE_ID` — create audience in Resend dashboard, paste ID here
- `ADMIN_PIN` — 361325
- `GITHUB_TOKEN` — for admin dashboard agent status
