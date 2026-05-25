(function () {
  const placeholder = document.getElementById("navbar-placeholder");
  if (!placeholder) return;

  const LOGOUT_BG = "url('../assets/dashboard/logout-button-gradient.svg') center/100% 100% no-repeat";
  const JOURNEYS = ["Pre-Sales", "Sales", "After Sales", "General"];

  function makeTab(journey, extraClass) {
    return `<a class="nav-tab ${extraClass} flex items-center justify-center h-[36px] bg-[#1c1c1c] border border-[#8d8d8d] rounded-lg font-inter text-[10px] font-semibold text-white no-underline whitespace-nowrap hover:bg-white/10 transition-colors" href="#" data-journey="${journey}">${journey}</a>`;
  }

  const desktopTabs = JOURNEYS.map((j) => makeTab(j, "w-[82px]")).join("");
  const mobileTabs = JOURNEYS.map((j) => makeTab(j, "flex-1")).join("");

  placeholder.innerHTML = `
    <header
      class="landing-nav flex items-center w-full h-[60px] lg:h-[72px] px-4 lg:px-6 rounded-lg lg:rounded-2xl shadow-xl"
      style="background: rgba(20,14,14,0.97); border: 1px solid rgba(255,255,255,0.08);"
      id="mainNav"
    >
      <a class="landing-nav__brand nav-hide shrink-0 flex items-center mr-3 lg:mr-4 transition-all duration-200"
        href="home.html" aria-label="Inspire home">
        <img class="h-8 lg:h-[46px] w-auto" src="../assets/logo-inspire.svg" alt="INSPIRE" />
      </a>

      <div class="landing-nav__tabs-wrap nav-hide hidden lg:flex items-center bg-white/5 border border-white/10 rounded-xl px-1.5 py-1 gap-1.5 mr-4 shrink-0 transition-all duration-200">
        <nav class="flex items-center gap-1.5" aria-label="Categories">${desktopTabs}</nav>
      </div>

      <div class="landing-nav__search nav-search hidden lg:flex items-center h-[44px] ml-auto bg-white/5 border border-white/10 rounded-xl transition-all duration-200 min-w-[200px]">
        <input
          class="landing-nav__search-input flex-1 bg-transparent border-none pl-4 pr-1 text-[13px] font-semibold text-white/60 placeholder-white/40 outline-none w-full"
          type="search" placeholder="Search..." aria-label="Search insight"
        />
        <button class="landing-nav__search-btn shrink-0 mr-1 w-8 h-8 flex items-center justify-center bg-accent rounded-lg border-0 cursor-pointer" type="button" aria-label="Search">
          <img src="../assets/dashboard/24dc6b20d586e5214f68a6266ee8bcfe10b6307a.svg" class="w-5 h-5" alt="" />
        </button>
      </div>

      <a class="landing-nav__archive nav-hide hidden lg:flex items-center justify-center gap-2 h-[44px] px-4 bg-white/5 border border-white/10 rounded-xl text-[13px] font-semibold text-white/80 no-underline whitespace-nowrap hover:bg-white/10 transition-colors shrink-0 ml-2"
        href="archive.html?view=archive">
        Archive
        <img src="../assets/dashboard/4a7d0c974c3da3726c48c18b3f75ffb320164f02.svg" class="w-5 h-5" alt="" />
      </a>

      <a class="landing-nav__logout nav-hide hidden lg:flex items-center justify-center h-[44px] px-5 rounded-xl text-white font-semibold text-sm no-underline whitespace-nowrap shrink-0 ml-2"
        href="login.html" style="background: ${LOGOUT_BG};">
        Log Out
      </a>

      <button
        class="landing-nav__menu lg:hidden shrink-0 flex flex-col items-center justify-center gap-[5px] w-9 h-9 bg-white/10 border border-white/20 rounded-lg cursor-pointer ml-auto"
        id="navHamburger" type="button" aria-label="Toggle menu"
        aria-expanded="false" aria-controls="navMobileDrawer"
      >
        <span class="hamburger-bar block w-5 h-0.5 bg-white rounded transition-all duration-200"></span>
        <span class="hamburger-bar block w-5 h-0.5 bg-white rounded transition-all duration-200"></span>
        <span class="hamburger-bar block w-5 h-0.5 bg-white rounded transition-all duration-200"></span>
      </button>
    </header>

    <div class="lg:hidden flex items-center mt-2 h-[44px] rounded-xl px-1"
      style="background: rgba(20,14,14,0.97); border: 1px solid rgba(255,255,255,0.08);">
      <input
        class="landing-nav__search-input-mobile flex-1 bg-transparent border-none pl-3 pr-1 text-[13px] font-semibold text-white/60 placeholder-white/40 outline-none"
        type="search" placeholder="Search..." aria-label="Search insight"
      />
      <button class="landing-nav__search-btn-mobile shrink-0 mr-1 w-8 h-8 flex items-center justify-center bg-accent rounded-lg border-0 cursor-pointer" type="button" aria-label="Search">
        <img src="../assets/dashboard/24dc6b20d586e5214f68a6266ee8bcfe10b6307a.svg" class="w-5 h-5" alt="" />
      </button>
    </div>

    <div id="navMobileDrawer" class="mt-2 p-4 rounded-xl flex-col gap-3 border border-white/10 shadow-xl"
      style="display:none; background: rgba(20,14,14,0.97);" aria-label="Mobile navigation">
      <nav class="flex gap-1.5" aria-label="Categories">${mobileTabs}</nav>
      <div class="flex gap-2">
        <a class="landing-nav__archive flex-1 flex items-center justify-center gap-1.5 h-[42px] px-3 bg-white/5 border border-white/10 rounded-xl text-[12px] font-semibold text-white/80 no-underline hover:bg-white/10 transition-colors"
          href="archive.html?view=archive">
          Archive
          <img src="../assets/dashboard/4a7d0c974c3da3726c48c18b3f75ffb320164f02.svg" class="w-[18px] h-[18px]" alt="" />
        </a>
        <a class="landing-nav__logout flex-1 flex items-center justify-center h-[42px] px-3 rounded-xl text-white font-semibold text-sm no-underline"
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

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024 && drawer.style.display !== "none") closeDrawer();
  });
})();
