// Dynamic manual-game page with UI aligned to existing manual templates
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBRVEViuKnCUZqBoD0liuA-P0DVN7mTePA",
    authDomain: "z3em-d9b11.firebaseapp.com",
    projectId: "z3em-d9b11",
    storageBucket: "z3em-d9b11.firebasestorage.app",
    messagingSenderId: "236716520945",
    appId: "1:236716520945:web:a0c336db7dc7079c190050",
    measurementId: "G-1GG6DE12K6"
  };

  try {
    if (!firebase.apps?.length) firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.warn("Firebase init warning:", err?.message);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const WORKER_DEFAULT = "https://z3em-manwal.laithqarqaz1.workers.dev/";
  const TURNSTILE_SITE_KEY = "0x4AAAAAABmiVmi7wosqeHQT";
  const FALLBACK_IMAGE = "IMGS/freefiremanual.jpg";

  const state = {
    slug: "",
    user: null,
    game: null,
    items: [],
    itemsMap: new Map(),
    selected: null,
    selectedCard: null,
    currency: "USD",
    authKey: null,
    turnstileWidgetId: null,
    turnstileReady: null,
    turnstileToken: ""
  };

  const dom = {
    header: document.getElementById("manualHeader"),
    gameImage: document.getElementById("manualGameImage"),
    gameTitle: document.getElementById("manualGameTitle"),
    gameDesc: document.getElementById("manualGameDesc"),
    gameCategory: document.getElementById("manualGameCategory"),

    playerInput: document.getElementById("manualPlayerId"),
    pasteBtn: document.getElementById("manualPasteBtn"),

    searchInput: document.getElementById("manualSearchInput"),
    searchButton: document.getElementById("manualSearchButton"),
    offersContainer: document.getElementById("manualOffersContainer"),
    noResults: document.getElementById("manualNoResults"),

    selectedAmountContainer: document.getElementById("selected-amount-container"),
    selectedAmount: document.getElementById("selected-amount"),
    purchaseBtn: document.getElementById("manualPurchaseBtn"),
    clearBtn: document.getElementById("manualClearBtn"),

    modal: document.getElementById("purchase-modal"),
    modalTitle: document.getElementById("pm-title"),
    modalPrice: document.getElementById("pm-price"),
    modalPlayerId: document.getElementById("modal-player-id"),
    modalQty: document.getElementById("modal-quantity"),
    modalCancel: document.getElementById("pm-cancel"),
    modalBuy: document.getElementById("pm-buy"),
    modalTurnstileHolder: document.getElementById("cf-turnstile-modal"),

    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message")
  };

  /* -------------------------------------------------- */
  /* Helpers                                            */
  /* -------------------------------------------------- */
  function getManualBase() {
    try {
      const custom = localStorage.getItem("MANWAL_ROUTER_BASE");
      if (custom) return custom;
    } catch (_) {}
    return WORKER_DEFAULT;
  }

  function slugify(input) {
    return (input || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function detectSlug() {
    try {
      const url = new URL(location.href);
      const querySlug =
        url.searchParams.get("slug") ||
        url.searchParams.get("manualGame") ||
        url.searchParams.get("game") ||
        "";
      if (querySlug) return slugify(querySlug);
      const path = url.pathname.split("/").filter(Boolean);
      if (path.length) {
        const last = path[path.length - 1];
        if (!last.endsWith(".html")) return slugify(last);
      }
    } catch (_) {}
    return "";
  }

  function showLoader(on) {
    try {
      if (on) {
        showPageLoader?.();
      } else {
        hidePageLoader?.();
      }
    } catch (_) {}
  }

  function showToast(message, type = "info", timeout = 4000) {
    try {
      if (!dom.toast) return alert(message);
      dom.toastMessage.textContent = message;
      dom.toast.style.backgroundColor =
        type === "success" ? "#16a34a" :
        type === "error" ? "#dc2626" :
        type === "warning" ? "#f59e0b" : "#323232";
      dom.toast.style.visibility = "visible";
      dom.toast.style.opacity = "1";
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(() => {
        dom.toast.style.opacity = "0";
        dom.toast.style.visibility = "hidden";
      }, timeout);
    } catch (_) {
      alert(message);
    }
  }

  function fallbackImage() {
    return FALLBACK_IMAGE;
  }

  function formatPrice(value, currency) {
    const n = Number(value || 0);
    const cur = (currency || state.currency || "").toUpperCase();
    const symbolMap = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      SAR: "﷼",
      KWD: "د.ك",
      AED: "د.إ",
      QAR: "ر.ق",
      BHD: "د.ب",
      OMR: "ر.ع",
      JOD: "د.ا",
      EGP: "ج.م",
      IQD: "د.ع"
    };
    const symbol = symbolMap[cur];
    const amount = n.toFixed(2);
    if (symbol) return `${symbol} ${amount}`;
    return `${amount} ${cur || ""}`.trim();
  }

  function normalize(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  }

  function getLocalSessionKey() {
    try {
      const s = JSON.parse(localStorage.getItem("sessionKeyInfo") || "null");
      return s?.sessionKey || "";
    } catch (_) {
      return "";
    }
  }

  async function ensureAuthKey(uid) {
    if (state.authKey) return state.authKey;
    try {
      const snap = await db.collection("users").doc(uid).get();
      if (snap.exists) {
        const data = snap.data() || {};
        state.authKey = data.authkey || null;
        return state.authKey;
      }
    } catch (err) {
      console.warn("authkey fetch error:", err?.message);
    }
    return null;
  }

  function ensureTurnstileScript() {
    if (window.turnstile) return Promise.resolve();
    if (state.turnstileReady) return state.turnstileReady;
    state.turnstileReady = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
    return state.turnstileReady;
  }

  async function getTurnstileTokenInteractive() {
    await ensureTurnstileScript().catch(() => {});
    try {
      if (!dom.modalTurnstileHolder) return "";
      state.turnstileToken = "";
      state.turnstileWidgetId = null;
      dom.modalTurnstileHolder.innerHTML = "";
      dom.modalTurnstileHolder.style.marginTop = "12px";
      const holder = document.createElement("div");
      holder.id = "cf-turnstile-container";
      dom.modalTurnstileHolder.appendChild(holder);

      const opts = {
        sitekey: TURNSTILE_SITE_KEY,
        theme: (document.body.classList.contains("dark-mode") ||
          (document.documentElement.getAttribute("data-theme") || "").toLowerCase() === "dark")
          ? "dark"
          : "light",
        callback: (token) => {
          state.turnstileToken = token || "";
        },
        "expired-callback": () => {
          state.turnstileToken = "";
          try {
            if (window.turnstile && state.turnstileWidgetId != null) {
              window.turnstile.reset(state.turnstileWidgetId);
            }
          } catch (_) {}
        }
      };

      if (window.turnstile && window.turnstile.render) {
        state.turnstileWidgetId = window.turnstile.render(holder, opts);
      }

      const started = Date.now();
      while (!state.turnstileToken && Date.now() - started < 15000) {
        await new Promise((r) => setTimeout(r, 180));
        try {
          if (window.turnstile && state.turnstileWidgetId != null) {
            const current = window.turnstile.getResponse(state.turnstileWidgetId);
            if (current) {
              state.turnstileToken = current;
              break;
            }
          }
        } catch (_) {}
      }
      if (!state.turnstileToken) throw new Error("turnstile_token_missing");
      return state.turnstileToken;
    } catch (err) {
      console.warn("turnstile init error:", err?.message);
      throw err;
    }
  }

  function showSuccessOverlay(orderCode) {
    const existing = document.getElementById("manual-success-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "manual-success-overlay";
    const card = document.createElement("div");
    card.className = "success-card";

    const emoji = document.createElement("div");
    emoji.className = "success-emoji";
    emoji.textContent = "🎉";

    const title = document.createElement("h2");
    title.textContent = "تم استلام طلبك بنجاح";

    const description = document.createElement("p");
    description.textContent = "سنقوم بمراجعة الطلب وتشغيله من قبل فريقنا بأسرع وقت.";

    const code = document.createElement("p");
    code.className = "success-code";
    code.innerHTML = `رقم الطلب: <span>${orderCode || "-"}</span>`;

    const actions = document.createElement("div");
    actions.className = "success-actions";

    const ordersLink = document.createElement("a");
    ordersLink.href = "orderbackend/index.html";
    ordersLink.textContent = "متابعة الطلبات";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.id = "manualSuccessClose";
    closeBtn.textContent = "إغلاق";

    actions.appendChild(ordersLink);
    actions.appendChild(closeBtn);
    card.append(emoji, title, description, code, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
  }

  /* -------------------------------------------------- */
  /* UI Rendering                                       */
  /* -------------------------------------------------- */
  function renderGameHeader(game) {
    if (!dom.header) return;
    dom.header.hidden = false;
    dom.gameTitle.textContent = game.name || "لعبة يدوية";
    dom.gameDesc.textContent = game.description || "استعرض الباقات واختر ما يناسبك لإكمال الطلب.";
    if (dom.gameCategory) {
      const span = dom.gameCategory.querySelector("span") || dom.gameCategory;
      span.textContent = game.category ? `الفئة: ${game.category}` : "لعبة يدوية";
    }
    if (dom.gameImage) {
      if (game.imageUrl) {
        dom.gameImage.src = game.imageUrl;
        dom.gameImage.alt = game.name || "Manual game";
        dom.gameImage.style.display = "";
      } else {
        dom.gameImage.style.display = "none";
      }
    }
    document.title = `${game.name || "لعبة يدوية"} | متجر زعيم`;
  }

  function createOfferCard(item) {
    const card = document.createElement("div");
    card.className = "offer-box card manual-offer";
    card.dataset.itemId = item.id;
    card.dataset.search = normalize((item.label || item.id || "").toString());
    if (item.type) card.dataset.type = item.type;

    const img = document.createElement("img");
    img.src = (item.imageUrl && item.imageUrl.trim()) ? item.imageUrl : fallbackImage();
    img.alt = item.label || item.id;
    img.loading = "lazy";
    img.decoding = "async";
    card.appendChild(img);

    const title = document.createElement("h2");
    title.textContent = item.label || item.id;
    card.appendChild(title);

    const price = document.createElement("span");
    price.className = "offer-price";
    price.textContent = formatPrice(item.price, item.currency);
    card.appendChild(price);

    card.addEventListener("click", () => {
      selectItem(item.id);
      openModal();
    });
    return card;
  }

  function renderOffers(items) {
    state.items = items;
    state.itemsMap.clear();
    const wrapper = dom.offersContainer;
    if (!wrapper) return;
    wrapper.innerHTML = "";
    state.selected = null;
    state.selectedCard = null;

    if (!Array.isArray(items) || !items.length) {
      dom.noResults.style.display = "";
      updateSummary();
      return;
    }

    dom.noResults.style.display = "none";

    const offersBox = document.createElement("div");
    offersBox.className = "offers-box";
    const grid = document.createElement("section");
    grid.className = "categories";
    offersBox.appendChild(grid);

    items.forEach((item) => {
      if (!item || !item.id) return;
      state.itemsMap.set(item.id, item);
      grid.appendChild(createOfferCard(item));
    });

    wrapper.appendChild(offersBox);
    applySearch(dom.searchInput?.value || "");
    updateSummary();
  }

  function updateSummary() {
    const container = dom.selectedAmountContainer;
    const box = dom.selectedAmount;
    if (!container || !box) return;

    if (!state.selected) {
      container.classList.add("no-selection");
      box.classList.add("no-selection");
      box.textContent = "لم يتم اختيار أي عرض بعد.";
      dom.purchaseBtn.disabled = true;
      dom.clearBtn.disabled = true;
      return;
    }

    const { item, quantity } = state.selected;
    const total = Number(item.price * quantity);
    const unitText = formatPrice(item.price, item.currency);
    const totalText = formatPrice(total, item.currency);
    container.classList.remove("no-selection");
    box.classList.remove("no-selection");
    box.innerHTML = `
      <div class="voucher">
        <span class="line item-name">${item.label || item.id}</span>
        <span class="line item-price">${unitText}</span>
        <span class="line total-price">× ${quantity} = <strong>${totalText}</strong></span>
      </div>
    `;
    dom.purchaseBtn.disabled = false;
    dom.clearBtn.disabled = false;
  }

  function selectItem(itemId) {
    const item = state.itemsMap.get(itemId);
    if (!item) return;

    if (state.selectedCard) state.selectedCard.classList.remove("selected");
    const card = dom.offersContainer?.querySelector(`.manual-offer[data-item-id="${itemId}"]`);
    if (card) card.classList.add("selected");

    state.selected = { item, quantity: 1 };
    state.selectedCard = card || null;
    if (dom.modalQty) dom.modalQty.value = 1;
    updateSummary();
  }

  function clearSelection() {
    if (state.selectedCard) state.selectedCard.classList.remove("selected");
    state.selected = null;
    state.selectedCard = null;
    if (dom.modalQty) dom.modalQty.value = 1;
    updateSummary();
  }

  function applySearch(query) {
    const q = normalize(query);
    let visible = 0;
    dom.offersContainer
      ?.querySelectorAll(".manual-offer")
      .forEach((card) => {
        const searchText = card.dataset.search || "";
        const match = !q || searchText.includes(q);
        card.style.display = match ? "" : "none";
        if (match) visible += 1;
      });
    dom.noResults.style.display = visible ? "none" : "";
  }

  function openModal() {
    if (!state.selected) {
      showToast("اختر عرضًا أولاً.", "warning");
      return;
    }
    const item = state.selected.item;
    dom.modalTitle.textContent = item.label || item.id;
    dom.modalQty.value = state.selected.quantity || 1;
    dom.modalPlayerId.value = dom.playerInput?.value?.trim() || "";
    updateModalPrice();
    state.turnstileToken = "";
    state.turnstileWidgetId = null;
    try { document.body.classList.add("modal-open"); } catch (_) {}
    dom.modal.classList.add("show");
  }

  function closeModal() {
    dom.modal.classList.remove("show");
    try { document.body.classList.remove("modal-open"); } catch (_) {}
    state.turnstileToken = "";
    if (state.turnstileWidgetId != null && window.turnstile) {
      try { window.turnstile.remove(state.turnstileWidgetId); } catch (_) {}
    }
    state.turnstileWidgetId = null;
    if (dom.modalTurnstileHolder) dom.modalTurnstileHolder.innerHTML = "";
  }

  function updateModalPrice() {
    if (!state.selected) return;
    const qty = Math.max(1, parseInt(dom.modalQty.value, 10) || 1);
    const total = state.selected.item.price * qty;
    dom.modalPrice.textContent = formatPrice(total, state.selected.item.currency);
  }

  /* -------------------------------------------------- */
  /* Networking                                         */
  /* -------------------------------------------------- */
  async function fetchManualGame(slug, uid) {
    const base = new URL(getManualBase());
    base.searchParams.set("mode", "all");
    base.searchParams.set("manualGame", slug);
    if (uid) base.searchParams.set("useruid", uid);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(base.toString(), {
        method: "GET",
        headers: { "X-Game": slug },
        cache: "no-store",
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        const err = data?.error || res.statusText || "failed";
        throw new Error(err);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function submitOrder() {
    if (!state.selected || !state.user) {
      showToast("اختر عرضًا وقم بتسجيل الدخول أولاً.", "warning");
      return;
    }

    const playerId = dom.modalPlayerId.value.trim();
    if (!playerId) {
      showToast("يرجى إدخال معرف اللاعب.", "warning");
      dom.modalPlayerId.focus();
      return;
    }

    const quantity = Math.max(1, parseInt(dom.modalQty.value, 10) || 1);
    state.selected.quantity = quantity;
    const baseInput = dom.playerInput;
    if (baseInput) baseInput.value = playerId;

    const sessionKey = getLocalSessionKey();
    if (!sessionKey) {
      showToast("رمز الجلسة غير متوفر. أعد تسجيل الدخول.", "error");
      return;
    }

    const authKey = await ensureAuthKey(state.user.uid);
    if (!authKey) {
      showToast("حسابك لا يحتوي authkey. تواصل مع الدعم.", "error");
      return;
    }

    let turnstileToken = state.turnstileToken;
    if (!turnstileToken) {
      try {
        turnstileToken = await getTurnstileTokenInteractive();
      } catch (err) {
        console.warn("Turnstile error:", err?.message);
        showToast("فشل التحقق الأمني، حاول مجددًا.", "error");
        return;
      }
    }

    let idToken = "";
    try {
      idToken = await state.user.getIdToken(true);
    } catch (err) {
      console.warn("ID token error:", err?.message);
      showToast("انتهت صلاحية الجلسة. أعد تسجيل الدخول.", "error");
      return;
    }

    const payloadOffers = [{
      itemId: state.selected.item.id,
      quantity: state.selected.quantity
    }];

    const bodyPayload = {
      playerId,
      offers: payloadOffers,
      authkey: authKey,
      turnstileToken,
      sessionKey,
      currentUrl: location.href,
      useruid: state.user.uid
    };

    const fetchBase = getManualBase();
    showLoader(true);
    dom.modalBuy.disabled = true;

    try {
      const response = await fetch(fetchBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-SessionKey": sessionKey,
          "X-Game": state.slug
        },
        body: JSON.stringify(bodyPayload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) {
        showToast(json?.error || "فشل تنفيذ الطلب.", "error");
        state.turnstileToken = "";
        try {
          if (window.turnstile && state.turnstileWidgetId != null) {
            window.turnstile.reset(state.turnstileWidgetId);
          } else {
            state.turnstileWidgetId = null;
          }
        } catch (_) {
          state.turnstileWidgetId = null;
        }
        return;
      }
      showToast("تم إنشاء الطلب بنجاح.", "success");
      showSuccessOverlay(json.orderCode);
      clearSelection();
      closeModal();
    } catch (err) {
      console.error("Order error:", err);
      showToast("حدث خطأ غير متوقع أثناء إرسال الطلب.", "error");
      state.turnstileToken = "";
      try {
        if (window.turnstile && state.turnstileWidgetId != null) {
          window.turnstile.reset(state.turnstileWidgetId);
        } else {
          state.turnstileWidgetId = null;
        }
      } catch (_) {
        state.turnstileWidgetId = null;
      }
    } finally {
      dom.modalBuy.disabled = false;
      showLoader(false);
    }
  }

  /* -------------------------------------------------- */
  /* Initialization                                     */
  /* -------------------------------------------------- */
  function hydrate(data) {
    if (!data) return;
    const manual = data.manualGame || {};
    state.game = {
      slug: manual.slug || state.slug,
      name: manual.name || state.slug,
      description: manual.description || "",
      imageUrl: manual.imageUrl || "",
      category: manual.category || ""
    };
    state.currency = data.currency || manual.currency || "USD";
    renderGameHeader(state.game);
    renderOffers(Array.isArray(data.items) ? data.items : []);
  }

  async function loadManual() {
    if (!state.slug || !state.user) return;
    showLoader(true);
    try {
      const data = await fetchManualGame(state.slug, state.user.uid);
      hydrate(data);
    } catch (err) {
      console.error("manual load error:", err);
      showToast("تعذر تحميل بيانات اللعبة.", "error");
    } finally {
      showLoader(false);
    }
  }

  function bindEvents() {
    dom.searchButton?.addEventListener("click", () => applySearch(dom.searchInput.value));
    dom.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applySearch(dom.searchInput.value);
      }
    });
    dom.searchInput?.addEventListener("input", () => {
      clearTimeout(bindEvents._searchTimer);
      bindEvents._searchTimer = setTimeout(() => applySearch(dom.searchInput.value), 150);
    });

    dom.clearBtn?.addEventListener("click", () => clearSelection());
    dom.purchaseBtn?.addEventListener("click", () => openModal());
    dom.modalCancel?.addEventListener("click", () => closeModal());
    dom.modalBuy?.addEventListener("click", () => submitOrder());
    dom.modalQty?.addEventListener("input", updateModalPrice);

    dom.modal?.addEventListener("click", (e) => {
      if (e.target === dom.modal) closeModal();
    });

    dom.pasteBtn?.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard?.readText) throw new Error("Clipboard API unavailable");
        const txt = (await navigator.clipboard.readText())?.trim();
        if (txt) dom.playerInput.value = txt;
        else showToast("لا يوجد نص منسوخ.", "warning");
      } catch {
        showToast("تعذر لصق النص. امنح المتصفح صلاحية الوصول.", "error");
      }
    });
  }

  function init() {
    state.slug = detectSlug();
    if (!state.slug) {
      showToast("لا يمكن تحديد اللعبة اليدوية المطلوبة.", "error");
      return;
    }

    bindEvents();

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        showToast("يرجى تسجيل الدخول للمتابعة.", "error");
        setTimeout(() => { location.href = "login.html"; }, 1200);
        return;
      }
      state.user = user;
      await loadManual();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
