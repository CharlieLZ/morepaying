# Public install verification — 2026-10-29

Base `580c3a2849aa3c22e9febdcb29cb8ed8c46e99fb`.

MCP stdio used Content-Length frames and did not answer normal newline-delimited
MCP clients. The server now uses standard UTF-8 JSON lines. HTTP errors return
failed tool results. CLI/MCP default to the hosted service and require an
explicit private project key, instead of silently using a shared demo project.
The README and bundled skill show configuration before invocation and do not
present fixed demo funnel counts as current data.

Verification: four Node tests passed, including fragmented initialization,
tool discovery, read-only GET with a project key, HTTP 401, and missing key.
`npm pack` produced 13 public files, with no private service configuration.
Both binaries were installed from that archive through `npm exec`; the CLI and
MCP read a synthetic project's totals from a local server. The actual widget
UI selected Price and submitted a synthetic reason through an intercepted
request. No external write occurred; Chromium reported no JavaScript errors
and its isolated process group exited. Coordinating proof:
`artifacts/nevo-fleet-execution-20261029/morepaying-install.json`.

The widget example and validation use demo data only. Private project browser
authorization was not established by this public package test. Management
credentials must stay outside browser code; integration with private capture
credentials is a separate hosted-product task.

Package installation proof is not evidence of real payment uplift. No package
release, main-branch merge, production deployment, mail or payment was made.
