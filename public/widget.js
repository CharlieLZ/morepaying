(function () {
  if (window.MorePaying) return

  var QUESTIONS = {
    signup: {
      en: "What made creating an account not worth paying for yet?",
      zh: "是什么让注册之后还不值得付钱？",
    },
    first_result: {
      en: "What almost stopped you from continuing?",
      zh: "刚才有什么差点让你停下来？",
    },
    pricing_exit: {
      en: "What's the main reason you're not upgrading today?",
      zh: "今天不升级，主要是因为什么？",
    },
    checkout: {
      en: "What stopped you from finishing payment?",
      zh: "刚才是什么让你没有完成付款？",
    },
    upgrade: {
      en: "Why stay on this plan today?",
      zh: "今天为什么还留在这个套餐？",
    },
    paid: {
      en: "What made you pay today?",
      zh: "今天是什么让你付钱的？",
    },
    cancel: {
      en: "What's the main reason you want to cancel?",
      zh: "你想取消，主要是因为什么？",
    },
    custom: {
      en: "What almost became a payment — or what made you pay?",
      zh: "刚才差点付钱，或已经付钱，是因为什么？",
    },
  }

  var DONT = [
    ["first_result_not_good", "First result wasn't good enough", "第一次结果不够好"],
    ["not_sure_can_do_task", "Not sure it can do my task", "不确定能不能完成我的任务"],
    ["price", "Price", "价格"],
    ["credits_confusing", "Credits or limits are confusing", "额度/限制看不懂"],
    ["free_enough", "Free plan is enough", "免费版已经够用"],
    ["payment_failed", "Payment failed or I didn't trust checkout", "支付失败或不信任结账"],
    ["comparing", "Comparing another tool", "在比别的工具"],
    ["other", "Other", "其他"],
  ]

  var PAY = [
    ["result_worth_it", "The result was worth paying for", "结果值得付钱"],
    ["hit_a_limit", "I hit a limit I needed to keep going", "碰到了必须付才能继续的限制"],
    ["needed_to_keep", "I needed to keep or export the result", "需要保存或导出结果"],
    ["trusted_checkout", "Checkout was clear and trusted", "结账清楚、敢付"],
    ["other_pay", "Other", "其他"],
  ]

  var UI = {
    en: {
      tab: "One question",
      titlePay: "What made you pay?",
      titleDont: "Why aren't you upgrading?",
      placeholder: "Optional: one sentence",
      send: "Send",
      pin: "Pin",
      close: "Close",
      pick: "Pick one reason. That's the whole survey.",
      fail: "Could not send.",
      failRun: "Could not send. Is the MorePaying app running?",
      saved: "Saved as ",
      watch: "Watch it on the board",
      pinned: "Pinned ",
    },
    zh: {
      tab: "只问一句",
      titlePay: "今天为什么付钱？",
      titleDont: "今天为什么不升级？",
      placeholder: "可选：一句话",
      send: "发送",
      pin: "钉住",
      close: "关闭",
      pick: "选一个原因。问卷就这一题。",
      fail: "没发出去。",
      failRun: "没发出去。MorePaying 应用在跑吗？",
      saved: "已保存为 ",
      watch: "去公开板看进度",
      pinned: "已钉住 ",
    },
  }

  var state = {
    projectKey: "mp_proj_demo",
    apiBase: "",
    tabText: "One question",
    tabTextLocked: false,
    locale: "en",
    ready: false,
    pinMode: false,
    pinnedSelector: "",
    errors: [],
    identity: {
      userId: "",
      plan: "",
      usage: "",
      stripeCustomerId: "",
      payingAmountCents: null,
      creditsRemaining: null,
      creditsLimit: null,
      generations: null,
      firstSuccess: null,
      signedUpAt: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      channel: "",
      pricingDwellMs: null,
      stripeStatus: "",
      stripeAmountCents: null,
      jobsSucceeded: null,
      jobsFailed: null,
    },
    userTokenFn: null,
    pricingViewedAt: 0,
    anonymousId: "",
    reasonKey: "",
  }

  var originalError = console.error
  console.error = function () {
    try {
      state.errors.push(Array.prototype.slice.call(arguments).map(String).join(" ").slice(0, 240))
      if (state.errors.length > 8) state.errors.shift()
    } catch (err) {}
    return originalError.apply(console, arguments)
  }

  function $(id) {
    return document.getElementById(id)
  }

  function aid() {
    try {
      var existing = localStorage.getItem("mp_aid")
      if (existing) return existing
      var next = "anon_" + Math.random().toString(36).slice(2, 10)
      localStorage.setItem("mp_aid", next)
      return next
    } catch (err) {
      return "anon_session"
    }
  }

  function loadIdentity() {
    try {
      var raw = localStorage.getItem("mp_identity")
      if (raw) state.identity = Object.assign(state.identity, JSON.parse(raw))
    } catch (err) {}
    state.anonymousId = aid()
    pullUtms()
  }

  function shortChannel(value) {
    var raw = String(value || "").trim().toLowerCase()
    if (!raw) return ""
    if (raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0) {
      try {
        return new URL(raw).hostname.replace(/^www\./, "") || "direct"
      } catch (err) {
        return "direct"
      }
    }
    return raw.slice(0, 40)
  }

  function pullUtms() {
    try {
      var params = new URLSearchParams(location.search)
      if (params.get("utm_source") && !state.identity.utmSource) state.identity.utmSource = params.get("utm_source")
      if (params.get("utm_medium") && !state.identity.utmMedium) state.identity.utmMedium = params.get("utm_medium")
      if (params.get("utm_campaign") && !state.identity.utmCampaign) state.identity.utmCampaign = params.get("utm_campaign")
      if (!state.identity.channel) {
        state.identity.channel =
          shortChannel(state.identity.utmSource) || shortChannel(document.referrer) || "direct"
      } else {
        state.identity.channel = shortChannel(state.identity.channel) || "direct"
      }
    } catch (err) {}
  }

  function pingFunnel(event) {
    try {
      if (event === "pricing_view") {
        if (sessionStorage.getItem("mp_pricing_viewed")) return
        sessionStorage.setItem("mp_pricing_viewed", "1")
      }
    } catch (err) {}
    fetch(state.apiBase + "/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Project-Key": state.projectKey },
      body: JSON.stringify({ event: event }),
    }).catch(function () {})
  }

  function saveIdentity() {
    try {
      localStorage.setItem("mp_identity", JSON.stringify(state.identity))
    } catch (err) {}
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value)
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&")
  }

  function selectorFor(el) {
    if (!el || el === document.body) return "body"
    if (el.id) return "#" + cssEscape(el.id)
    var name = el.tagName.toLowerCase()
    var cls =
      el.className && typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).map(cssEscape).join(".")
        : ""
    return selectorFor(el.parentElement) + " > " + name + cls
  }

  function reasonsFor(moment) {
    return moment === "paid" ? PAY : DONT
  }

  function detectLocale(explicit) {
    if (explicit === "zh-CN" || explicit === "zh" || explicit === "zh-Hans") return "zh-CN"
    if (explicit === "en") return "en"
    try {
      var lang = document.documentElement.getAttribute("lang") || ""
      if (lang.indexOf("zh") === 0) return "zh-CN"
      if (location.pathname.indexOf("/zh-CN") === 0) return "zh-CN"
    } catch (err) {}
    return "en"
  }

  function ui() {
    return state.locale === "zh-CN" ? UI.zh : UI.en
  }

  function langKey() {
    return state.locale === "zh-CN" ? "zh" : "en"
  }

  function applyLocale() {
    var copy = ui()
    var tab = $("mp-tab")
    if (tab && !state.tabTextLocked) {
      state.tabText = copy.tab
      tab.textContent = state.tabText
    } else if (tab) {
      tab.textContent = state.tabText
    }
    var send = $("mp-send")
    var pin = $("mp-pin")
    var close = $("mp-close")
    var body = $("mp-body")
    if (send) send.textContent = copy.send
    if (pin) pin.textContent = copy.pin
    if (close) close.textContent = copy.close
    if (body) body.placeholder = copy.placeholder
  }

  function ensureUi() {
    if ($("mp-root")) return
    var style = document.createElement("style")
    style.textContent =
      "#mp-tab{position:fixed;right:0;top:45%;z-index:2147483000;transform:rotate(-90deg) translateX(50%);transform-origin:right center;border:0;background:var(--mp-primary,#10b981);color:var(--mp-on-primary,#fff);padding:8px 14px;border-radius:8px 8px 0 0;font:13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}" +
      "#mp-root{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}" +
      "#mp-panel{width:min(420px,calc(100vw - 24px));background:#fff;color:#111;border-radius:16px;padding:20px;font:14px/1.45 Inter,system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.2)}" +
      "#mp-panel h2{margin:0 0 8px;font-size:18px}#mp-panel p{margin:0 0 12px;color:#525252}" +
      "#mp-reasons{display:flex;flex-direction:column;gap:6px;margin:12px 0}" +
      "#mp-reasons button{text-align:left;border:1px solid #e5e5e5;background:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;font:inherit}" +
      "#mp-reasons button[data-on='1']{border-color:var(--mp-primary,#10b981);background:#ecfdf3}" +
      "#mp-panel textarea{width:100%;box-sizing:border-box;border:1px solid #e5e5e5;border-radius:8px;padding:8px;font:inherit;display:none}" +
      "#mp-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}" +
      "#mp-actions button{border:0;border-radius:8px;padding:8px 12px;cursor:pointer;font:inherit}" +
      "#mp-send{background:var(--mp-primary,#10b981);color:var(--mp-on-primary,#fff)}#mp-pin,#mp-close{background:#f5f5f5}" +
      "#mp-receipt{display:none;margin-top:8px;font-size:13px;color:var(--mp-primary,#10b981)}"
    document.head.appendChild(style)

    var tab = document.createElement("button")
    tab.id = "mp-tab"
    tab.type = "button"
    tab.textContent = state.tabText
    tab.addEventListener("click", function () {
      openPanel({ moment: "custom" })
    })
    document.body.appendChild(tab)

    var root = document.createElement("div")
    root.id = "mp-root"
    root.innerHTML =
      '<div id="mp-panel">' +
      "<h2 id='mp-title'>One question</h2>" +
      '<p id="mp-q"></p>' +
      '<div id="mp-reasons"></div>' +
      '<textarea id="mp-body" rows="3" placeholder="Optional: one sentence"></textarea>' +
      '<p id="mp-pin-label" style="font-size:12px;color:#737373"></p>' +
      '<p id="mp-receipt"></p>' +
      '<div id="mp-actions">' +
      '<button type="button" id="mp-send">Send</button>' +
      '<button type="button" id="mp-pin">Pin</button>' +
      '<button type="button" id="mp-close">Close</button>' +
      "</div></div>"
    document.body.appendChild(root)

    $("mp-close").addEventListener("click", closePanel)
    $("mp-root").addEventListener("click", function (event) {
      if (event.target === root) closePanel()
    })
    $("mp-pin").addEventListener("click", function () {
      state.pinMode = true
      closePanel()
    })
    $("mp-send").addEventListener("click", submit)
    document.addEventListener(
      "click",
      function (event) {
        if (!state.pinMode) return
        if (event.target.closest("#mp-root,#mp-tab")) return
        event.preventDefault()
        event.stopPropagation()
        state.pinnedSelector = selectorFor(event.target)
        state.pinMode = false
        openPanel({})
      },
      true,
    )
  }

  function renderReasons(moment) {
    var box = $("mp-reasons")
    box.innerHTML = ""
    reasonsFor(moment).forEach(function (pair) {
      var btn = document.createElement("button")
      btn.type = "button"
      btn.textContent = state.locale === "zh-CN" ? pair[2] : pair[1]
      btn.dataset.key = pair[0]
      btn.addEventListener("click", function () {
        state.reasonKey = pair[0]
        Array.prototype.forEach.call(box.querySelectorAll("button"), function (el) {
          el.dataset.on = el === btn ? "1" : "0"
        })
        $("mp-body").style.display = pair[0].indexOf("other") === 0 ? "block" : "none"
      })
      box.appendChild(btn)
    })
  }

  function openPanel(opts) {
    ensureUi()
    loadIdentity()
    opts = opts || {}
    var moment = opts.moment || $("mp-root").dataset.moment || "custom"
    $("mp-root").dataset.moment = moment
    $("mp-root").style.display = "flex"
    applyLocale()
    var copy = ui()
    var question = QUESTIONS[moment] || QUESTIONS.custom
    $("mp-title").textContent = moment === "paid" ? copy.titlePay : copy.titleDont
    $("mp-q").textContent = question[langKey()]
    $("mp-receipt").style.display = "none"
    $("mp-body").value = ""
    $("mp-body").style.display = "none"
    state.reasonKey = ""
    if (opts.plan) state.identity.plan = opts.plan
    if (opts.usage) state.identity.usage = opts.usage
    if (typeof opts.payingAmountCents === "number") state.identity.payingAmountCents = opts.payingAmountCents
    if (opts.userId) state.identity.userId = opts.userId
    saveIdentity()
    renderReasons(moment)
    $("mp-pin-label").textContent = state.pinnedSelector ? ui().pinned + state.pinnedSelector : ""
  }

  function closePanel() {
    var root = $("mp-root")
    if (root) root.style.display = "none"
  }

  function snapshotFor(selector) {
    if (!selector) return ""
    try {
      var el = document.querySelector(selector)
      return el && el.outerHTML ? String(el.outerHTML).slice(0, 4000) : ""
    } catch (err) {
      return ""
    }
  }

  function submit() {
    if (!state.reasonKey) {
      $("mp-q").textContent = ui().pick
      return
    }
    var moment = $("mp-root").dataset.moment || "custom"
    var payload = {
      moment: moment,
      reasonKey: state.reasonKey,
      body: $("mp-body").value,
      url: location.href,
      title: document.title,
      viewport: window.innerWidth + "x" + window.innerHeight + "@" + (window.devicePixelRatio || 1),
      userAgent: navigator.userAgent,
      consoleErrors: state.errors.slice(),
      pinnedSelector: state.pinnedSelector,
      domSnapshot: snapshotFor(state.pinnedSelector),
      plan: state.identity.plan,
      usage: state.identity.usage,
      payingAmountCents: state.identity.payingAmountCents,
      userId: state.identity.userId,
      anonymousId: state.anonymousId,
      stripeCustomerId: state.identity.stripeCustomerId,
      creditsRemaining: state.identity.creditsRemaining,
      creditsLimit: state.identity.creditsLimit,
      generations: state.identity.generations,
      firstSuccess: state.identity.firstSuccess,
      signedUpAt: state.identity.signedUpAt,
      utmSource: state.identity.utmSource,
      utmMedium: state.identity.utmMedium,
      utmCampaign: state.identity.utmCampaign,
      channel: state.identity.channel,
      pricingDwellMs:
        state.pricingViewedAt && moment === "pricing_exit"
          ? Date.now() - state.pricingViewedAt
          : state.identity.pricingDwellMs,
      stripeStatus: state.identity.stripeStatus,
      stripeAmountCents: state.identity.stripeAmountCents,
      jobsSucceeded: state.identity.jobsSucceeded,
      jobsFailed: state.identity.jobsFailed,
    }

    function send(token) {
      var headers = { "Content-Type": "application/json", "X-Project-Key": state.projectKey }
      if (token) {
        headers["X-User-Token"] = token
        payload.userToken = token
      }
      return fetch(state.apiBase + "/api/signals", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      })
    }

    var tokenPromise = state.userTokenFn ? Promise.resolve(state.userTokenFn()) : Promise.resolve("")
    tokenPromise
      .then(function (token) {
        return send(token)
      })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data }
        })
      })
      .then(function (result) {
        if (!result.ok) {
          $("mp-q").textContent = (result.data && result.data.error) || ui().fail
          return
        }
        var signal = result.data.signal
        var receipt = $("mp-receipt")
        receipt.style.display = "block"
        var token = signal && signal.reporterToken
        var id = signal && signal.id
        var boardPath = state.locale === "zh-CN" ? "/zh-CN/board/demo" : "/board/demo"
        var copy = ui()
        receipt.innerHTML =
          copy.saved +
          (id || "report") +
          '. <a href="' +
          state.apiBase +
          boardPath +
          (token ? "?mine=" + encodeURIComponent(token) : "") +
          '">' +
          copy.watch +
          "</a>"
        $("mp-body").value = ""
      })
      .catch(function () {
        $("mp-q").textContent = ui().failRun
      })
  }

  function bindAuto() {
    document.addEventListener(
      "click",
      function (event) {
        var node = event.target.closest && event.target.closest("[data-mp-moment]")
        if (!node) return
        window.MorePaying.track(node.getAttribute("data-mp-moment"))
      },
      true,
    )
  }

  window.MorePaying = {
    init: function (opts) {
      opts = opts || {}
      loadIdentity()
      state.projectKey = opts.projectKey || state.projectKey
      if (opts.apiBase) state.apiBase = opts.apiBase
      if (opts.locale) state.locale = detectLocale(opts.locale)
      else if (!state.ready) state.locale = detectLocale()
      if (opts.tabText) {
        state.tabText = opts.tabText
        state.tabTextLocked = true
      }
      ensureUi()
      applyLocale()
      bindAuto()
      var tab = $("mp-tab")
      if (tab) tab.textContent = state.tabText
      if (opts.brandColors && opts.brandColors.primary) {
        var onPrimary = opts.brandColors.onPrimary || "#ffffff"
        var host = document.documentElement
        host.style.setProperty("--mp-primary", opts.brandColors.primary)
        host.style.setProperty("--mp-on-primary", onPrimary)
        if (opts.brandColors.hover) host.style.setProperty("--mp-hover", opts.brandColors.hover)
        if (opts.brandColors.active) host.style.setProperty("--mp-active", opts.brandColors.active)
      }
      if (opts.userTokenFn) state.userTokenFn = opts.userTokenFn
      if (opts.identify) this.identify(opts.identify)
      state.ready = true
    },
    identify: function (identity) {
      identity = identity || {}
      state.identity = Object.assign(state.identity, identity)
      pullUtms()
      saveIdentity()
    },
    track: function (moment, extra) {
      this.init(extra || {})
      if (moment === "pricing_view") {
        state.pricingViewedAt = Date.now()
        pingFunnel("pricing_view")
        return
      }
      if (moment === "pricing_exit") {
        if (!state.pricingViewedAt) state.pricingViewedAt = Date.now() - (state.identity.pricingDwellMs || 0)
        pingFunnel("pricing_exit")
      }
      openPanel(Object.assign({ moment: moment }, extra || {}))
    },
    ask: function (opts) {
      this.init(opts || {})
      openPanel(opts || {})
    },
  }
})()
