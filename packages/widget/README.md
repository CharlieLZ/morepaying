# @morepaying/widget

Browser widget served in the MVP from `apps/web/public/widget.js`.

```html
<script src="/widget.js"></script>
<script>
  MorePaying.init({ projectKey: "mp_proj_demo" })
  MorePaying.ask({ moment: "pricing_exit", plan: "free", payingAmountCents: 0 })
</script>
```
