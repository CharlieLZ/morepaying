# MorePaying

Public install for the conversion widget, CLI, MCP, and agent skill.

The hosted product, Worker, D1 store, and billing stay in a private repo. This repository is only the installable subset.

Use the project key from your MorePaying project. This key is for that project's
CLI/MCP access; it is not a Stripe secret or a site-wide admin credential.

```bash
export MOREPAYING_KEY='your-project-key'
# Optional: defaults to the hosted service. Set this for a local test server.
export MOREPAYING_API='https://morepaying.com'
npx -y --package github:CharlieLZ/morepaying -- morepaying paying
npx -y --package github:CharlieLZ/morepaying -- morepaying-mcp
```

For an MCP client, add a stdio server with command `npx`, arguments
`["-y", "--package", "github:CharlieLZ/morepaying", "--", "morepaying-mcp"]`,
and `MOREPAYING_KEY` in that server's private environment settings. Start with
the `paying` tool to verify read access. A missing or rejected key returns an
error; it never silently selects a shared demo project.

The server uses [standard MCP stdio framing](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio).

```html
<script src="https://morepaying.com/widget.js"></script>
<script>
  // Demo only: do not use a private CLI/MCP project key in a browser.
  MorePaying.init({ projectKey: "mp_proj_demo", apiBase: "https://morepaying.com" })
  MorePaying.ask({ moment: "pricing_exit", plan: "free" })
</script>
```

```bash
git clone --depth 1 https://github.com/CharlieLZ/morepaying
cp -R morepaying/packages/skills/morepaying ~/.agents/skills/morepaying
```

Use the public demo key for the example above. Before connecting a private
project, configure capture-only authorization; this demo does not establish
that boundary. Never expose your private CLI/MCP key in client-side HTML or
JavaScript.

Do not put Stripe live secrets or yito keys in this repository.
