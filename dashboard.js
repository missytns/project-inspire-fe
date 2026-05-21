(function () {
  const API_BASE_URL = "http://localhost:1337";
  const REPORTS_ENDPOINT = `${API_BASE_URL}/api/power-bi-dashboards?populate=*`;
  const PINS_ENDPOINT = `${API_BASE_URL}/api/dashboard-pins/me`;
  const TOGGLE_PIN_ENDPOINT = `${API_BASE_URL}/api/dashboard-pins/toggle`;
  const AUTH_ME_ENDPOINT = `${API_BASE_URL}/api/users/me`;
  const AUTH_STORAGE_KEY = "inspireAuth";
  const DEFAULT_THUMBNAIL = "assets/dashboard/2ab368079453c27e55a7c4748363b84b90049f0f.png";
  const GLOW_ASSET = "assets/dashboard/38b9708cc785b2fa824ed77070caa4cf5c2db57b.svg";
  const FAVORITE_PIN = "assets/dashboard/fac7502a76b4636def2e574a61de51c3becf3e9b.svg";
  const LINK_PIN = "assets/dashboard/ca8a615c7774f061cda8fb2ae4262d5dbfd39b15.svg";
  const FAVORITE_LIMIT = 4;
  const CARD_EXCERPT_LENGTH = 112;
  const FIGMA_PAGE_WIDTH = 1512;
  const FIGMA_HERO_HEIGHT = 982;
  const FIGMA_CONTENT_HEIGHT = 1683;
  const auth = readAuth();

  if (!auth?.jwt) {
    window.location.replace("index.html");
    return;
  }

  const viewportScale = document.querySelector(".viewport-scale");
  const landingNav = document.querySelector(".landing-nav");
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
  const modal = document.getElementById("reportModal");
  const modalTitle = document.getElementById("reportModalTitle");
  const modalDescription = document.getElementById("reportModalDescription");
  const modalFrame = document.getElementById("reportModalFrame");
  const modalOpen = document.getElementById("reportModalOpen");
  const detail = document.getElementById("dashboardDetail");
  const detailTitle = document.getElementById("detailTitle");
  const detailFrequency = document.getElementById("detailFrequency");
  const detailFrame = document.getElementById("detailFrame");
  const detailThumbnail = document.getElementById("detailThumbnail");
  const detailEmpty = document.getElementById("detailEmpty");
  const detailObjective = document.getElementById("detailObjective");
  const detailUsage = document.getElementById("detailUsage");
  const detailQuestion = document.getElementById("detailQuestion");
  const detailZoomIn = document.getElementById("detailZoomIn");
  const detailZoomOut = document.getElementById("detailZoomOut");
  const detailOpenNewTab = document.getElementById("detailOpenNewTab");
  const params = new URLSearchParams(window.location.search);
  const pageView = params.get("view");
  let archiveMode = pageView === "archive";
  let categoryMode = pageView === "category";
  let resultMode = archiveMode || categoryMode;
  const requestedJourney = params.get("journey") || "";
  const requestedSearch = params.get("q") || "";
  document.documentElement.classList.toggle("archive-mode", resultMode);
  document.body.classList.toggle("archive-mode", resultMode);
  const insightOptions = {
    workspace: ["Marvel", "Shield"],
    environment: ["Operation", "Development"],
    frequency: ["Monthly", "Weekly", "Daily", "Ad Hoc"],
  };

  let reports = [];
  let pinnedDashboardIds = new Set();
  let activeJourney = categoryMode
    ? requestedJourney || navTabs[0]?.dataset.journey || ""
    : navTabs.find((tab) => tab.classList.contains("nav-tab--active"))?.dataset.journey || "";
  let activeInsightFilter = tabs.find((tab) => tab.classList.contains("insight-tab--active"))?.dataset.insightFilter || "";
  let activeInsightValue = "";
  let detailZoom = 1;

  if (searchInput && requestedSearch) {
    searchInput.value = requestedSearch;
  }

  if (resultMode && navTabs.length > 0) {
    navTabs.forEach((tab) => {
      tab.classList.toggle("nav-tab--active", tab.dataset.journey === activeJourney);
    });
  }

  function readAuth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function authHeaders(extraHeaders = {}) {
    return {
      ...extraHeaders,
      Authorization: `Bearer ${auth.jwt}`,
    };
  }

  function redirectToLogin() {
    clearAuth();
    window.location.replace("index.html");
  }

  async function verifySession() {
    const response = await fetch(AUTH_ME_ENDPOINT, {
      headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return false;
    }

    if (!response.ok) throw new Error(`Auth check returned ${response.status}`);
    return true;
  }

  function normalizeId(value) {
    return value === undefined || value === null ? "" : String(value);
  }

  function openNavSearch() {
    landingNav?.classList.add("landing-nav--searching");
    searchButton?.setAttribute("aria-expanded", "true");
  }

  function setDetailZoom(value) {
    detailZoom = Math.min(1.6, Math.max(0.75, value));
    detailFrame?.style.setProperty("--detail-zoom", String(detailZoom));
    detailThumbnail?.style.setProperty("--detail-zoom", String(detailZoom));
  }

  function closeNavSearch(force = false) {
    if (!force && searchInput?.value.trim()) return;

    landingNav?.classList.remove("landing-nav--searching");
    searchButton?.setAttribute("aria-expanded", "false");
  }

  function syncDashboardScale() {
    if (!viewportScale) return;

    const isMobileLayout = window.matchMedia("(max-width: 760px)").matches;
    const isScaledLanding = !isMobileLayout && !resultMode && !document.body.classList.contains("dashboard-detail-open");
    const pageScale = isScaledLanding ? Math.min(window.innerWidth / FIGMA_PAGE_WIDTH, 1) : 1;
    const pageScaledHeight = isScaledLanding
      ? (FIGMA_HERO_HEIGHT + FIGMA_CONTENT_HEIGHT) * pageScale
      : FIGMA_HERO_HEIGHT + FIGMA_CONTENT_HEIGHT;

    viewportScale.style.setProperty("--page-scale", pageScale.toString());
    viewportScale.style.setProperty("--hero-viewport-height", `${FIGMA_HERO_HEIGHT}px`);
    viewportScale.style.setProperty("--page-scaled-height", `${pageScaledHeight}px`);
  }

  function field(record, names, fallback = "") {
    const source = record.attributes || record;
    for (const name of names) {
      if (source[name] !== undefined && source[name] !== null && source[name] !== "") {
        return source[name];
      }
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
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch (_error) {
      return "";
    }
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
    const normalized = String(title || "").toLowerCase();
    if (normalized.includes("productivity h23") || normalized.includes("parts sales")) return "After Sales";
    if (normalized.includes("digital maturity")) return "General";
    if (normalized.includes("nms")) return "Sales";
    return "Pre-Sales";
  }

  function normalizeReport(record) {
    const title = field(record, ["title", "name", "reportTitle"], "Untitled dashboard");
    const objective = field(record, ["objective", "description", "desc"], "");
    const description = objective;
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
      id,
      backendId: normalizeId(rawId),
      documentId: normalizeId(documentId),
      title,
      description,
      journey,
      workspace,
      environment,
      frequency,
      objective,
      dataUsage,
      businessQuestion,
      url,
      thumbnail,
      favorite: favorite || pinnedDashboardIds.has(id) || pinnedDashboardIds.has(normalizeId(rawId)),
      active,
    };
  }

  function createCard(report) {
    const article = document.createElement("article");
    article.className = "project-card";

    const button = document.createElement("button");
    button.className = "project-card__btn";
    button.type = "button";
    button.textContent = "See detail";

    article.innerHTML = `
      <div class="project-card__glow" aria-hidden="true">
        <img src="${GLOW_ASSET}" alt="" />
      </div>
      <div class="project-card__body">
        <h3 class="project-card__name"></h3>
        <div class="project-card__thumb-wrap">
          <img class="project-card__thumb" alt="" />
          <button class="project-card__pin ${report.favorite ? "project-card__pin--favorite" : "project-card__pin--link"}" type="button">
            <img src="${report.favorite ? FAVORITE_PIN : LINK_PIN}" alt="" />
          </button>
        </div>
        <p class="project-card__desc"></p>
      </div>
    `;

    article.querySelector(".project-card__name").textContent = report.title;
    article.querySelector(".project-card__thumb").src = report.thumbnail;
    article.querySelector(".project-card__desc").textContent = excerpt(report.description) || "No description available.";
    article.querySelector(".project-card__pin").setAttribute("aria-label", `${report.favorite ? "Unpin" : "Pin"} ${report.title}`);
    article.appendChild(button);
    makeCardInteractive(article, report);

    return article;
  }

  function makeCardInteractive(article, report) {
    const button = article.querySelector(".project-card__btn");
    const pinButton = article.querySelector(".project-card__pin");

    if (!report.active) {
      article.classList.add("project-card--disabled");
      article.removeAttribute("role");
      article.removeAttribute("tabindex");
      article.removeAttribute("aria-label");
      if (button) button.disabled = true;
      if (pinButton) pinButton.disabled = true;
      return;
    }

    article.classList.remove("project-card--disabled");
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    article.setAttribute("aria-label", `Open ${report.title}`);
    if (button) button.disabled = false;
    if (pinButton) pinButton.disabled = false;

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

    button?.addEventListener("click", function () {
      openReport(report);
    });

    pinButton?.addEventListener("click", function () {
      toggleFavorite(report);
    });
  }

  function staticReportFromCard(article, favorite = false) {
    const button = article.querySelector(".project-card__btn");
    const title = article.querySelector(".project-card__name")?.textContent.trim() || "Dashboard";
    const description = article.querySelector(".project-card__desc")?.textContent.trim() || "";
    const thumbnail = article.querySelector(".project-card__thumb")?.getAttribute("src") || DEFAULT_THUMBNAIL;
    const rawUrl =
      article.dataset.reportUrl ||
      button?.dataset.reportUrl ||
      article.querySelector("a[href]")?.getAttribute("href") ||
      "";

    return {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title,
      description,
      thumbnail,
      journey: article.dataset.journey || inferJourney(title),
      workspace: "Marvel",
      environment: "Operation",
      frequency: "Monthly",
      objective: "",
      dataUsage: "",
      businessQuestion: "",
      url: safeUrl(rawUrl),
      favorite,
      active: !article.classList.contains("project-card--disabled"),
    };
  }

  function loadStaticReports() {
    const favoriteCards = Array.from(document.querySelectorAll("#favoriteReports .project-card"));
    const favoriteTitles = new Set(
      favoriteCards.map((article) => article.querySelector(".project-card__name")?.textContent.trim()).filter(Boolean)
    );
    const allCards = Array.from(document.querySelectorAll("#allReports .project-card"));
    reports = allCards.map((article) => {
      const title = article.querySelector(".project-card__name")?.textContent.trim() || "";
      return staticReportFromCard(article, favoriteTitles.has(title));
    });

    favoriteCards.forEach((article) => {
      const title = article.querySelector(".project-card__name")?.textContent.trim() || "";
      if (!reports.some((report) => report.title === title)) {
        reports.push(staticReportFromCard(article, true));
      }
    });

    renderReports();
  }

  async function toggleFavorite(report) {
    const source = reports.find((item) => item.id === report.id) || report;

    if (!source.favorite && reports.filter((item) => item.favorite).length >= FAVORITE_LIMIT) {
      window.alert(`Maksimal ${FAVORITE_LIMIT} dashboard yang bisa di-pin. Unpin dashboard lama dulu.`);
      return;
    }

    if (!source.backendId && !source.documentId) {
      window.alert("Dashboard ini belum tersambung ke data Strapi, jadi belum bisa di-pin.");
      return;
    }

    const previousFavorite = source.favorite;
    source.favorite = !source.favorite;
    renderReports();

    try {
      const response = await fetch(TOGGLE_PIN_ENDPOINT, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          dashboardId: source.documentId || source.backendId || source.id,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error?.message || "Pin update failed.");
      }

      source.favorite = Boolean(payload.data?.pinned);
      const pinId = normalizeId(payload.data?.dashboardId || source.documentId || source.backendId || source.id);
      if (source.favorite) {
        pinnedDashboardIds.add(pinId);
      } else {
        pinnedDashboardIds.delete(pinId);
        pinnedDashboardIds.delete(source.id);
        pinnedDashboardIds.delete(source.backendId);
        pinnedDashboardIds.delete(source.documentId);
      }
    } catch (error) {
      source.favorite = previousFavorite;
      window.alert(error.message || "Pin update failed.");
    }

    renderReports();
  }

  function renderInsightSubfilters() {
    if (!insightSubfilters) return;

    const options = insightOptions[activeInsightFilter] || [];
    insightSubfilters.innerHTML = "";
    insightSubfilters.hidden = options.length === 0;

    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = `insight-subfilter${activeInsightValue === option ? " insight-subfilter--active" : ""}`;
      button.type = "button";
      button.textContent = option;
      button.dataset.insightValue = option;
      button.addEventListener("click", function () {
        activeInsightValue = activeInsightValue === option ? "" : option;
        renderInsightSubfilters();
        renderReports();
      });
      insightSubfilters.appendChild(button);
    });
  }

  function bindStaticCards() {
    document.querySelectorAll(".project-card").forEach((article) => {
      makeCardInteractive(article, staticReportFromCard(article));
    });
  }

  function render(container, items, emptyMessage = "No dashboards found.") {
    if (!container) return;
    container.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "reports-empty";
      empty.textContent = emptyMessage;
      container.appendChild(empty);
      return;
    }

    items.forEach((report) => {
      container.appendChild(createCard(report));
    });
  }

  function renderReports() {
    const searchTerm = (searchInput?.value || "").trim().toLowerCase();
    const hasSearch = searchTerm.length > 0;
    document.documentElement.classList.toggle("search-mode", hasSearch);
    document.body.classList.toggle("search-mode", hasSearch);

    const searchUrl = new URL(window.location.href);
    if (hasSearch) {
      searchUrl.searchParams.set("q", searchInput.value.trim());
    } else {
      searchUrl.searchParams.delete("q");
    }
    window.history.replaceState({}, "", searchUrl);

    const visibleReports = reports.filter((report) => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm);
      const matchesArchive = archiveMode ? !report.active : report.active;
      const matchesJourney = hasSearch || !activeJourney || report.journey.toLowerCase() === activeJourney.toLowerCase();
      return matchesSearch && matchesArchive && matchesJourney;
    });

    if (favoriteSection) favoriteSection.hidden = resultMode || hasSearch;
    if (insightTabsNav) insightTabsNav.hidden = resultMode || hasSearch;
    if (insightSubfilters) insightSubfilters.hidden = resultMode || hasSearch || (insightOptions[activeInsightFilter] || []).length === 0;
    if (allInsightTitle) {
      allInsightTitle.textContent = hasSearch
        ? "Search Results"
        : archiveMode
          ? "Archive"
          : categoryMode && activeJourney
            ? activeJourney
            : "All Insight Project";
    }

    if (!resultMode && !hasSearch) {
      render(favoriteContainer, visibleReports.filter((report) => report.favorite).slice(0, FAVORITE_LIMIT));
    }

    const insightReports = hasSearch ? visibleReports : visibleReports.filter((report) => {
      if (!activeInsightFilter || !activeInsightValue) return true;
      return String(report[activeInsightFilter] || "").toLowerCase() === activeInsightValue.toLowerCase();
    });

    render(
      allContainer,
      [...insightReports].sort((first, second) => Number(first.favorite) - Number(second.favorite)),
      hasSearch ? "No dashboards match your search." : "No dashboards found."
    );
  }

  function openReport(report) {
    if (detail) {
      const description = report.description || "No description available.";
      const frequency = report.frequency ? `${report.frequency} Refresh` : "Weekly Refresh";
      document.querySelectorAll(".dashboard-detail__tab").forEach((tab) => {
        tab.classList.toggle(
          "dashboard-detail__tab--active",
          tab.textContent.trim().toLowerCase() === String(report.journey || activeJourney).toLowerCase()
        );
      });

      if (detailTitle) detailTitle.textContent = report.title;
      if (detailFrequency) detailFrequency.textContent = frequency;
      if (detailObjective) detailObjective.textContent = report.objective || description;
      if (detailUsage) detailUsage.textContent = report.dataUsage || description;
      if (detailQuestion) detailQuestion.textContent = report.businessQuestion || description;

      if (detailFrame) {
        detailFrame.hidden = !report.url;
        detailFrame.src = report.url || "";
      }

      setDetailZoom(1);

      if (detailThumbnail) {
        detailThumbnail.hidden = Boolean(report.url);
        detailThumbnail.src = report.thumbnail || DEFAULT_THUMBNAIL;
      }

      if (detailEmpty) {
        detailEmpty.hidden = Boolean(report.url);
      }

      if (detailOpenNewTab) {
        detailOpenNewTab.href = report.url || "#";
        detailOpenNewTab.setAttribute("aria-disabled", report.url ? "false" : "true");
        detailOpenNewTab.tabIndex = report.url ? 0 : -1;
      }

      detail.setAttribute("aria-hidden", "false");
      document.body.classList.add("dashboard-detail-open");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (!report.url || !modal) return;

    modalTitle.textContent = report.title;
    if (modalDescription) {
      modalDescription.textContent = report.description || "No description available.";
    }
    modalFrame.src = report.url;
    modalOpen.href = report.url;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("report-modal-open");
  }

  function closeDetail() {
    if (!detail) return;

    detail.setAttribute("aria-hidden", "true");
    if (detailFrame) detailFrame.src = "";
    setDetailZoom(1);
    document.body.classList.remove("dashboard-detail-open");
  }

  function closeReport() {
    if (!modal) return;

    modal.setAttribute("aria-hidden", "true");
    if (modalDescription) modalDescription.textContent = "";
    modalFrame.src = "";
    modalOpen.href = "#";
    document.body.classList.remove("report-modal-open");
  }

  function bindEvents() {
    document.querySelectorAll(".landing-nav__logout, .dashboard-detail__logout").forEach((link) => {
      link.addEventListener("click", function () {
        clearAuth();
      });
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
        if (!resultMode) {
          window.location.href = `landingpage.html?view=category&journey=${encodeURIComponent(journey)}`;
          return;
        }

        navTabs.forEach((item) => item.classList.remove("nav-tab--active"));
        tab.classList.add("nav-tab--active");
        activeJourney = journey;
        const url = new URL(window.location.href);
        url.searchParams.set("view", "category");
        url.searchParams.set("journey", activeJourney);
        url.searchParams.delete("q");
        window.history.replaceState({}, "", url);
        archiveMode = false;
        categoryMode = true;
        resultMode = true;
        renderReports();
      });
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        tabs.forEach((item) => item.classList.remove("insight-tab--active"));
        tab.classList.add("insight-tab--active");
        activeInsightFilter = tab.dataset.insightFilter || "";
        activeInsightValue = "";
        renderInsightSubfilters();
        renderReports();
      });
    });

    document.querySelectorAll("[data-close-report]").forEach((element) => {
      element.addEventListener("click", closeReport);
    });

    document.querySelectorAll("[data-close-detail]").forEach((element) => {
      element.addEventListener("click", closeDetail);
    });

    detailZoomIn?.addEventListener("click", function () {
      setDetailZoom(detailZoom + 0.1);
    });

    detailZoomOut?.addEventListener("click", function () {
      setDetailZoom(detailZoom - 0.1);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;

      closeDetail();
      closeReport();
      if (landingNav?.classList.contains("landing-nav--searching")) {
        searchInput?.blur();
        closeNavSearch(true);
      }
    });
  }

  async function loadPinnedDashboardIds() {
    const response = await fetch(PINS_ENDPOINT, {
      headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      console.warn("Pinned dashboards could not be loaded. Check authenticated role permission for dashboard-pin.");
      return;
    }

    if (!response.ok) throw new Error(`Pin endpoint returned ${response.status}`);

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];
    pinnedDashboardIds = new Set(
      items.flatMap((item) => [normalizeId(item.documentId), normalizeId(item.id)]).filter(Boolean)
    );
  }

  async function loadReports() {
    try {
      const sessionIsValid = await verifySession();
      if (!sessionIsValid) return;

      const [response] = await Promise.all([
        fetch(REPORTS_ENDPOINT, { headers: authHeaders() }),
        loadPinnedDashboardIds(),
      ]);

      if (response.status === 401 || response.status === 403) {
        console.warn("Power BI dashboards could not be loaded. Check authenticated role permission for power-bi-dashboard.");
        return;
      }

      if (!response.ok) throw new Error(`Strapi returned ${response.status}`);

      const payload = await response.json();
      const items = Array.isArray(payload.data) ? payload.data : [];
      reports = items.map(normalizeReport);
      renderReports();
    } catch (error) {
      console.warn("Power BI reports could not be loaded. Static dashboard cards are still shown.", error);
    }
  }

  bindEvents();
  loadStaticReports();
  renderInsightSubfilters();
  syncDashboardScale();
  window.addEventListener("resize", syncDashboardScale);
  window.visualViewport?.addEventListener("resize", syncDashboardScale);
  loadReports();
})();
