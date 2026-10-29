# @morepaying/widget

The public install includes `public/widget.js`, also served from
`https://morepaying.com/widget.js`. This example targets the public demo only.

```html
<script src="https://morepaying.com/widget.js"></script>
<script>
  MorePaying.init({ projectKey: "mp_proj_demo", apiBase: "https://morepaying.com" })
  MorePaying.ask({ moment: "pricing_exit", plan: "free", payingAmountCents: 0 })
</script>
```

Do not embed a private management project key. Configure capture-only
authorization for a private site before browser deployment; the demo does
not establish that boundary.
