(function () {
  const API_BASE_URL = window.API_BASE_URL || "https://uplifting-cheese-44a7f505da.strapiapp.com";
  const AUTH_STORAGE_KEY = "inspireAuth";
  const DEFAULT_THUMBNAIL = "../assets/dashboard/2ab368079453c27e55a7c4748363b84b90049f0f.png";

  const auth = readAuth();
  if (!auth?.jwt) {
    window.location.replace("login.html");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const reportId = params.get("id");

  const loadingEl = document.getElementById("detailLoading");
  const errorEl = document.getElementById("detailError");
  const errorMsgEl = document.getElementById("detailErrorMsg");
  const contentEl = document.getElementById("detailContent");
  const titleEl = document.getElementById("detailTitle");
  const frequencyEl = document.getElementById("detailFrequency");
  const frameEl = document.getElementById("detailFrame");
  const thumbnailEl = document.getElementById("detailThumbnail");
  const emptyEl = document.getElementById("detailEmpty");
  const objectiveEl = document.getElementById("detailObjective");
  const usageEl = document.getElementById("detailUsage");
  const questionEl = document.getElementById("detailQuestion");
  const zoomInEl = document.getElementById("detailZoomIn");
  const zoomOutEl = document.getElementById("detailZoomOut");
  const openTabEl = document.getElementById("detailOpenNewTab");
  const previewLinkEl = document.getElementById("detailPreviewLink");

  let zoom = 1;
  let currentPowerBiUrl = "";


  function readAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null"); }
    catch (_e) { return null; }
  }

  function authHeaders(extra = {}) {
    return { ...extra, Authorization: `Bearer ${auth.jwt}` };
  }

  function redirectToLogin() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.replace("login.html");
  }

  function showError(msg) {
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) contentEl.style.display = "none";
    if (errorMsgEl) errorMsgEl.textContent = msg || "Dashboard not found.";
    if (errorEl) errorEl.style.display = "flex";
  }

  function setZoom(value) {
    zoom = Math.min(1.6, Math.max(0.75, value));
    if (frameEl) frameEl.style.transform = `scale(${zoom})`;
    if (thumbnailEl) thumbnailEl.style.transform = `scale(${zoom})`;
  }

  function normalizeId(v) { return v === undefined || v === null ? "" : String(v); }

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
    try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) ? u.toString() : ""; }
    catch (_e) { return ""; }
  }

  function normalizeReport(record) {
    const title = field(record, ["title", "name", "reportTitle"], "Untitled dashboard");
    const objective = field(record, ["objective", "description", "desc"], "");
    const journey = field(record, ["journey", "category", "type"], "General");
    const frequency = field(record, ["frequency"], "");
    const dataUsage = field(record, ["dataUsage", "data_usage"], "");
    const businessQuestion = field(record, ["businessQuestion", "business_question"], "");
    const url = safeUrl(field(record, ["powerBiUrl", "powerBIUrl", "embedUrl", "reportUrl", "url", "link"]));
    const thumbnail = mediaUrl(field(record, ["thumbnail", "image", "cover"]));
    return { title, objective, journey, frequency, dataUsage, businessQuestion, url, thumbnail };
  }

  function renderReport(report) {
    currentPowerBiUrl = report.url || "";
    if (titleEl) titleEl.textContent = report.title;
    if (frequencyEl) frequencyEl.textContent = report.frequency ? `${report.frequency} Refresh` : "Weekly Refresh";
    if (objectiveEl) objectiveEl.textContent = report.objective || "—";
    if (usageEl) usageEl.textContent = report.dataUsage || "—";
    if (questionEl) questionEl.textContent = report.businessQuestion || "—";

    document.querySelectorAll(".dashboard-detail__tab").forEach((tab) => {
      const active = tab.textContent.trim().toLowerCase() === String(report.journey || "").toLowerCase();
      if (active) {
        tab.classList.add("is-active");
        tab.setAttribute("aria-current", "page");
      } else {
        tab.classList.remove("is-active");
        tab.removeAttribute("aria-current");
      }
    });

    if (frameEl) { frameEl.hidden = !report.url; frameEl.src = report.url || ""; }
    if (thumbnailEl) { thumbnailEl.hidden = Boolean(report.url); thumbnailEl.src = report.thumbnail || DEFAULT_THUMBNAIL; }
    if (emptyEl) emptyEl.hidden = Boolean(report.url);
    if (openTabEl) {
      openTabEl.href = report.url || "#";
      openTabEl.setAttribute("aria-disabled", report.url ? "false" : "true");
      openTabEl.tabIndex = report.url ? 0 : -1;
    }
    if (previewLinkEl) {
      previewLinkEl.setAttribute("aria-disabled", report.url ? "false" : "true");
      previewLinkEl.tabIndex = report.url ? 0 : -1;
    }

    setZoom(1);
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) contentEl.style.display = "flex";
  }

  function openPowerBiLink() {
    if (!currentPowerBiUrl) return;
    window.open(currentPowerBiUrl, "_blank", "noopener");
  }

  zoomInEl?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setZoom(zoom + 0.1);
  });
  zoomOutEl?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setZoom(zoom - 0.1);
  });
  previewLinkEl?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button, iframe")) return;
    openPowerBiLink();
  });
  previewLinkEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPowerBiLink();
  });

  document.querySelectorAll(".nav-tab[data-journey]").forEach((tab) => {
    tab.addEventListener("click", function (e) {
      e.preventDefault();
      const journey = tab.dataset.journey || "";
      window.location.href = `archive.html?view=category&journey=${encodeURIComponent(journey)}`;
    });
  });

  async function init() {
    if (!reportId) { showError("No dashboard ID provided."); return; }
    try {
      let res = await fetch(
        `${API_BASE_URL}/api/power-bi-dashboards?filters[documentId][$eq]=${encodeURIComponent(reportId)}&populate=*`,
        { headers: authHeaders() }
      );
      if (res.status === 401 || res.status === 403) { redirectToLogin(); return; }
      if (!res.ok) throw new Error(`Strapi returned ${res.status}`);
      let payload = await res.json();
      let items = Array.isArray(payload.data) ? payload.data : [];

      if (items.length === 0) {
        res = await fetch(
          `${API_BASE_URL}/api/power-bi-dashboards?filters[id][$eq]=${encodeURIComponent(reportId)}&populate=*`,
          { headers: authHeaders() }
        );
        if (res.status === 401 || res.status === 403) { redirectToLogin(); return; }
        if (!res.ok) throw new Error(`Strapi returned ${res.status}`);
        payload = await res.json();
        items = Array.isArray(payload.data) ? payload.data : [];
      }

      if (items.length === 0) { showError("Dashboard not found."); return; }
      renderReport(normalizeReport(items[0]));
    } catch (err) {
      showError("Failed to load dashboard.");
      console.error(err);
    }
  }

  init();
})();
