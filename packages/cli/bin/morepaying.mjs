#!/usr/bin/env node

import { assertReadyGit, assertReleaseSha } from "../git-verify.mjs"

const API = process.env.MOREPAYING_API || "http://localhost:3000"
const KEY = process.env.MOREPAYING_KEY || "mp_proj_demo"

function arg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

async function api(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Project-Key": KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || res.statusText)
  }
  return data
}

function print(value) {
  console.log(JSON.stringify(value, null, 2))
}

const [command, id] = process.argv.slice(2)
const status = arg("--status")
const summary = arg("--summary")
const sha = arg("--through")
const body = arg("--body")
const canonical = arg("--canonical")
const assignee = arg("--assignee")
const archived = process.argv.includes("--archived")
const skipGit = process.argv.includes("--skip-git")

try {
  if (command === "list") {
    const query = new URLSearchParams()
    if (status) query.set("status", status)
    if (archived) query.set("archived", "1")
    print(await api(query.toString() ? `/api/signals?${query}` : "/api/signals"))
  } else if (command === "show" && id) {
    print(await api(`/api/signals/${id}`))
  } else if (command === "pick" && id) {
    print(await api(`/api/signals/${id}`, { action: "pick" }))
  } else if (command === "ready" && id) {
    assertReadyGit(id, skipGit)
    print(await api(`/api/signals/${id}`, { action: "ready", summary }))
  } else if (command === "release") {
    const through = assertReleaseSha(sha || "local-mvp")
    const listed = await api("/api/signals?status=pending_release")
    const shipped = []
    for (const signal of listed.signals) {
      shipped.push(await api(`/api/signals/${signal.id}`, { action: "release", sha: through }))
    }
    print({ shipped })
  } else if (command === "decline" && id) {
    print(await api(`/api/signals/${id}`, { action: "decline", summary }))
  } else if (command === "reopen" && id) {
    print(await api(`/api/signals/${id}`, { action: "reopen" }))
  } else if (command === "respond" && id) {
    print(await api(`/api/signals/${id}`, { action: "respond", body }))
  } else if (command === "archive" && id) {
    print(await api(`/api/signals/${id}`, { action: "archive" }))
  } else if (command === "restore" && id) {
    print(await api(`/api/signals/${id}`, { action: "restore" }))
  } else if (command === "duplicate" && id) {
    print(await api(`/api/signals/${id}`, { action: "duplicate", canonical }))
  } else if (command === "assign" && id) {
    print(await api(`/api/signals/${id}`, { action: "assign", assignee }))
  } else if (command === "paying") {
    print(await api("/api/paying"))
  } else if (command === "impact") {
    print(await api("/api/impact"))
  } else if (command === "funnel") {
    print(await api("/api/funnel"))
  } else if (command === "channels") {
    const data = await api("/api/report")
    print(data.channels)
  } else if (command === "report") {
    print(await api("/api/report"))
  } else if (command === "stripe") {
    const amount = Number(arg("--amount"))
    const customers = Number(arg("--customers"))
    print(
      await api("/api/stripe/sync", {
        currentAmountCents: Number.isFinite(amount) ? amount : undefined,
        currentCustomers: Number.isFinite(customers) ? customers : undefined,
      }),
    )
  } else if (command === "notify" && id) {
    print(await api(`/api/signals/${id}`, { action: "notify", body: body || summary }))
  } else {
    console.log(`MorePaying CLI

  list [--status received|in_progress|pending_release|shipped]
  show <id>
  pick <id>
  ready <id> --summary "..." [--skip-git]
  release --through <sha>
  decline <id>
  reopen <id>
  respond <id> --body "..."
  archive <id>
  restore <id>
  duplicate <id> --canonical <id>
  assign <id> --assignee name
  notify <id> --body "..."
  paying
  impact
  funnel
  channels
  report
  stripe [--amount cents] [--customers n]

API ${API}
`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
