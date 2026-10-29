import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { createInterface } from "node:readline"
import { once } from "node:events"
import test from "node:test"

const root = new URL("../", import.meta.url)
async function fixture(t, authenticated = true) {
  const requests = []
  const server = createServer((req, res) => {
    requests.push({ path: req.url, method: req.method, key: req.headers["x-project-key"] })
    res.writeHead(authenticated ? 200 : 401, { "content-type": "application/json" })
    res.end(JSON.stringify(authenticated ? { current: 42, note: "演示" } : { error: "Unauthorized" }))
  }).listen(0, "127.0.0.1")
  await once(server, "listening")
  t.after(() => server.close())
  return { requests, env: { ...process.env, MOREPAYING_API: `http://127.0.0.1:${server.address().port}`, MOREPAYING_KEY: "test-project-key" } }
}
function client(t, env) {
  const child = spawn(process.execPath, ["packages/mcp/server.mjs"], { cwd: root, env })
  const pending = new Map()
  const lines = createInterface({ input: child.stdout })
  lines.on("line", line => {
    const response = JSON.parse(line)
    const resolve = pending.get(response.id)
    if (resolve) { pending.delete(response.id); resolve(response) }
  })
  t.after(async () => { const exited = once(child, "exit"); child.stdin.end(); await exited })
  return {
    child,
    request(message, fragment = false) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("MCP response timed out")), 2000)
        pending.set(message.id, value => { clearTimeout(timeout); resolve(value) })
        const data = Buffer.from(JSON.stringify(message) + "\n")
        if (fragment) { child.stdin.write(data.subarray(0, 17)); child.stdin.write(data.subarray(17)) }
        else child.stdin.write(data)
      })
    },
  }
}
test("standard MCP stdio initializes, lists tools and reads project totals", async t => {
  const f = await fixture(t), c = client(t, f.env)
  const init = await c.request({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "验证", version: "1" } } }, true)
  assert.equal(init.result.serverInfo.name, "morepaying")
  c.child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
  const list = await c.request({ jsonrpc: "2.0", id: 2, method: "tools/list" })
  assert(list.result.tools.some(tool => tool.name === "paying"))
  const result = await c.request({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "paying", arguments: {} } })
  assert.equal(JSON.parse(result.result.content[0].text).current, 42)
  assert.deepEqual(f.requests, [{ path: "/api/paying", method: "GET", key: "test-project-key" }])
})
test("MCP reports API authentication failures as failed tool results", async t => {
  const f = await fixture(t, false), c = client(t, f.env)
  const response = await c.request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "paying" } })
  assert.equal(response.result.isError, true)
  assert.equal(response.result.content[0].text, "Unauthorized")
})
test("MCP discovery needs no key, API calls explain missing configuration", async t => {
  const env = { ...process.env }; delete env.MOREPAYING_KEY
  const c = client(t, env)
  const result = await c.request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "paying" } })
  assert.equal(result.result.isError, true)
  assert.match(result.result.content[0].text, /Set MOREPAYING_KEY/)
})
test("CLI uses only the caller's project key and returns a failure for HTTP 401", async t => {
  for (const authenticated of [true, false]) {
    const f = await fixture(t, authenticated)
    const child = spawn(process.execPath, ["packages/cli/bin/morepaying.mjs", "paying"], { cwd: root, env: f.env })
    let out = "", err = ""
    child.stdout.on("data", b => out += b); child.stderr.on("data", b => err += b)
    const [code] = await once(child, "exit")
    assert.equal(code, authenticated ? 0 : 1)
    if (authenticated) assert.equal(JSON.parse(out).current, 42)
    else assert.match(err, /Unauthorized/)
    assert.equal(f.requests[0].key, "test-project-key")
  }
})
