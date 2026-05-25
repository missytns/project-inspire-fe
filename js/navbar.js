(function () {
  const placeholder = document.getElementById("navbar-placeholder");
  if (!placeholder) return;

  const LOGOUT_BG = "url('../assets/dashboard/logout-button-gradient.svg') center/100% 100% no-repeat";
  const JOURNEYS = ["Pre-Sales", "Sales", "After Sales", "General"];

  if (!document.getElementById("inspire-navbar-styles")) {
    const style = document.createElement("style");
    style.id = "inspire-navbar-styles";
    style.textContent = `
      .landing-nav {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0 32px;
        gap: 16px;
        min-height: 88px;
        background: rgba(255, 255, 255, 0.12);
        border: 1.4px solid rgba(255, 255, 255, 0.56);
        border-radius: 999px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 24px 54px rgba(0,0,0,0.24);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      #navbar-placeholder {
        position: sticky;
        top: 24px;
        z-index: 50;
      }

      #navbar-placeholder.is_scroll {
        position: fixed !important;
        top: 16px !important;
        left: 50%;
        z-index: 1000;
        width: min(1311px, calc(100% - 48px)) !important;
        max-width: 1311px;
        margin-top: 0 !important;
        transform: translateX(-50%);
      }

      #navbar-placeholder.is_scroll .landing-nav {
        min-height: 76px;
        background: rgba(68, 45, 52, 0.76);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 18px 42px rgba(0,0,0,0.34);
      }

      .landing-nav__tabs-wrap,
      .landing-nav__search,
      .landing-nav__archive,
      .landing-nav-mobile-search,
      #navMobileDrawer {
        box-sizing: border-box;
        background: rgba(47, 47, 47, 0.82);
        border: 1px solid rgba(255, 255, 255, 0.56);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .landing-nav__brand {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .landing-nav__tabs-wrap {
        display: flex;
        align-items: center;
      }

      .landing-nav__tabs-wrap nav {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .landing-nav__search {
        display: flex;
        align-items: center;
        flex: 1 1 260px;
        margin-left: auto;
      }

      .landing-nav__archive,
      .landing-nav__logout,
      .landing-nav__menu,
      .landing-nav__search-btn,
      .landing-nav__search-btn-mobile {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .landing-nav__menu,
      .landing-nav-mobile-search {
        display: none;
      }

      .nav-tab {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #151515;
        border: 1px solid rgba(255, 255, 255, 0.55);
        box-shadow: 0 1px 0 rgba(255,255,255,0.18);
      }

      .nav-tab[aria-current="page"],
      .nav-tab.is-active {
        background: #e6383c !important;
        border-color: rgba(255,255,255,0.72);
      }

      .nav-tab:hover {
        background: #FF5B5B !important;
        border-color: rgba(255,255,255,0.8);
      }

      .nav-tab:active {
        background: #e6383c !important;
        border-color: rgba(255,255,255,0.88);
      }

      .landing-nav__search-btn,
      .landing-nav__search-btn-mobile {
        background: #f23b40;
      }

      @media (max-width: 1023px) {
        #navbar-placeholder.is_scroll {
          top: 12px !important;
          width: calc(100% - 32px) !important;
        }

        .landing-nav {
          min-height: 68px;
          border-radius: 34px;
          padding-inline: 18px;
          gap: 12px;
        }

        .landing-nav__tabs-wrap,
        .landing-nav > .landing-nav__search,
        .landing-nav > .landing-nav__archive,
        .landing-nav > .landing-nav__logout {
          display: none;
        }

        .landing-nav__menu {
          display: flex;
          margin-left: auto;
        }

        .landing-nav-mobile-search {
          display: flex;
          align-items: center;
        }

        #navMobileDrawer nav {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        #navMobileDrawer > div {
          display: flex;
          gap: 8px;
        }
      }

      @media (max-width: 420px) {
        .landing-nav__brand img {
          height: 32px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function makeTab(journey, extraClass) {
    return `<a class="nav-tab ${extraClass} flex items-center justify-center h-[36px] rounded-[14px] font-inter text-[10px] font-semibold text-white no-underline whitespace-nowrap transition-colors" href="#" data-journey="${journey}">${journey}</a>`;
  }

  const desktopTabs = JOURNEYS.map((j) => makeTab(j, "w-[78px] xl:w-[82px]")).join("");
  const mobileTabs = JOURNEYS.map((j) => makeTab(j, "flex-1")).join("");

  placeholder.innerHTML = `
    <header
      class="landing-nav flex items-center w-full px-4 sm:px-5 lg:px-8 gap-3 lg:gap-4"
      id="mainNav"
    >
      <a class="landing-nav__brand nav-hide shrink-0 flex items-center transition-all duration-200"
        href="home.html" aria-label="Inspire home">
        <img class="h-9 sm:h-10 lg:h-[48px] w-auto" src="../assets/logo-inspire.svg" alt="INSPIRE" />
      </a>

      <div class="landing-nav__tabs-wrap nav-hide hidden lg:flex items-center rounded-[24px] px-2 py-1.5 gap-1.5 shrink-0 transition-all duration-200">
        <nav class="flex items-center gap-1.5" aria-label="Categories">${desktopTabs}</nav>
      </div>

      <div class="landing-nav__search nav-search hidden lg:flex items-center h-[48px] ml-auto rounded-[24px] transition-all duration-200 min-w-[220px] max-w-[330px] xl:max-w-[360px] flex-[1_1_260px]">
        <input
          class="landing-nav__search-input flex-1 bg-transparent border-none pl-5 pr-1 text-[13px] font-semibold text-white/75 placeholder-white/55 outline-none w-full min-w-0"
          type="search" placeholder="Search insight..." aria-label="Search insight"
        />
        <button class="landing-nav__search-btn shrink-0 mr-2 w-8 h-8 flex items-center justify-center rounded-full border-0 cursor-pointer" type="button" aria-label="Search">
          <img src="../assets/dashboard/24dc6b20d586e5214f68a6266ee8bcfe10b6307a.svg" class="w-5 h-5" alt="" />
        </button>
      </div>

      <a class="landing-nav__archive nav-hide hidden lg:flex items-center justify-center gap-2 h-[48px] px-4 rounded-[24px] text-[13px] font-semibold text-white no-underline whitespace-nowrap hover:bg-white/10 transition-colors shrink-0"
        href="archive.html?view=archive">
        Archive
        <img src="../assets/dashboard/4a7d0c974c3da3726c48c18b3f75ffb320164f02.svg" class="w-5 h-5" alt="" />
      </a>

      <a class="landing-nav__logout nav-hide hidden lg:flex items-center justify-center h-[48px] min-w-[116px] px-6 rounded-full text-white font-semibold text-[15px] no-underline whitespace-nowrap shrink-0"
        href="login.html" style="background: ${LOGOUT_BG};">
        Log Out
      </a>

      <button
        class="landing-nav__menu lg:hidden shrink-0 flex flex-col items-center justify-center gap-[5px] w-10 h-10 bg-[#2f2f2f]/80 border border-white/50 rounded-full cursor-pointer ml-auto"
        id="navHamburger" type="button" aria-label="Toggle menu"
        aria-expanded="false" aria-controls="navMobileDrawer"
      >
        <span class="hamburger-bar block w-5 h-0.5 bg-white rounded transition-all duration-200"></span>
        <span class="hamburger-bar block w-5 h-0.5 bg-white rounded transition-all duration-200"></span>
        <span class="hamburger-bar block w-5 h-0.5 bg-white rounded transition-all duration-200"></span>
      </button>
    </header>

    <div class="landing-nav-mobile-search lg:hidden flex items-center mt-2 h-[46px] rounded-full px-1">
      <input
        class="landing-nav__search-input-mobile flex-1 bg-transparent border-none pl-4 pr-1 text-[13px] font-semibold text-white/75 placeholder-white/55 outline-none min-w-0"
        type="search" placeholder="Search insight..." aria-label="Search insight"
      />
      <button class="landing-nav__search-btn-mobile shrink-0 mr-1.5 w-8 h-8 flex items-center justify-center rounded-full border-0 cursor-pointer" type="button" aria-label="Search">
        <img src="../assets/dashboard/24dc6b20d586e5214f68a6266ee8bcfe10b6307a.svg" class="w-5 h-5" alt="" />
      </button>
    </div>

    <div id="navMobileDrawer" class="mt-2 p-3 rounded-[28px] flex-col gap-3 shadow-xl"
      style="display:none;" aria-label="Mobile navigation">
      <nav class="grid grid-cols-2 gap-2" aria-label="Categories">${mobileTabs}</nav>
      <div class="flex gap-2">
        <a class="landing-nav__archive flex-1 flex items-center justify-center gap-1.5 h-[42px] px-3 rounded-full text-[12px] font-semibold text-white no-underline hover:bg-white/10 transition-colors"
          href="archive.html?view=archive">
          Archive
          <img src="../assets/dashboard/4a7d0c974c3da3726c48c18b3f75ffb320164f02.svg" class="w-[18px] h-[18px]" alt="" />
        </a>
        <a class="landing-nav__logout flex-1 flex items-center justify-center h-[42px] px-3 rounded-full text-white font-semibold text-sm no-underline"
          href="login.html" style="background: ${LOGOUT_BG};">
          Log Out
        </a>
      </div>
    </div>
  `;

  const hamburger = document.getElementById("navHamburger");
  const drawer = document.getElementById("navMobileDrawer");
  const desktopInput = placeholder.querySelector(".landing-nav__search-input");
  const mobileInput = placeholder.querySelector(".landing-nav__search-input-mobile");
  const mobileBtn = placeholder.querySelector(".landing-nav__search-btn-mobile");

  // Sync mobile search → desktop input so page JS event listeners fire correctly
  mobileInput?.addEventListener("input", function () {
    if (desktopInput) {
      desktopInput.value = this.value;
      desktopInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  mobileBtn?.addEventListener("click", function () {
    if (desktopInput && mobileInput) {
      desktopInput.value = mobileInput.value;
      desktopInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  // Pre-fill mobile search from URL ?q= param
  const urlQ = new URLSearchParams(window.location.search).get("q");
  if (urlQ && mobileInput) mobileInput.value = urlQ;

  function openDrawer() {
    drawer.style.display = "flex";
    hamburger.setAttribute("aria-expanded", "true");
    const bars = hamburger.querySelectorAll(".hamburger-bar");
    bars[0].style.transform = "translateY(7px) rotate(45deg)";
    bars[1].style.opacity = "0";
    bars[2].style.transform = "translateY(-7px) rotate(-45deg)";
  }

  function closeDrawer() {
    drawer.style.display = "none";
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.querySelectorAll(".hamburger-bar").forEach((b) => {
      b.style.transform = "";
      b.style.opacity = "";
    });
  }

  hamburger.addEventListener("click", function (e) {
    e.stopPropagation();
    drawer.style.display === "none" ? openDrawer() : closeDrawer();
  });

  document.addEventListener("click", function (e) {
    if (drawer.style.display !== "none" && !placeholder.contains(e.target)) closeDrawer();
  });

  drawer.addEventListener("click", function (e) {
    if (e.target.closest("[data-journey]")) closeDrawer();
  });

  mobileInput?.addEventListener("focus", closeDrawer);

  let scrollTicking = false;
  function syncScrollState() {
    const isScroll = window.scrollY > 8;
    placeholder.classList.toggle("is_scroll", isScroll);
    document.body.classList.toggle("is_scroll", isScroll);
    scrollTicking = false;
  }

  window.addEventListener("scroll", function () {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(syncScrollState);
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024 && drawer.style.display !== "none") closeDrawer();
    syncScrollState();
  });

  syncScrollState();
})();
