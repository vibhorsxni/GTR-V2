const canvas = document.querySelector("#gtr-stage");
const ctx = canvas.getContext("2d");
const loader = document.querySelector("#loader");
const loaderStep = document.querySelector("#loader-step");
const loaderPercent = document.querySelector("#loader-percent");
const finale = document.querySelector("[data-finale]");

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  scroll: 0,
  targetScroll: 0,
  mouseX: 0,
  mouseY: 0,
  paint: "#c0c0c0",
};

const loaderStartedAt = performance.now();
const minimumLoaderTime = 2800;
let pageLoaded = false;
let loaderHidden = false;
let loaderProgress = 0;
const loaderSteps = [
  { at: 0, label: "Priming twin turbos" },
  { at: 28, label: "Warming ATTESA" },
  { at: 54, label: "Spooling VR38" },
  { at: 78, label: "Locking launch control" },
  { at: 96, label: "Opening pit lane" },
];

const paintStops = [
  { at: 0, color: [192, 192, 192] },
  { at: 0.22, color: [26, 26, 46] },
  { at: 0.45, color: [255, 0, 51] },
  { at: 0.68, color: [10, 10, 10] },
  { at: 0.88, color: [245, 245, 245] },
  { at: 1, color: [255, 0, 51] },
];

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 1.8);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function colorAt(progress) {
  const p = clamp(progress, 0, 1);
  let left = paintStops[0];
  let right = paintStops[paintStops.length - 1];

  for (let i = 0; i < paintStops.length - 1; i += 1) {
    if (p >= paintStops[i].at && p <= paintStops[i + 1].at) {
      left = paintStops[i];
      right = paintStops[i + 1];
      break;
    }
  }

  const local = (p - left.at) / Math.max(right.at - left.at, 0.001);
  const [r, g, b] = mixColor(left.color, right.color, local);
  return `rgb(${r}, ${g}, ${b})`;
}

function updateScroll() {
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  state.targetScroll = window.scrollY / max;
}

function updateFinaleProgress() {
  if (!finale) {
    return;
  }

  const rect = finale.getBoundingClientRect();
  const travel = Math.max(rect.height - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel, 0, 1);
  finale.style.setProperty("--finale-progress", progress.toFixed(3));
}

function drawBackground(progress) {
  const gradient = ctx.createRadialGradient(
    state.width * 0.5,
    state.height * 0.54,
    80,
    state.width * 0.5,
    state.height * 0.54,
    Math.max(state.width, state.height) * 0.72
  );
  const redAlpha = 0.12 + Math.sin(progress * Math.PI * 2) * 0.05;
  gradient.addColorStop(0, `rgba(255, 0, 51, ${redAlpha})`);
  gradient.addColorStop(0.45, "#101010");
  gradient.addColorStop(1, "#050505");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
  ctx.lineWidth = 1;
  const horizon = state.height * (0.64 + Math.sin(progress * Math.PI) * 0.04);
  for (let i = -10; i <= 10; i += 1) {
    const x = state.width * 0.5 + i * state.width * 0.075;
    ctx.beginPath();
    ctx.moveTo(state.width * 0.5, horizon);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }

  for (let j = 0; j < 10; j += 1) {
    const y = horizon + (j * j * state.height) / 90;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
}

function drawWheel(x, y, radius, squash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.fillStyle = "#050505";
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.36)";
  ctx.lineWidth = Math.max(2, radius * 0.08);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,0,51,.75)";
  ctx.lineWidth = Math.max(1.5, radius * 0.04);
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * radius * 0.72, Math.sin(angle) * radius * 0.72);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCar(progress) {
  const orbit = progress * Math.PI * 2 + Math.PI * 0.18;
  const perspective = Math.cos(orbit);
  const side = Math.sin(orbit);
  const base = Math.min(state.width * 0.72, state.height * 1.1);
  const width = base * (0.74 + Math.abs(side) * 0.42);
  const height = base * 0.24 * (0.82 + Math.abs(perspective) * 0.2);
  const x = state.width * 0.5 + perspective * state.width * 0.05 + state.mouseX * 16;
  const y = state.height * (0.56 + Math.sin(progress * Math.PI * 2) * 0.035) + state.mouseY * 10;
  const skew = perspective * width * 0.1;
  const nose = side > 0 ? 1 : -1;
  const paint = colorAt(progress);

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(0, 0, 0, .75)";
  ctx.shadowBlur = 50;
  ctx.fillStyle = "rgba(0, 0, 0, .55)";
  ctx.beginPath();
  ctx.ellipse(0, height * 0.58, width * 0.48, height * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const body = new Path2D();
  body.moveTo(-width * 0.48, height * 0.14);
  body.bezierCurveTo(-width * 0.38, -height * 0.24, -width * 0.1 + skew, -height * 0.35, width * 0.2 + skew, -height * 0.22);
  body.bezierCurveTo(width * 0.34 + skew, -height * 0.16, width * 0.46, -height * 0.03, width * 0.5, height * 0.16);
  body.lineTo(width * 0.42, height * 0.35);
  body.lineTo(-width * 0.42, height * 0.35);
  body.bezierCurveTo(-width * 0.49, height * 0.32, -width * 0.55, height * 0.22, -width * 0.48, height * 0.14);
  body.closePath();

  const bodyGradient = ctx.createLinearGradient(-width * 0.5, -height * 0.3, width * 0.5, height * 0.3);
  bodyGradient.addColorStop(0, "#070707");
  bodyGradient.addColorStop(0.28, paint);
  bodyGradient.addColorStop(0.6, paint);
  bodyGradient.addColorStop(1, "#111111");
  ctx.fillStyle = bodyGradient;
  ctx.fill(body);
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.stroke(body);

  ctx.fillStyle = "rgba(185, 223, 230, .42)";
  ctx.beginPath();
  ctx.moveTo(-width * 0.16 + skew * 0.65, -height * 0.22);
  ctx.lineTo(width * 0.18 + skew * 0.65, -height * 0.16);
  ctx.lineTo(width * 0.3 + skew * 0.35, height * 0.07);
  ctx.lineTo(-width * 0.28 + skew * 0.35, height * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 0, 51, .82)";
  ctx.lineWidth = Math.max(3, width * 0.012);
  ctx.beginPath();
  ctx.moveTo(-width * 0.45, height * 0.15);
  ctx.lineTo(width * 0.47, height * 0.17);
  ctx.stroke();

  ctx.fillStyle = nose > 0 ? "#ff0033" : "rgba(255,255,255,.82)";
  ctx.fillRect(width * 0.4 * nose, height * 0.03, width * 0.08 * nose, height * 0.05);
  ctx.fillStyle = nose > 0 ? "rgba(255,255,255,.82)" : "#ff0033";
  ctx.fillRect(-width * 0.48 * nose, height * 0.08, width * 0.08 * nose, height * 0.045);

  const wheelOffset = width * (0.26 + Math.abs(perspective) * 0.05);
  drawWheel(-wheelOffset, height * 0.34, height * 0.19, 0.88);
  drawWheel(wheelOffset, height * 0.34, height * 0.19, 0.88);

  ctx.fillStyle = "rgba(255, 0, 51, .85)";
  ctx.font = `${Math.max(14, width * 0.035)}px Orbitron, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("GT-R", 0, height * 0.23);
  ctx.restore();
}

function render() {
  state.scroll = lerp(state.scroll, state.targetScroll, 0.075);
  updateFinaleProgress();
  drawBackground(state.scroll);
  drawCar(state.scroll);
  requestAnimationFrame(render);
}

function setupReveals() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
}

function hideLoader() {
  if (loaderHidden) {
    return;
  }
  loaderHidden = true;
  loaderProgress = 100;
  updateLoaderUi();
  document.body.classList.remove("is-loading");
  loader.classList.add("is-hidden");
}

function updateLoaderUi() {
  const currentStep = loaderSteps.reduce((active, step) => (
    loaderProgress >= step.at ? step : active
  ), loaderSteps[0]);
  loader.style.setProperty("--loader-progress", `${loaderProgress}%`);
  loaderStep.textContent = currentStep.label;
  loaderPercent.textContent = `${Math.round(loaderProgress)}%`;
}

function tickLoader() {
  if (loaderHidden) {
    return;
  }

  const elapsed = performance.now() - loaderStartedAt;
  const timeProgress = clamp((elapsed / minimumLoaderTime) * 100, 0, 100);
  const target = pageLoaded ? timeProgress : Math.min(timeProgress, 84);
  loaderProgress = lerp(loaderProgress, target, 0.12);
  updateLoaderUi();

  if (pageLoaded && elapsed >= minimumLoaderTime && loaderProgress > 98) {
    hideLoader();
    return;
  }

  requestAnimationFrame(tickLoader);
}

document.body.classList.add("is-loading");
resize();
updateScroll();
setupReveals();
render();
tickLoader();

window.addEventListener("resize", resize);
window.addEventListener("scroll", updateScroll, { passive: true });
window.addEventListener("pointermove", event => {
  state.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
  state.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener("load", () => {
  pageLoaded = true;
});

window.setTimeout(() => {
  pageLoaded = true;
}, 4300);

/* ═══════════════════════════════════════════════════════
   R32 GODZILLA CHRONICLES — DRAWER LOGIC
   ═══════════════════════════════════════════════════════ */
(function initR32Drawer() {
  const drawer = document.getElementById("r32-drawer");
  const openBtn = document.getElementById("r32-drawer-open");
  const backdrop = document.getElementById("r32-drawer-backdrop");
  const scrollContainer = document.getElementById("r32-drawer-content");
  const panel = drawer?.querySelector(".r32-drawer__panel");
  const closeButtons = drawer?.querySelectorAll(".r32-drawer__close") || [];

  if (!drawer || !openBtn || !backdrop || !scrollContainer || !panel) {
    return;
  }

  let drawerObserver = null;

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    panel.scrollTop = 0;
    setupDrawerReveals();
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    resetDrawerReveals();
    
    const video = drawer.querySelector('video');
    const btn = drawer.querySelector('.sound-toggle');
    if (video && !video.muted) {
      video.muted = true;
      if (btn) {
        btn.classList.remove('is-unmuted');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Unmute video');
      }
    }
  }

  function setupDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
    }

    drawerObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root: panel,
        threshold: 0.12,
      }
    );

    scrollContainer.querySelectorAll(".r32-reveal").forEach(el => {
      drawerObserver.observe(el);
    });
  }

  function resetDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
      drawerObserver = null;
    }

    scrollContainer.querySelectorAll(".r32-reveal").forEach(el => {
      el.classList.remove("is-visible");
    });
  }

  openBtn.addEventListener("click", openDrawer);
  closeButtons.forEach(button => button.addEventListener("click", closeDrawer));
  backdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  const stories = {
    jtcc: {
      kicker: "Race record",
      title: "29 starts. 29 wins.",
      copy:
        "From 1990 to 1993, the R32 GT-R swept every Japanese Touring Car Championship round it entered. The run became so complete that the car's class and balance of power had to be reconsidered.",
      stat: "100%",
      label: "JTCC win rate",
    },
    godzilla: {
      kicker: "Bathurst shockwave",
      title: "Japan's monster lands in Australia.",
      copy:
        "At Bathurst, the Skyline humbled local heroes with turbocharged pace and all-wheel-drive traction. The Godzilla nickname stuck because the car felt too powerful for the old order.",
      stat: "2x",
      label: "Bathurst 1000 wins",
    },
    attesa: {
      kicker: "Grip system",
      title: "ATTESA made traction strategic.",
      copy:
        "The electronic all-wheel-drive system could send torque forward when the rear tires needed help. That made the R32 brutally effective in exits, rain, and endurance racing.",
      stat: "50%",
      label: "Available front torque",
    },
    rb26: {
      kicker: "Engine legend",
      title: "The RB26 was born under-rated.",
      copy:
        "Officially held to the Japanese 276 hp agreement, the twin-turbo straight-six had much more headroom. Tuners found a deep iron-block foundation for serious boost.",
      stat: "600+",
      label: "Tuner-friendly horsepower",
    },
    Nismo: {
      kicker: "Nismo & Special Editions",
      title: "Nissan's Special Unit ",
      copy:
        "Nissan Motorsport International produced limited-run homologation specials: the N1 variant stripped weight and added a reinforced engine block for endurance racing, while the Nismo edition received exclusive aero parts and suspension tuning.",
      stat: "510",
      label: " N1 units ever built",
    },
  };

  const storyButtons = scrollContainer.querySelectorAll("[data-story]");
  const focusKicker = document.getElementById("r32-focus-kicker");
  const focusTitle = document.getElementById("r32-focus-title");
  const focusCopy = document.getElementById("r32-focus-copy");
  const focusStat = document.getElementById("r32-focus-stat");
  const focusLabel = document.getElementById("r32-focus-label");

  function selectStory(storyKey) {
    const story = stories[storyKey];

    if (!story || !focusKicker || !focusTitle || !focusCopy || !focusStat || !focusLabel) {
      return;
    }

    focusKicker.textContent = story.kicker;
    focusTitle.textContent = story.title;
    focusCopy.textContent = story.copy;
    focusStat.textContent = story.stat;
    focusLabel.textContent = story.label;

    storyButtons.forEach(button => {
      const isActive = button.dataset.story === storyKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  storyButtons.forEach(button => {
    button.addEventListener("click", () => selectStory(button.dataset.story));
  });
})();

/* ═══════════════════════════════════════════════════════
   R33 UNDERRATED GT-R — DRAWER LOGIC
   ═══════════════════════════════════════════════════════ */
(function initR33Drawer() {
  const drawer = document.getElementById("r33-drawer");
  const openBtn = document.getElementById("r33-drawer-open");
  const backdrop = document.getElementById("r33-drawer-backdrop");
  const scrollContainer = document.getElementById("r33-drawer-content");
  const panel = drawer?.querySelector(".r33-drawer__panel");
  const closeButtons = drawer?.querySelectorAll(".r33-drawer__close") || [];

  if (!drawer || !openBtn || !backdrop || !scrollContainer || !panel) {
    return;
  }

  let drawerObserver = null;

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    panel.scrollTop = 0;
    setupDrawerReveals();
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    resetDrawerReveals();
    
    const video = drawer.querySelector('video');
    const btn = drawer.querySelector('.sound-toggle');
    if (video && !video.muted) {
      video.muted = true;
      if (btn) {
        btn.classList.remove('is-unmuted');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Unmute video');
      }
    }
  }

  function setupDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
    }

    drawerObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root: panel,
        threshold: 0.12,
      }
    );

    scrollContainer.querySelectorAll(".r33-reveal").forEach(el => {
      drawerObserver.observe(el);
    });
  }

  function resetDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
      drawerObserver = null;
    }

    scrollContainer.querySelectorAll(".r33-reveal").forEach(el => {
      el.classList.remove("is-visible");
    });
  }

  openBtn.addEventListener("click", openDrawer);
  closeButtons.forEach(button => button.addEventListener("click", closeDrawer));
  backdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  const stories = {
    nurburgring: {
      kicker: "Nürburgring record",
      title: "First under 8 minutes.",
      copy: "The R33 became the first production car to break the 8-minute barrier at the Nürburgring Nordschleife with a blistering 7:59.887 lap time, a full 21 seconds faster than the R32.",
      stat: "7:59",
      label: "Nordschleife Lap"
    },
    lemans: {
      kicker: "Le Mans 1995",
      title: "LM Limited Edition.",
      copy: "Created to celebrate Nissan's Le Mans participation, where the R33 GT-R competed strongly against elite supercars. Only 188 LM Limited units were built featuring Champion Blue paint.",
      stat: "188",
      label: "LM Units Built"
    },
    nismo: {
      kicker: "NISMO 400R",
      title: "The 400hp Unicorn.",
      copy: "Arguably the most special R33. Built by NISMO featuring an RBX-GT2 2.8L twin-turbo engine producing 400 hp. Today it is one of the rarest and most valuable Skyline GT-Rs ever.",
      stat: "44",
      label: "400R Units Built"
    },
    autech: {
      kicker: "Autech Sedan",
      title: "4-Door GT-R.",
      copy: "An ultra-rare special edition 4-door GT-R sedan built for the Skyline's 40th anniversary. It maintained the RB26DETT and ATTESA AWD in a family-friendly package.",
      stat: "416",
      label: "Sedans Built"
    }
  };

  const storyButtons = scrollContainer.querySelectorAll("[data-story]");
  const focusKicker = document.getElementById("r33-focus-kicker");
  const focusTitle = document.getElementById("r33-focus-title");
  const focusCopy = document.getElementById("r33-focus-copy");
  const focusStat = document.getElementById("r33-focus-stat");
  const focusLabel = document.getElementById("r33-focus-label");

  function selectStory(storyKey) {
    const story = stories[storyKey];

    if (!story || !focusKicker || !focusTitle || !focusCopy || !focusStat || !focusLabel) {
      return;
    }

    focusKicker.textContent = story.kicker;
    focusTitle.textContent = story.title;
    focusCopy.textContent = story.copy;
    focusStat.textContent = story.stat;
    focusLabel.textContent = story.label;

    storyButtons.forEach(button => {
      const isActive = button.dataset.story === storyKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  storyButtons.forEach(button => {
    button.addEventListener("click", () => selectStory(button.dataset.story));
  });
})();
/* ==========================================================================
   R34 DRAWER LOGIC
   ========================================================================== */
(function initR34Drawer() {
  const drawer = document.getElementById("r34-drawer");
  const openBtn = document.getElementById("r34-drawer-open");
  const closeBtn = document.getElementById("r34-drawer-close");
  const closeBottomBtn = document.querySelector(".r34-drawer__close--bottom");
  const backdrop = document.getElementById("r34-drawer-backdrop");

  if (!drawer || !openBtn || !closeBtn || !backdrop) return;

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    
    const video = drawer.querySelector('video');
    const btn = drawer.querySelector('.sound-toggle');
    if (video && !video.muted) {
      video.muted = true;
      if (btn) {
        btn.classList.remove('is-unmuted');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Unmute video');
      }
    }
  }

  openBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  if (closeBottomBtn) closeBottomBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  // Story selector logic
  const scrollContainer = drawer.querySelector(".r34-drawer__content");
  if (!scrollContainer) return;

  const stories = {
    mfd: {
      kicker: "Advanced Tech",
      title: "5.8-inch MFD.",
      copy: "Developed partly with gaming expertise, the MFD displayed turbo boost, oil temp, water temp, G-forces, lap timing, and throttle/braking info. It was incredibly futuristic for 1999.",
      stat: "5.8\"",
      label: "Screen Size"
    },
    vspec: {
      kicker: "V-Spec",
      title: "Aero & Chassis.",
      copy: "The Victory Specifications brought better suspension tuning, track focus, and ATTESA AWD calibrations. V-Spec II added a carbon fiber hood with a NACA duct for enhanced cooling.",
      stat: "2",
      label: "V-Spec Generations"
    },
    nur: {
      kicker: "N�r Editions",
      title: "Final 1000 Cars.",
      copy: "The final special edition honoring the N�rburgring testing heritage. Offered as M-Spec N�r or V-Spec II N�r, only 1000 were built total, making them extremely collectible today.",
      stat: "1000",
      label: "N�r Units Built"
    },
    popculture: {
      kicker: "Pop Culture",
      title: "Global Icon.",
      copy: "The R34 became globally legendary through video games like Gran Turismo and Need for Speed, and movies like Fast & Furious as Paul Walker�s iconic vehicle.",
      stat: "Icon",
      label: "Legendary Status"
    }
  };

  const storyButtons = scrollContainer.querySelectorAll("[data-story]");
  const focusKicker = document.getElementById("r34-focus-kicker");
  const focusTitle = document.getElementById("r34-focus-title");
  const focusCopy = document.getElementById("r34-focus-copy");
  const focusStat = document.getElementById("r34-focus-stat");
  const focusLabel = document.getElementById("r34-focus-label");

  function selectStory(storyKey) {
    const story = stories[storyKey];

    if (!story || !focusKicker || !focusTitle || !focusCopy || !focusStat || !focusLabel) {
      return;
    }

    focusKicker.textContent = story.kicker;
    focusTitle.textContent = story.title;
    focusCopy.textContent = story.copy;
    focusStat.textContent = story.stat;
    focusLabel.textContent = story.label;

    storyButtons.forEach(button => {
      const isActive = button.dataset.story === storyKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  storyButtons.forEach(button => {
    button.addEventListener("click", () => selectStory(button.dataset.story));
  });
})();


/* -------------------------------------------------------
   R34 GODZILLA RETURNS - DRAWER LOGIC
   ------------------------------------------------------- */


/* -------------------------------------------------------
   R34 THE ICON — DRAWER LOGIC
   ------------------------------------------------------- */
(function initR34Drawer() {
  const drawer = document.getElementById("r34-drawer");
  const openBtn = document.getElementById("r34-drawer-open");
  const backdrop = document.getElementById("r34-drawer-backdrop");
  const scrollContainer = document.getElementById("r34-drawer-content");
  const panel = drawer?.querySelector(".r34-drawer__panel");
  const closeButtons = drawer?.querySelectorAll(".r34-drawer__close") || [];

  if (!drawer || !openBtn || !backdrop || !scrollContainer || !panel) {
    return;
  }

  let drawerObserver = null;

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    panel.scrollTop = 0;
    setupDrawerReveals();
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    resetDrawerReveals();
    
    const video = drawer.querySelector('video');
    const btn = drawer.querySelector('.sound-toggle');
    if (video && !video.muted) {
      video.muted = true;
      if (btn) {
        btn.classList.remove('is-unmuted');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Unmute video');
      }
    }
  }

  function setupDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
    }

    drawerObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root: panel,
        threshold: 0.12,
      }
    );

    scrollContainer.querySelectorAll(".r34-reveal").forEach(el => {
      drawerObserver.observe(el);
    });
  }

  function resetDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
      drawerObserver = null;
    }

    scrollContainer.querySelectorAll(".r34-reveal").forEach(el => {
      el.classList.remove("is-visible");
    });
  }

  openBtn.addEventListener("click", openDrawer);
  closeButtons.forEach(button => button.addEventListener("click", closeDrawer));
  backdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  const stories = {
    mfd: {
      kicker: "5.8-inch MFD",
      title: "Telemetry for the street.",
      copy: "The R34 introduced a futuristic 5.8-inch multifunction display (MFD) showing boost, oil and water temp, G-forces, and lap timing, blending video game aesthetics with real-world performance.",
      stat: "5.8\"",
      label: "Multifunction Display"
    },
    vspec: {
      kicker: "V-Spec & V-Spec II",
      title: "Track Focused.",
      copy: "The V-Spec offered better suspension tuning and an improved ATTESA AWD calibration. The V-Spec II pushed it further with a carbon fiber hood featuring a NACA duct for better cooling.",
      stat: "AWD",
      label: "ATTESA E-TS Pro"
    },
    nur: {
      kicker: "Nür Editions",
      title: "The Ultimate R34.",
      copy: "The M-Spec Nür and V-Spec II Nür were the final special editions honoring its Nürburgring testing heritage. Only 1000 Nür editions were built, making them extremely collectible.",
      stat: "1000",
      label: "Nür Units Built"
    },
    popculture: {
      kicker: "Godzilla Returns",
      title: "Pop Culture Icon.",
      copy: "The R34 became globally legendary through games like Gran Turismo and Need for Speed, and movies like the Fast & Furious franchise, cementing its status as the peak Skyline generation.",
      stat: "11,578",
      label: "Total Production"
    }
  };

  const storyButtons = scrollContainer.querySelectorAll("[data-story]");
  const focusKicker = document.getElementById("r34-focus-kicker");
  const focusTitle = document.getElementById("r34-focus-title");
  const focusCopy = document.getElementById("r34-focus-copy");
  const focusStat = document.getElementById("r34-focus-stat");
  const focusLabel = document.getElementById("r34-focus-label");

  function selectStory(storyKey) {
    const story = stories[storyKey];

    if (!story || !focusKicker || !focusTitle || !focusCopy || !focusStat || !focusLabel) {
      return;
    }

    focusKicker.textContent = story.kicker;
    focusTitle.textContent = story.title;
    focusCopy.textContent = story.copy;
    focusStat.textContent = story.stat;
    focusLabel.textContent = story.label;

    storyButtons.forEach(button => {
      const isActive = button.dataset.story === storyKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  storyButtons.forEach(button => {
    button.addEventListener("click", () => selectStory(button.dataset.story));
  });
})();

/* -------------------------------------------------------
   SOUND TOGGLE LOGIC
   ------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const soundToggles = document.querySelectorAll('.sound-toggle');
  
  soundToggles.forEach(btn => {
    // Cache the video element on init to avoid expensive DOM lookups on click
    const container = btn.closest('section, .split-screen__image');
    if (!container) return;
    const video = container.querySelector('video');
    if (!video) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (video.muted) {
        video.muted = false;
        btn.classList.add('is-unmuted');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Mute video');
      } else {
        video.muted = true;
        btn.classList.remove('is-unmuted');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Unmute video');
      }
    });
  });
});
