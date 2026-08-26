#!/usr/bin/env node

import { assertReadyGit, assertReleaseSha } from "../cli/git-verify.mjs"

const API = process.env.MOREPAYING_API || "http://localhost:3000"
const KEY = process.env.MOREPAYING_KEY || "mp_proj_demo"

const TOOLS = [
  { name: "list", description: "Browse conversion signals", inputSchema: { type: "object", properties: { status: { type: "string" } } } },
  { name: "detail", description: "Read one signal", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "pick", description: "Claim a signal", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "ready", description: "Mark pending release. Requires git trailer MorePaying-Ready: <id> unless skipGit.", inputSchema: { type: "object", properties: { id: { type: "string" }, summary: { type: "string" }, skipGit: { type: "boolean" } }, required: ["id"] } },
  { name: "decline", description: "Close as not planned", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "reopen", description: "Return to received", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "archive", description: "Archive one signal", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "restore", description: "Restore an archived signal", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "duplicate", description: "Link and close a duplicate", inputSchema: { type: "object", properties: { id: { type: "string" }, canonical: { type: "string" } }, required: ["id"] } },
  { name: "paying", description: "Baseline vs more paid this period", inputSchema: { type: "object", properties: {} } },
  { name: "release", description: "Ship a signal through a SHA that must match git HEAD, or local-mvp", inputSchema: { type: "object", properties: { id: { type: "string" }, sha: { type: "string" } }, required: ["id", "sha"] } },
  { name: "respond", description: "Close with a response", inputSchema: { type: "object", properties: { id: { type: "string" }, body: { type: "string" } }, required: ["id"] } },
  { name: "assign", description: "Assign a signal", inputSchema: { type: "object", properties: { id: { type: "string" }, assignee: { type: "string" } }, required: ["id"] } },
  { name: "notify", description: "Write an inbox note the reporter can see on the public board", inputSchema: { type: "object", properties: { id: { type: "string" }, body: { type: "string" } }, required: ["id"] } },
  { name: "impact", description: "Reason × people × blocked revenue", inputSchema: { type: "object", properties: {} } },
  { name: "funnel", description: "327 opened / 84 did not upgrade / 31 left a reason", inputSchema: { type: "object", properties: {} } },
  { name: "channels", description: "Paying and blocked revenue by source", inputSchema: { type: "object", properties: {} } },
  { name: "report", description: "Weekly founder judgment", inputSchema: { type: "object", properties: {} } },
  { name: "stripe", description: "Read-only paying sync from the caller's Stripe totals", inputSchema: { type: "object", properties: { currentAmountCents: { type: "number" }, currentCustomers: { type: "number" } } } },
]

async function api(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Project-Key": KEY },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function callTool(name, args = {}) {
  switch (name) {
    case "list":
      return api(args.status ? `/api/signals?status=${encodeURIComponent(args.status)}` : "/api/signals")
    case "detail":
      return api(`/api/signals/${args.id}`)
    case "pick":
      return api(`/api/signals/${args.id}`, { action: "pick" })
    case "ready":
      assertReadyGit(args.id, args.skipGit)
      return api(`/api/signals/${args.id}`, { action: "ready", summary: args.summary })
    case "decline":
      return api(`/api/signals/${args.id}`, { action: "decline" })
    case "reopen":
      return api(`/api/signals/${args.id}`, { action: "reopen" })
    case "archive":
      return api(`/api/signals/${args.id}`, { action: "archive" })
    case "restore":
      return api(`/api/signals/${args.id}`, { action: "restore" })
    case "duplicate":
      return api(`/api/signals/${args.id}`, { action: "duplicate", canonical: args.canonical })
    case "paying":
      return api("/api/paying")
    case "release": {
      const sha = assertReleaseSha(args.sha)
      return api(`/api/signals/${args.id}`, { action: "release", sha })
    }
    case "respond":
      return api(`/api/signals/${args.id}`, { action: "respond", body: args.body })
    case "assign":
      return api(`/api/signals/${args.id}`, { action: "assign", assignee: args.assignee })
    case "notify":
      return api(`/api/signals/${args.id}`, { action: "notify", body: args.body })
    case "impact":
      return api("/api/impact")
    case "funnel":
      return api("/api/funnel")
    case "channels":
      return api("/api/report").then((data) => data.channels)
    case "report":
      return api("/api/report")
    case "stripe":
      return api("/api/stripe/sync", {
        currentAmountCents: args.currentAmountCents,
        currentCustomers: args.currentCustomers,
      })
    default:
      throw new Error(`Unknown tool ${name}`)
  }
}

function write(message) {
  const json = JSON.stringify(message)
  const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`
  process.stdout.write(header + json)
}

function handle(message) {
  const id = message.id
  if (message.method === "initialize") {
    write({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "morepaying", version: "0.0.1" },
      },
    })
    return
  }
  if (message.method === "notifications/initialized") return
  if (message.method === "tools/list") {
    write({ jsonrpc: "2.0", id, result: { tools: TOOLS } })
    return
  }
  if (message.method === "tools/call") {
    Promise.resolve()
      .then(() => callTool(message.params?.name, message.params?.arguments || {}))
      .then((result) => {
        write({
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
        })
      })
      .catch((error) => {
        write({ jsonrpc: "2.0", id, error: { code: -32000, message: String(error.message || error) } })
      })
    return
  }
  if (id != null) {
    write({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method ${message.method}` } })
  }
}

let buffer = Buffer.alloc(0)
process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n")
    if (headerEnd === -1) return
    const header = buffer.slice(0, headerEnd).toString("utf8")
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      buffer = buffer.slice(headerEnd + 4)
      continue
    }
    const length = Number(match[1])
    const start = headerEnd + 4
    if (buffer.length < start + length) return
    const body = buffer.slice(start, start + length).toString("utf8")
    buffer = buffer.slice(start + length)
    handle(JSON.parse(body))
  }
})
