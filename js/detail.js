(function () {
  const API_BASE_URL = window.API_BASE_URL || "https://optimistic-desk-3615e76660.strapiapp.com";
  const AUTH_STORAGE_KEY = "inspireAuth";
  const DEFAULT_THUMBNAIL = "../assets/dashboard/2ab368079453c27e55a7c4748363b84b90049f0f.png";

  const auth = readAuth();
  if (!auth?.jwt) {
    window.location.replace("login.html");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const reportId = params.get("id");
  const returnTo = getSafeReturnTo(params.get("returnTo"));

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

  function getSafeReturnTo(value) {
    if (!value) return "home.html";
    try {
      const decoded = decodeURIComponent(value);
      if (/^(home|archive)\.html(?:\?.*)?$/.test(decoded)) return decoded;
    } catch (_e) {
      if (/^(home|archive)\.html(?:\?.*)?$/.test(value)) return value;
    }
    return "home.html";
  }

  function internalReferrerPath() {
    if (!document.referrer) return "";
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin !== window.location.origin) return "";
      const page = referrer.pathname.split("/").pop();
      if (!/^(home|archive|detail)\.html$/.test(page)) return "";
      return `${page}${referrer.search}`;
    } catch (_e) {
      return "";
    }
  }

  function backFallback() {
    const referrerPath = internalReferrerPath();
    if (referrerPath && !referrerPath.startsWith("detail.html")) return referrerPath;
    return returnTo;
  }

  function setupBackLinks() {
    const fallback = backFallback();
    const isArchive = fallback.startsWith("archive.html");
    const label = isArchive ? "Back to Archive" : "Back to Home";
    document.querySelectorAll("a, button").forEach((link) => {
      if (!/\bback\b/i.test(link.textContent || "")) return;
      if (link.tagName === "A") link.href = fallback;
      if (link.tagName === "BUTTON" && !link.getAttribute("type")) link.setAttribute("type", "button");
      const text = link.querySelector("span:last-child");
      if (text) text.textContent = label;
      else link.textContent = `← ${label}`;
      link.addEventListener("click", function (event) {
        const referrerPath = internalReferrerPath();
        if (!referrerPath || referrerPath.startsWith("detail.html")) return;
        event.preventDefault();
        window.history.back();
      });
    });
  }

  setupBackLinks();

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
    zoom = Math.min(1.25, Math.max(0.85, value));
    const transform = `scale(${zoom})`;
    if (frameEl) frameEl.style.transform = transform;
    if (thumbnailEl && !thumbnailEl.hidden) thumbnailEl.style.transform = transform;
    zoomInEl?.setAttribute("aria-disabled", zoom >= 1.25 ? "true" : "false");
    zoomOutEl?.setAttribute("aria-disabled", zoom <= 0.85 ? "true" : "false");
  }

  function normalizeId(v) { return v === undefined || v === null ? "" : String(v); }

  function field(record, names, fallback = "") {
    const src = record.attributes || record;
    for (const name of names) {
      if (src[name] !== undefined && src[name] !== null && src[name] !== "") return src[name];
    }
    return fallback;
  }

  function richTextToText(value, fallback = "") {
    const text = blockText(value).replace(/\n{3,}/g, "\n\n").trim();
    return text || fallback;
  }

  function blockText(value, index = 0) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      return value
        .map((item, itemIndex) => blockText(item, itemIndex))
        .filter(Boolean)
        .join("\n");
    }

    if (value && typeof value === "object") {
      if (value.type === "list") {
        const ordered = value.format === "ordered";
        return (value.children || [])
          .map((child, childIndex) => {
            const itemText = blockText(child, childIndex).replace(/\s+/g, " ").trim();
            if (!itemText) return "";
            return ordered ? `${childIndex + 1}. ${itemText}` : `- ${itemText}`;
          })
          .filter(Boolean)
          .join("\n");
      }
      if (value.type === "list-item") {
        return inlineText(value.children || value.content || "").trim();
      }
      if (value.type === "paragraph" || value.type === "heading" || value.type === "quote") {
        return inlineText(value.children || value.content || "").trim();
      }
      if (typeof value.text === "string") return value.text;
      if (typeof value.content === "string") return value.content;
      if (Array.isArray(value.children)) return blockText(value.children);
    }

    return "";
  }

  function inlineText(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(inlineText).join("");
    if (value && typeof value === "object") {
      if (typeof value.text === "string") return value.text;
      if (typeof value.content === "string") return value.content;
      if (Array.isArray(value.children)) return value.children.map(inlineText).join("");
    }
    return "";
  }

  function renderRichText(container, value, fallback = "—") {
    if (!container) return;
    container.innerHTML = "";
    const nodes = richTextNodes(value);
    if (nodes.length === 0) {
      container.textContent = fallback;
      return;
    }
    nodes.forEach((node) => container.appendChild(node));
  }

  function richTextNodes(value) {
    if (value === undefined || value === null || value === "") return [];
    if (typeof value === "string" || typeof value === "number") {
      const lines = String(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
      return lines.map((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        return p;
      });
    }
    if (Array.isArray(value)) return value.flatMap(richTextNodes);
    if (typeof value !== "object") return [];

    if (value.type === "list") {
      const list = document.createElement(value.format === "ordered" ? "ol" : "ul");
      (value.children || []).forEach((child) => {
        const item = document.createElement("li");
        appendInline(item, child.children || child.content || child);
        list.appendChild(item);
      });
      return list.children.length ? [list] : [];
    }

    if (value.type === "heading") {
      const heading = document.createElement("h3");
      appendInline(heading, value.children || value.content || "");
      return heading.textContent.trim() ? [heading] : [];
    }

    if (value.type === "paragraph" || value.type === "quote") {
      const p = document.createElement("p");
      appendInline(p, value.children || value.content || "");
      return p.textContent.trim() ? [p] : [];
    }

    if (typeof value.text === "string" || typeof value.content === "string") {
      return richTextNodes(value.text || value.content);
    }
    if (Array.isArray(value.children)) return richTextNodes(value.children);

    return [];
  }

  function appendInline(parent, value) {
    if (value === undefined || value === null) return;
    if (typeof value === "string" || typeof value === "number") {
      parent.appendChild(document.createTextNode(String(value)));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => appendInline(parent, item));
      return;
    }
    if (typeof value !== "object") return;

    if (typeof value.text === "string") {
      let node = document.createTextNode(value.text);
      if (value.bold) {
        const strong = document.createElement("strong");
        strong.appendChild(node);
        node = strong;
      }
      if (value.italic) {
        const em = document.createElement("em");
        em.appendChild(node);
        node = em;
      }
      if (value.underline) {
        const underline = document.createElement("u");
        underline.appendChild(node);
        node = underline;
      }
      parent.appendChild(node);
      return;
    }

    appendInline(parent, value.children || value.content || "");
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

  function powerBiPreviewUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      if (url.hostname.includes("powerbi.com")) {
        if (url.pathname.includes("/reports/") && !url.pathname.includes("/reportEmbed")) {
          const parts = url.pathname.split("/").filter(Boolean);
          const groupIndex = parts.indexOf("groups");
          const reportIndex = parts.indexOf("reports");
          const groupId = groupIndex >= 0 ? parts[groupIndex + 1] : "";
          const reportId = reportIndex >= 0 ? parts[reportIndex + 1] : "";

          if (groupId && reportId) {
            const embedUrl = new URL(`${url.origin}/reportEmbed`);
            embedUrl.searchParams.set("reportId", reportId);
            embedUrl.searchParams.set("groupId", groupId);
            embedUrl.searchParams.set("autoAuth", "true");
            if (url.searchParams.get("ctid")) embedUrl.searchParams.set("ctid", url.searchParams.get("ctid"));
            embedUrl.searchParams.set("pageView", "fitToWidth");
            return embedUrl.toString();
          }
        }
        url.searchParams.set("pageView", "fitToWidth");
      }
      return url.toString();
    } catch (_e) {
      return value;
    }
  }

  function normalizeReport(record) {
    const title = field(record, ["title", "name", "reportTitle"], "Untitled dashboard");
    const objectiveRaw = field(record, ["objective", "Objective"], "");
    const dataUsageRaw = field(record, ["dataUsage", "data_usage", "DataUsage"], "");
    const businessQuestionRaw = field(record, ["businessQuestion", "business_question", "BusinessQuestion"], "");
    const objective = richTextToText(objectiveRaw, "");
    const journey = field(record, ["journey", "category", "type"], "General");
    const frequency = field(record, ["frequency"], "");
    const dataUsage = richTextToText(dataUsageRaw, "");
    const businessQuestion = richTextToText(businessQuestionRaw, "");
    const url = safeUrl(field(record, ["powerBiUrl", "PowerBiUrl", "powerBIUrl", "powerBIURL", "powerbiUrl", "powerbiurl", "power_bi_url", "embedUrl", "embedURL", "reportUrl", "url", "link"]));
    const thumbnail = mediaUrl(field(record, ["thumbnail", "image", "cover"]));
    return {
      title, objective, objectiveRaw, journey, frequency,
      dataUsage, dataUsageRaw, businessQuestion, businessQuestionRaw,
      url, thumbnail,
    };
  }

  function renderReport(report) {
    const canShowPowerBiPreview = Boolean(report.url);
    const canShowThumbnail = !canShowPowerBiPreview && Boolean(report.thumbnail);

    if (titleEl) titleEl.textContent = report.title;
    if (frequencyEl) frequencyEl.textContent = report.frequency ? `${report.frequency} Refresh` : "Weekly Refresh";
    renderRichText(objectiveEl, report.objectiveRaw || report.objective);
    renderRichText(usageEl, report.dataUsageRaw || report.dataUsage);
    renderRichText(questionEl, report.businessQuestionRaw || report.businessQuestion);

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

    if (frameEl) {
      frameEl.hidden = !canShowPowerBiPreview;
      if (canShowPowerBiPreview) frameEl.src = powerBiPreviewUrl(report.url);
      else frameEl.removeAttribute("src");
      frameEl.style.transform = "";
    }
    if (thumbnailEl) {
      thumbnailEl.hidden = !canShowThumbnail;
      if (canShowThumbnail) thumbnailEl.src = report.thumbnail;
      else thumbnailEl.removeAttribute("src");
    }
    if (emptyEl) {
      emptyEl.hidden = canShowPowerBiPreview || canShowThumbnail;
      emptyEl.style.display = canShowPowerBiPreview || canShowThumbnail ? "none" : "flex";
      const message = emptyEl.querySelector("span");
      if (message) {
        message.textContent = "Power BI URL belum tersedia untuk dashboard ini.";
      }
    }
    if (openTabEl) {
      openTabEl.href = report.url || "#";
      openTabEl.setAttribute("aria-disabled", report.url ? "false" : "true");
      openTabEl.tabIndex = report.url ? 0 : -1;
    }
    if (previewLinkEl) {
      previewLinkEl.setAttribute("aria-disabled", canShowPowerBiPreview ? "false" : "true");
    }

    setZoom(1);
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) contentEl.style.display = "flex";
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
