# MorePaying

Public install for the conversion widget, CLI, MCP, and agent skill.

The hosted product, Worker, D1 store, and billing stay in a private repo. This repository is only the installable subset.

```bash
npx -y --package github:CharlieLZ/morepaying -- morepaying paying
npx -y --package github:CharlieLZ/morepaying -- morepaying-mcp
```

```html
<script src="https://morepaying.com/widget.js"></script>
```

```bash
git clone --depth 1 https://github.com/CharlieLZ/morepaying
cp -R morepaying/packages/skills/morepaying ~/.agents/skills/morepaying
```

Set `MOREPAYING_API=https://morepaying.com` and `MOREPAYING_KEY` to your project key.

Do not put Stripe live secrets or yito keys in this repository.
