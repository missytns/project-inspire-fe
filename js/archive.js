(function () {
  const API_BASE_URL = window.API_BASE_URL || "https://uplifting-cheese-44a7f505da.strapiapp.com";
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
  const CARD_EXCERPT_LENGTH = 112;

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
  const allInsightTitle = document.querySelector(".section-block--insights .section-block__title");
  const params = new URLSearchParams(window.location.search);
  const pageView = params.get("view");
  const archiveMode = pageView === "archive";
  const categoryMode = pageView === "category";
  const requestedJourney = params.get("journey") || "";
  const requestedSearch = params.get("q") || "";

  const insightOptions = {
    workspace: ["Marvel", "Shield"],
    environment: ["Operation", "Development"],
    frequency: ["Monthly", "Weekly", "Daily", "Ad Hoc"],
  };

  let reports = [];
  let pinnedDashboardIds = new Set();
  let activeJourney = categoryMode ? (requestedJourney || navTabs[0]?.dataset.journey || "") : "";

  if (searchInput && requestedSearch) searchInput.value = requestedSearch;

  if (navTabs.length > 0 && activeJourney) {
    navTabs.forEach((tab) => {
      setTabActive(tab, tab.dataset.journey === activeJourney);
    });
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

  // ─── Tab style helpers ────────────────────────────────────────────────────

  function setTabActive(tab, active) {
    if (active) {
      tab.classList.remove("bg-[#1c1c1c]", "border-[#8d8d8d]");
      tab.classList.add("bg-accent", "border-accent/85");
    } else {
      tab.classList.remove("bg-accent", "border-accent/85");
      tab.classList.add("bg-[#1c1c1c]", "border-[#8d8d8d]");
    }
  }

  // ─── Data helpers ─────────────────────────────────────────────────────────

  function normalizeId(value) {
    return value === undefined || value === null ? "" : String(value);
  }

  function field(record, names, fallback = "") {
    const src = record.attributes || record;
    for (const name of names) {
      if (src[name] !== undefined && src[name] !== null && src[name] !== "") return src[name];
    }
    return fallback;
  }

  function mediaUrl(value) {
    if (!value) return DEFAULT_THUMBNAIL;
    if (typeof value === "string") return value;
    const mediaData = Array.isArray(value.data) ? value.data[0] : value.data;
    const media = mediaData?.attributes || mediaData || value.attributes || value;
    const url = media.formats?.medium?.url || media.formats?.small?.url || media.url;
    if (!url) return DEFAULT_THUMBNAIL;
    return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  }

  function safeUrl(value) {
    if (!value) return "";
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) ? u.toString() : "";
    } catch (_e) { return ""; }
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
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
    const title = field(record, ["title", "name", "reportTitle"], "Untitled dashboard");
    const objective = field(record, ["objective", "description", "desc"], "");
    const journey = field(record, ["journey", "category", "type"], "General");
    const workspace = field(record, ["workspace"], "");
    const environment = field(record, ["environment"], "");
    const frequency = field(record, ["frequency"], "");
    const dataUsage = field(record, ["dataUsage", "data_usage"], "");
    const businessQuestion = field(record, ["businessQuestion", "business_question"], "");
    const url = safeUrl(field(record, ["powerBiUrl", "powerBIUrl", "embedUrl", "reportUrl", "url", "link"]));
    const thumbnail = mediaUrl(field(record, ["thumbnail", "image", "cover"]));
    const favorite = toBoolean(field(record, ["isPinned", "isFavorite", "favorite", "pinned"], false), false);
    const active = toBoolean(field(record, ["isActive", "active"], true), true);
    const documentId = field(record, ["documentId"], "");
    const rawId = record.id || field(record, ["id"], documentId || title);
    const id = normalizeId(documentId || rawId || title);
    return {
      id, backendId: normalizeId(rawId), documentId: normalizeId(documentId),
      title, description: objective, journey, workspace, environment, frequency,
      objective, dataUsage, businessQuestion, url, thumbnail,
      favorite: favorite || pinnedDashboardIds.has(id) || pinnedDashboardIds.has(normalizeId(rawId)),
      active,
    };
  }

  // ─── Card rendering ───────────────────────────────────────────────────────

  function createCard(report, fullWidth = false) {
    const article = document.createElement("article");
    article.className = `project-card relative flex flex-col items-center gap-6 ${fullWidth ? "w-full" : "flex-shrink-0 w-[280px] lg:w-[317px]"} p-6 rounded-[28px] overflow-hidden`;
    article.style.cssText = "background: rgba(68,68,68,0.65); box-shadow: inset -1px 1px 11px 0 #e6383c, 0 14px 24px 0 rgba(0,0,0,0.05);";

    const glow = document.createElement("div");
    glow.className = "absolute left-1/2 -top-20 w-[318px] h-[254px] -translate-x-1/2 pointer-events-none opacity-90";
    glow.setAttribute("aria-hidden", "true");
    glow.style.background = CARD_TOP_GLOW;
    article.appendChild(glow);

    const body = document.createElement("div");
    body.className = "relative z-10 flex flex-col gap-4 w-full";

    const name = document.createElement("h3");
    name.className = "text-center font-bold text-[19px] text-white";
    name.style.whiteSpace = "nowrap";
    name.textContent = report.title;
    body.appendChild(name);

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "relative w-[220px] h-[148px] mx-auto rounded-[17px] overflow-hidden";

    const thumb = document.createElement("img");
    thumb.className = "absolute max-w-none";
    thumb.style.cssText = "width:148%;height:111%;left:-21%;top:-8%;";
    thumb.src = report.thumbnail;
    thumb.alt = "";
    thumbWrap.appendChild(thumb);

    const pinBtn = document.createElement("button");
    pinBtn.className = `project-card__pin absolute right-0 bottom-0 w-[29px] h-[29px] flex items-center justify-center rounded-[8px] border-0 cursor-pointer ${report.favorite ? "bg-accent" : "bg-[#a5a5a5]"}`;
    pinBtn.type = "button";
    pinBtn.setAttribute("aria-label", `${report.favorite ? "Unpin" : "Pin"} ${report.title}`);
    const pinImg = document.createElement("img");
    pinImg.src = report.favorite ? FAVORITE_PIN : LINK_PIN;
    pinImg.className = "w-[22px] h-[22px]";
    pinBtn.appendChild(pinImg);
    thumbWrap.appendChild(pinBtn);
    body.appendChild(thumbWrap);

    const desc = document.createElement("p");
    desc.className = "project-card__desc text-[13px] font-medium leading-relaxed text-white text-justify line-clamp-3";
    desc.textContent = excerpt(report.description) || "No description available.";
    body.appendChild(desc);
    article.appendChild(body);

    const btn = document.createElement("button");
    btn.className = "project-card__btn w-full py-2.5 rounded-full border border-white/20 text-white text-sm font-semibold transition-colors";
    btn.style.background = "rgba(255,255,255,0.1)";
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
    if (!source.backendId && !source.documentId) {
      window.alert("Dashboard ini belum tersambung ke data Strapi, jadi belum bisa di-pin.");
      return;
    }
    const prev = source.favorite;
    source.favorite = !source.favorite;
    renderReports();
    try {
      const res = await fetch(TOGGLE_PIN_ENDPOINT, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ dashboardId: source.documentId || source.backendId || source.id }),
      });
      if (res.status === 401 || res.status === 403) { redirectToLogin(); return; }
      const payload = await res.json().catch(() => ({}));
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

  // ─── Render reports ───────────────────────────────────────────────────────

  function render(container, items, emptyMessage = "No dashboards found.") {
    if (!container) return;
    container.innerHTML = "";
    if (items.length === 0) {
      const p = document.createElement("p");
      p.className = "text-white/40 text-sm py-8";
      p.textContent = emptyMessage;
      container.appendChild(p);
      return;
    }
    const fullWidth = container.id === "allReports";
    items.forEach((report) => container.appendChild(createCard(report, fullWidth)));
  }

  function renderReports() {
    const searchTerm = (searchInput?.value || "").trim().toLowerCase();
    const hasSearch = searchTerm.length > 0;

    const url = new URL(window.location.href);
    if (hasSearch) { url.searchParams.set("q", searchInput.value.trim()); }
    else { url.searchParams.delete("q"); }
    window.history.replaceState({}, "", url);

    const visible = reports.filter((r) => {
      const matchSearch = r.title.toLowerCase().includes(searchTerm);
      const matchArchive = archiveMode ? !r.active : r.active;
      const matchJourney = hasSearch || !activeJourney || r.journey.toLowerCase() === activeJourney.toLowerCase();
      return matchSearch && matchArchive && matchJourney;
    });

    if (allInsightTitle) {
      allInsightTitle.textContent = hasSearch
        ? "Search Results"
        : archiveMode
          ? "Archive"
          : activeJourney || "All Insight Project";
    }

    render(
      allContainer,
      [...visible].sort((a, b) => Number(a.favorite) - Number(b.favorite)),
      hasSearch ? "No dashboards match your search." : "No dashboards found."
    );
  }

  // ─── Open report ──────────────────────────────────────────────────────────

  function openReport(report) {
    const id = report.documentId || report.backendId || report.id;
    window.location.href = `detail.html?id=${encodeURIComponent(id)}`;
  }

  // ─── Event binding ────────────────────────────────────────────────────────

  function bindEvents() {
    document.querySelectorAll(".landing-nav__logout, .dashboard-detail__logout").forEach((link) => {
      link.addEventListener("click", clearAuth);
    });

    searchInput?.addEventListener("focus", openNavSearch);
    searchInput?.addEventListener("input", renderReports);
    searchButton?.setAttribute("aria-expanded", "false");
    searchButton?.addEventListener("click", function () {
      openNavSearch();
      searchInput?.focus();
      renderReports();
    });

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

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (mainNav?.classList.contains("nav-searching")) { searchInput?.blur(); closeNavSearch(true); }
    });
  }

  // ─── API loading ──────────────────────────────────────────────────────────

  async function loadPinnedDashboardIds() {
    const res = await fetch(PINS_ENDPOINT, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) {
      console.warn("Pinned dashboards could not be loaded. Check authenticated role permission for dashboard-pin.");
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
        loadPinnedDashboardIds(),
      ]);
      if (res.status === 401 || res.status === 403) {
        console.warn("Power BI dashboards could not be loaded. Check authenticated role permission for power-bi-dashboard.");
        return;
      }
      if (!res.ok) throw new Error(`Strapi returned ${res.status}`);
      const payload = await res.json();
      const items = Array.isArray(payload.data) ? payload.data : [];
      reports = items.map(normalizeReport);
      renderReports();
    } catch (err) {
      console.warn("Power BI reports could not be loaded.", err);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  bindEvents();
  renderReports();
  loadReports();
})();
