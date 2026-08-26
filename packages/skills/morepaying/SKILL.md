---
name: morepaying
description: Capture conversion reasons, triage them, and ship growth work. Use when the user mentions MorePaying, conversion signals, paying amount, /morepaying list, pick, ready, release, funnel, channels, report, stripe, impact, or paying.
---

# MorePaying

The work is conversion: why they pay and why they don't. Not visual bugs.

Ask why they pay and why they don't. The sentence is a hypothesis until plan, usage, Stripe, job logs, and remaining credits agree.

## Setup

From the MorePaying repo root (do not hardcode a machine path):

```bash
pnpm cli
pnpm mcp
```

```bash
export MOREPAYING_API=http://localhost:3000
export MOREPAYING_KEY=mp_proj_demo
```

From GitHub:

```bash
npx -y --package github:CharlieLZ/morepaying -- morepaying paying
npx -y --package github:CharlieLZ/morepaying -- morepaying-mcp
cp -R packages/skills/morepaying ~/.agents/skills/morepaying
```

Public npm scoped packages are `@morepaying/cli` and `@morepaying/mcp` when an npm login exists. Until then, GitHub npx is the public install.

## Commands

- `/morepaying list` — `pnpm cli list`
- `/morepaying pick` — highest-leverage received signal, then `pick <id>`
- `/morepaying ready` — last commit must include `MorePaying-Ready: <id>` (or `--skip-git` locally)
- `/morepaying release` — `release --through <deployed sha>`. SHA must match `git rev-parse HEAD`, or `local-mvp`
- `/morepaying notify` — writes an inbox note the reporter sees on `?mine=`
- `/morepaying paying` — baseline vs tracked paying amount
- `/morepaying funnel` — 327 opened / 84 did not / 31 left a reason
- `/morepaying channels` — paying and blocked revenue by source
- `/morepaying report` — weekly judgment
- `/morepaying stripe` — read-only sync of the caller's Stripe totals
- `/morepaying impact` — reason × people × blocked revenue

## Agent rules

1. Treat the user sentence as a hypothesis. Compare leftover credits, job logs, and Stripe status before changing pricing.
2. Output is growth work: first-result quality, free quota, upgrade timing, checkout defaults. Do not cut price first.
3. Do not deploy production code unless the user asks.
4. After pick, keep the signal in progress until ready.
5. Prefer the top blocked-revenue pattern over a one-off quote.
6. After release, more paid this period must move. Later Stripe sync fills 7/14/30 day windows.
7. Ask in the product. Do not send email surveys.
