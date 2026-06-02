(function () {
  const API_BASE_URL = window.API_BASE_URL || "https://optimistic-desk-3615e76660.strapiapp.com";
  const REPORTS_ENDPOINT = `${API_BASE_URL}/api/power-bi-dashboards?populate=*`;
  const PINS_ENDPOINT = `${API_BASE_URL}/api/dashboard-pins/me`;
  const TOGGLE_PIN_ENDPOINT = `${API_BASE_URL}/api/dashboard-pins/toggle`;
  const AUTH_ME_ENDPOINT = `${API_BASE_URL}/api/users/me`;
  const AUTH_STORAGE_KEY = "inspireAuth";
  const DEFAULT_THUMBNAIL = "../assets/dashboard/2ab368079453c27e55a7c4748363b84b90049f0f.png";
  const GLOW_ASSET = "../assets/dashboard/38b9708cc785b2fa824ed77070caa4cf5c2db57b.svg";
  const FAVORITE_PIN = "../assets/dashboard/fac7502a76b4636def2e574a61de51c3becf3e9b.svg";
  const LINK_PIN = "../assets/dashboard/ca8a615c7774f061cda8fb2ae4262d5dbfd39b15.svg";
  const CARD_TOP_GLOW = "url('../assets/dashboard/card-top-glow.svg') center / 100% 100% no-repeat";
  const FAVORITE_LIMIT = 4;
  const CARD_EXCERPT_LENGTH = 130;

  const auth = readAuth();
  if (!auth?.jwt) {
    window.location.replace("login.html");
    return;
  }

  const mainNav = document.getElementById("mainNav");
  const favoriteContainer = document.getElementById("favoriteReports");
  const allContainer = document.getElementById("allReports");
  const searchInput = document.querySelector(".landing-nav__search-input");
  const searchButton = document.querySelector(".landing-nav__search-btn");
  const navTabs = Array.from(document.querySelectorAll(".nav-tab[data-journey]"));
  const tabs = Array.from(document.querySelectorAll(".insight-tab"));
  const insightSubfilters = document.getElementById("insightSubfilters");
  const favoriteSection = document.getElementById("favorite");
  const allInsightTitle = document.querySelector(".section-block--insights .section-block__title");
  const insightTabsNav = document.querySelector(".insight-tabs");
  const params = new URLSearchParams(window.location.search);
  const requestedSearch = params.get("q") || "";

  const insightOptions = {
    workspace: ["Marvel", "Shield"],
    environment: ["Operation", "Development"],
    frequency: ["Monthly", "Weekly", "Daily", "Ad Hoc"],
  };

  let reports = [];
  let pinnedDashboardIds = new Set();
  let activeInsightFilter = tabs.find((t) => t.classList.contains("insight-tab--active"))?.dataset.insightFilter || "";
  let activeInsightValue = "";
  let searchWasActive = Boolean(requestedSearch);

  if (searchInput && requestedSearch) {
    searchInput.value = requestedSearch;
    openNavSearch();
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  function readAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null"); }
    catch (_e) { return null; }
  }
  function clearAuth() { localStorage.removeItem(AUTH_STORAGE_KEY); }
  function authHeaders(extra = {}) { return { ...extra, Authorization: `Bearer ${auth.jwt}` }; }
  function redirectToLogin() { clearAuth(); window.location.replace("login.html"); }

  async function verifySession() {
    const res = await fetch(AUTH_ME_ENDPOINT, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) { redirectToLogin(); return false; }
    if (!res.ok) throw new Error(`Auth check returned ${res.status}`);
    return true;
  }

  // ─── Nav helpers ──────────────────────────────────────────────────────────

  function openNavSearch() {
    mainNav?.classList.add("nav-searching");
    searchButton?.setAttribute("aria-expanded", "true");
  }

  function closeNavSearch(force = false) {
    if (!force && searchInput?.value.trim()) return;
    mainNav?.classList.remove("nav-searching");
    searchButton?.setAttribute("aria-expanded", "false");
  }

  // ─── Active tab style ─────────────────────────────────────────────────────

  function setTabActive(tab, active) {
    if (active) {
      tab.classList.add("is-active");
      tab.setAttribute("aria-current", "page");
    } else {
      tab.classList.remove("is-active");
      tab.removeAttribute("aria-current");
    }
  }

  function setInsightTabActive(tab, active) {
    if (active) {
      tab.classList.add("insight-tab--active");
      tab.classList.add("text-white");
      tab.classList.remove("text-white/70");
      tab.setAttribute("aria-pressed", "true");
    } else {
      tab.classList.remove("insight-tab--active");
      tab.classList.remove("text-white");
      tab.classList.add("text-white/70");
      tab.setAttribute("aria-pressed", "false");
    }
  }

  // ─── Data helpers ─────────────────────────────────────────────────────────

  function normalizeId(v) { return v === undefined || v === null ? "" : String(v); }

  function field(record, names, fallback = "") {
    const src = record.attributes || record;
    for (const name of names) {
      if (src[name] !== undefined && src[name] !== null && src[name] !== "") return src[name];
    }
    return fallback;
  }

  function textField(record, names, fallback = "") {
    const value = field(record, names, fallback);
    if (Array.isArray(value)) {
      return value
        .map((item) => textField(item, ["text", "children", "content"], ""))
        .filter(Boolean)
        .join(" ");
    }
    if (value && typeof value === "object") {
      if (typeof value.text === "string") return value.text;
      if (Array.isArray(value.children)) {
        return value.children
          .map((child) => textField(child, ["text", "children", "content"], ""))
          .filter(Boolean)
          .join(" ");
      }
      if (typeof value.content === "string") return value.content;
      return fallback;
    }
    return String(value || "").trim();
  }

  function mediaUrl(value) {
    if (!value) return DEFAULT_THUMBNAIL;
    if (typeof value === "string") return value;
    const firstMedia = Array.isArray(value) ? value[0] : value;
    const mediaData = Array.isArray(firstMedia.data) ? firstMedia.data[0] : firstMedia.data;
    const media = mediaData?.attributes || mediaData || firstMedia.attributes || firstMedia;
    const url = media.formats?.medium?.url || media.formats?.small?.url || media.url;
    if (!url) return DEFAULT_THUMBNAIL;
    return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  }

  function safeUrl(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const srcMatch = raw.match(/\bsrc=["']([^"']+)["']/i);
    const candidate = (srcMatch ? srcMatch[1] : raw).replaceAll("&amp;", "&");
    try { const u = new URL(candidate); return ["http:", "https:"].includes(u.protocol) ? u.toString() : ""; }
    catch (_e) { return ""; }
  }

  function timestamp(value) {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function newestFirst(a, b) {
    return (b.sortTime || 0) - (a.sortTime || 0);
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") return ["true","1","yes","y"].includes(value.trim().toLowerCase());
    return Boolean(value);
  }

  function excerpt(value, maxLength = CARD_EXCERPT_LENGTH) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    const trimmed = text.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
    return `${trimmed || text.slice(0, maxLength).trim()}...`;
  }

  function inferJourney(title) {
    const n = String(title || "").toLowerCase();
    if (n.includes("productivity h23") || n.includes("parts sales")) return "After Sales";
    if (n.includes("digital maturity")) return "General";
    if (n.includes("nms")) return "Sales";
    return "Pre-Sales";
  }

  function normalizeReport(record) {
    const title = field(record, ["title","name","reportTitle"], "Untitled dashboard");
    const objective = textField(record, ["objective","Objective","description","desc"], "");
    const journey = field(record, ["journey","category","type"], "General");
    const workspace = field(record, ["workspace"], "");
    const environment = field(record, ["environment"], "");
    const frequency = field(record, ["frequency"], "");
    const dataUsage = field(record, ["dataUsage","data_usage"], "");
    const businessQuestion = field(record, ["businessQuestion","business_question"], "");
    const url = safeUrl(field(record, ["powerBiUrl","PowerBiUrl","powerBIUrl","powerBIURL","powerbiUrl","powerbiurl","power_bi_url","embedUrl","embedURL","reportUrl","url","link"]));
    const thumbnail = mediaUrl(field(record, ["thumbnail","image","cover"]));
    const favorite = toBoolean(field(record, ["isPinned","isFavorite","favorite","pinned"], false), false);
    const active = toBoolean(field(record, ["isActive","active"], true), true);
    const createdAt = field(record, ["createdAt", "created_at"], "");
    const updatedAt = field(record, ["updatedAt", "updated_at"], "");
    const publishedAt = field(record, ["publishedAt", "published_at"], "");
    const documentId = field(record, ["documentId"], "");
    const rawId = record.id || field(record, ["id"], documentId || title);
    const id = normalizeId(documentId || rawId || title);
    return {
      id, backendId: normalizeId(rawId), documentId: normalizeId(documentId),
      title, description: objective, journey, workspace, environment, frequency,
      objective, dataUsage, businessQuestion, url, thumbnail,
      createdAt, updatedAt, publishedAt,
      sortTime: timestamp(createdAt || publishedAt || updatedAt),
      favorite: favorite || pinnedDashboardIds.has(id) || pinnedDashboardIds.has(normalizeId(rawId)),
      active,
    };
  }

  // ─── Card rendering ───────────────────────────────────────────────────────

  function createCard(report, fullWidth = false) {
    const article = document.createElement("article");
    article.className = `project-card relative flex flex-col items-center ${fullWidth ? "w-full max-w-[292px]" : "flex-shrink-0 w-[270px] lg:w-[292px]"} px-5 pt-6 pb-5 rounded-[18px] overflow-hidden`;
    article.style.cssText = [
      "min-height:347px",
      "background: radial-gradient(circle at 50% -10%, rgba(239,61,66,0.88) 0%, rgba(113,35,36,0.78) 34%, rgba(50,45,45,0.8) 70%, rgba(30,30,30,0.92) 100%)",
      "border:1px solid rgba(239,61,66,0.42)",
      "box-shadow: inset -1px 1px 12px rgba(255,91,96,0.72), 0 10px 22px rgba(0,0,0,0.24), 0 0 18px rgba(230,56,60,0.3)",
    ].join(";");

    const glow = document.createElement("div");
    glow.className = "absolute left-1/2 -top-24 w-[320px] h-[250px] -translate-x-1/2 pointer-events-none opacity-95";
    glow.setAttribute("aria-hidden", "true");
    glow.style.background = CARD_TOP_GLOW;
    article.appendChild(glow);

    const body = document.createElement("div");
    body.className = "relative z-10 flex flex-col gap-4 w-full";

    const name = document.createElement("h3");
    name.className = "project-card__name text-center font-bold text-[18px] leading-tight text-white";
    name.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;";
    name.textContent = report.title;
    body.appendChild(name);

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "relative w-full max-w-[220px] h-[140px] mx-auto rounded-[14px] overflow-hidden bg-white";

    const thumb = document.createElement("img");
    thumb.className = "absolute inset-0 w-full h-full object-cover";
    thumb.src = report.thumbnail;
    thumb.alt = "";
    thumbWrap.appendChild(thumb);

    const pinBtn = document.createElement("button");
    pinBtn.className = "project-card__pin absolute right-0 bottom-0 w-[30px] h-[30px] flex items-center justify-center rounded-[8px] border border-white/35 cursor-pointer";
    pinBtn.style.background = report.favorite ? "#e6383c" : "#a5a5a5";
    pinBtn.type = "button";
    pinBtn.setAttribute("aria-label", `${report.favorite ? "Unpin" : "Pin"} ${report.title}`);
    pinBtn.setAttribute("aria-pressed", report.favorite ? "true" : "false");
    const pinImg = document.createElement("img");
    pinImg.src = report.favorite ? FAVORITE_PIN : LINK_PIN;
    pinImg.className = "w-[21px] h-[21px]";
    pinBtn.appendChild(pinImg);
    thumbWrap.appendChild(pinBtn);
    body.appendChild(thumbWrap);

    const desc = document.createElement("p");
    desc.className = "project-card__desc w-full max-w-[220px] mx-auto text-[13px] font-medium leading-snug text-white line-clamp-3 min-h-[54px]";
    desc.style.cssText = "text-align:justify;text-align-last:left;text-justify:inter-word;";
    desc.textContent = excerpt(report.objective || report.description) || "No description available.";
    body.appendChild(desc);
    article.appendChild(body);

    const btn = document.createElement("button");
    btn.className = "project-card__btn relative z-10 mt-auto w-full h-[36px] rounded-full border-0 text-white text-[12px] font-semibold transition-colors";
    btn.style.background = "#f0333b";
    btn.type = "button";
    btn.textContent = "See detail";
    article.appendChild(btn);

    makeCardInteractive(article, report);
    return article;
  }

  function makeCardInteractive(article, report) {
    const button = article.querySelector(".project-card__btn");
    const pinButton = article.querySelector(".project-card__pin");

    if (!report.active) {
      article.style.cursor = "default";
      if (button) { button.disabled = true; button.style.background = "rgba(165,165,165,0.5)"; }
      if (pinButton) pinButton.disabled = true;
      return;
    }

    article.style.cursor = "pointer";
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    article.setAttribute("aria-label", `Open ${report.title}`);

    article.addEventListener("click", function (event) {
      if (event.target instanceof Element && event.target.closest(".project-card__btn, .project-card__pin")) return;
      openReport(report);
    });
    article.addEventListener("keydown", function (event) {
      if (event.target instanceof Element && event.target.closest(".project-card__btn, .project-card__pin")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openReport(report);
    });
    button?.addEventListener("click", () => openReport(report));
    pinButton?.addEventListener("click", () => toggleFavorite(report));
  }

  // ─── Favorite / pin ───────────────────────────────────────────────────────

  async function toggleFavorite(report) {
    const source = reports.find((r) => r.id === report.id) || report;
    if (!source.favorite && reports.filter((r) => r.favorite).length >= FAVORITE_LIMIT) {
      window.alert(`Maksimal ${FAVORITE_LIMIT} dashboard yang bisa di-pin. Unpin dashboard lama dulu.`);
      return;
    }
    const prev = source.favorite;
    source.favorite = !source.favorite;
    renderReports();
    if (!source.backendId && !source.documentId) return;
    try {
      const res = await fetch(TOGGLE_PIN_ENDPOINT, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dashboardId: source.documentId || source.backendId || source.id }),
      });
      if (res.status === 401) { redirectToLogin(); return; }
      const payload = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error("Akses pin dashboard belum aktif untuk user ini. Cek permission Authenticated role di Strapi untuk dashboard-pin me/toggle.");
      }
      if (!res.ok) throw new Error(payload.error?.message || "Pin update failed.");
      source.favorite = Boolean(payload.data?.pinned);
      const pinId = normalizeId(payload.data?.dashboardId || source.documentId || source.backendId || source.id);
      if (source.favorite) {
        pinnedDashboardIds.add(pinId);
      } else {
        [pinId, source.id, source.backendId, source.documentId].forEach((id) => pinnedDashboardIds.delete(id));
      }
    } catch (err) {
      source.favorite = prev;
      window.alert(err.message || "Pin update failed.");
    }
    renderReports();
  }

  // ─── Subfilters ───────────────────────────────────────────────────────────

  function renderInsightSubfilters() {
    if (!insightSubfilters) return;
    const options = insightOptions[activeInsightFilter] || [];
    insightSubfilters.innerHTML = "";
    insightSubfilters.hidden = options.length === 0;
    options.forEach((option) => {
      const btn = document.createElement("button");
      const isActive = activeInsightValue === option;
      btn.className = `insight-subfilter ${isActive ? "insight-subfilter--active" : ""} px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${isActive ? "bg-accent/20 border-accent/50 text-accent" : "bg-white/5 border-white/15 text-white"}`;
      btn.type = "button";
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      btn.textContent = option;
      btn.addEventListener("click", function () {
        activeInsightValue = activeInsightValue === option ? "" : option;
        renderInsightSubfilters();
        renderReports();
      });
      insightSubfilters.appendChild(btn);
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  function renderMessage(container, message) {
    if (!container) return;
    container.innerHTML = "";
    const p = document.createElement("p");
    p.className = "text-white/40 text-sm py-8";
    if (container.id === "allReports") p.classList.add("col-span-full");
    p.textContent = message;
    container.appendChild(p);
  }

  function renderLoading() {
    renderMessage(favoriteContainer, "Loading...");
    renderMessage(allContainer, "Loading...");
  }

  function renderLoadError(message = "Unable to load dashboards from Strapi.") {
    reports = [];
    renderMessage(favoriteContainer, message);
    renderMessage(allContainer, message);
  }

  function render(container, items, emptyMessage = "No dashboards found.") {
    if (!container) return;
    container.innerHTML = "";
    if (items.length === 0) {
      renderMessage(container, emptyMessage);
      return;
    }
    const fullWidth = container.id === "allReports";
    items.forEach((r) => container.appendChild(createCard(r, fullWidth)));
  }

  function matchesTitleSearch(report, searchTerm) {
    return report.title.toLowerCase().includes(searchTerm);
  }

  function renderReports() {
    const searchTerm = (searchInput?.value || "").trim().toLowerCase();
    const hasSearch = searchTerm.length > 0;

    document.documentElement.classList.toggle("search-mode", hasSearch);
    document.body.classList.toggle("home-searching", hasSearch);
    if (hasSearch && !searchWasActive) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    searchWasActive = hasSearch;

    const url = new URL(window.location.href);
    if (hasSearch) { url.searchParams.set("q", searchInput.value.trim()); }
    else { url.searchParams.delete("q"); }
    window.history.replaceState({}, "", url);

    const visible = reports.filter((r) => {
      const matchSearch = matchesTitleSearch(r, searchTerm);
      return matchSearch && r.active;
    });

    if (favoriteSection) favoriteSection.hidden = hasSearch;
    if (insightTabsNav) insightTabsNav.hidden = hasSearch;
    if (insightSubfilters) insightSubfilters.hidden = hasSearch || (insightOptions[activeInsightFilter] || []).length === 0;
    if (allInsightTitle) {
      allInsightTitle.textContent = hasSearch ? "Search Results" : "All Insight Project";
    }

    if (!hasSearch) {
      render(favoriteContainer, visible.filter((r) => r.favorite).slice(0, FAVORITE_LIMIT));
    }

    const insightReports = hasSearch ? visible : visible.filter((r) => {
      if (!activeInsightFilter || !activeInsightValue) return true;
      return String(r[activeInsightFilter] || "").toLowerCase() === activeInsightValue.toLowerCase();
    });

    render(
      allContainer,
      insightReports,
      hasSearch ? "No dashboards match your search." : "No dashboards found."
    );
  }

  // ─── Open report ──────────────────────────────────────────────────────────

  function openReport(report) {
    const id = report.documentId || report.backendId || report.id;
    const returnTo = `${window.location.pathname.split("/").pop() || "home.html"}${window.location.search}`;
    window.location.href = `detail.html?id=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(returnTo)}`;
  }

  // ─── Event binding ────────────────────────────────────────────────────────

  function bindEvents() {
    document.querySelectorAll(".landing-nav__logout, .dashboard-detail__logout").forEach((link) => {
      link.addEventListener("click", clearAuth);
    });

    document.querySelector('a[href="#favorite"]')?.addEventListener("click", function (event) {
      const target = document.getElementById("favorite");
      if (!target) return;
      event.preventDefault();
      const navbar = document.getElementById("navbar-placeholder");
      const navbarBottom = navbar ? navbar.getBoundingClientRect().bottom : 0;
      const offset = Math.max(navbarBottom + 24, 96);
      const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
    });

    searchInput?.addEventListener("focus", openNavSearch);
    searchInput?.addEventListener("input", renderReports);
    searchButton?.setAttribute("aria-expanded", "false");
    searchButton?.addEventListener("click", function () { openNavSearch(); searchInput?.focus(); renderReports(); });

    document.addEventListener("click", function (event) {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".landing-nav")) return;
      closeNavSearch();
    });

    navTabs.forEach((tab) => {
      tab.addEventListener("click", function (event) {
        event.preventDefault();
        const journey = tab.dataset.journey || "";
        window.location.href = `archive.html?view=category&journey=${encodeURIComponent(journey)}`;
      });
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        const nextFilter = tab.dataset.insightFilter || "";
        const isActive = activeInsightFilter === nextFilter;
        tabs.forEach((t) => setInsightTabActive(t, false));
        if (isActive) {
          activeInsightFilter = "";
        } else {
          setInsightTabActive(tab, true);
          activeInsightFilter = nextFilter;
        }
        activeInsightValue = "";
        renderInsightSubfilters();
        renderReports();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (mainNav?.classList.contains("nav-searching")) { searchInput?.blur(); closeNavSearch(true); }
    });
  }

  // ─── API loading ──────────────────────────────────────────────────────────

  async function loadPinnedDashboardIds() {
    const res = await fetch(PINS_ENDPOINT, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) {
      console.warn("Pinned dashboards could not be loaded.");
      return;
    }
    if (!res.ok) throw new Error(`Pin endpoint returned ${res.status}`);
    const payload = await res.json();
    const items = Array.isArray(payload.data) ? payload.data : [];
    pinnedDashboardIds = new Set(
      items.flatMap((item) => [normalizeId(item.documentId), normalizeId(item.id)]).filter(Boolean)
    );
  }

  async function loadReports() {
    try {
      const sessionValid = await verifySession();
      if (!sessionValid) return;
      const [res] = await Promise.all([
        fetch(REPORTS_ENDPOINT, { headers: authHeaders() }),
        loadPinnedDashboardIds().catch((err) => {
          console.warn("Pinned dashboards could not be loaded.", err);
        }),
      ]);
      if (res.status === 401 || res.status === 403) {
        console.warn("Power BI dashboards could not be loaded.");
        renderLoadError("Dashboard data is not available for this account.");
        return;
      }
      if (!res.ok) throw new Error(`Strapi returned ${res.status}`);
      const payload = await res.json();
      const items = Array.isArray(payload.data) ? payload.data : [];
      reports = items.map(normalizeReport).sort(newestFirst);
      renderReports();
    } catch (err) {
      console.warn("Power BI reports could not be loaded.", err);
      renderLoadError();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  bindEvents();
  renderInsightSubfilters();
  renderLoading();
  loadReports();
})();
