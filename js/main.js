// ==========================================================================
// PROJECT GTR — THE EVOLUTION OF GODZILLA
// Core Interactive Controller & Canvas Engine
// ==========================================================================

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Stage Canvas Engine & Preloader Simulation
  // --------------------------------------------------------------------------
  const canvas = document.querySelector('#gtr-stage');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const loader = document.querySelector('#loader');
  const loaderStep = document.querySelector('#loader-step');
  const loaderPercent = document.querySelector('#loader-percent');
  const finale = document.querySelector('[data-finale]');
  const hero = document.querySelector('#hero');

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    scroll: 0,
    targetScroll: 0,
    mouseX: 0,
    mouseY: 0,
    paint: '#c0c0c0',
  };

  const loaderStartedAt = performance.now();
  const minimumLoaderTime = 2200;
  let pageLoaded = false;
  let loaderHidden = false;
  let loaderProgress = 0;

  const loaderSteps = [
    { at: 0, label: 'Priming twin turbos' },
    { at: 28, label: 'Warming ATTESA E-TS' },
    { at: 54, label: 'Spooling VR38DETT' },
    { at: 78, label: 'Locking launch control' },
    { at: 96, label: 'Opening pit lane' },
  ];

  const paintStops = [
    { at: 0, color: [192, 192, 192] },   // R32 Gun Grey Metallic
    { at: 0.22, color: [26, 26, 46] },   // R33 Midnight Purple
    { at: 0.45, color: [25, 45, 120] },  // R34 Bayside Blue
    { at: 0.68, color: [255, 0, 51] },   // NISMO Super Red
    { at: 0.88, color: [230, 230, 230] },// R35 Ultimate Silver
    { at: 1.0, color: [255, 0, 51] },    // Godzilla Red
  ];

  function resize() {
    if (!canvas || !ctx) return;
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
    updateHeroProgress();

    // Ensure canvas renders on scroll for users with reduced motion preferences
    if (prefersReducedMotion) {
      state.scroll = state.targetScroll;
      drawBackground(state.scroll);
    }

    // Topbar scroll state
    const topbar = document.getElementById('topbar');
    if (topbar) {
      topbar.classList.toggle('is-scrolled', window.scrollY > 50);
    }

    // Back to top visibility
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      backToTop.classList.toggle('is-visible', window.scrollY > 450);
    }
  }

  function updateHeroProgress() {
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(rect.height - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    hero.style.setProperty('--hero-progress', progress.toFixed(3));
  }

  function updateFinaleProgress() {
    if (!finale) return;
    const rect = finale.getBoundingClientRect();
    const travel = Math.max(rect.height - window.innerHeight, 1);
    const progress = clamp(-rect.top / travel, 0, 1);
    finale.style.setProperty('--finale-progress', progress.toFixed(3));
  }

  function drawBackground(progress) {
    if (!ctx) return;
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
    gradient.addColorStop(0.45, '#101010');
    gradient.addColorStop(1, '#050505');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash);
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.36)';
    ctx.lineWidth = Math.max(2, radius * 0.08);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,0,51,.75)';
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
    if (!ctx || state.width <= 0 || state.height <= 0) return;
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
    ctx.shadowColor = 'rgba(0, 0, 0, .75)';
    ctx.shadowBlur = 50;
    ctx.fillStyle = 'rgba(0, 0, 0, .55)';
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
    bodyGradient.addColorStop(0, '#070707');
    bodyGradient.addColorStop(0.28, paint);
    bodyGradient.addColorStop(0.6, paint);
    bodyGradient.addColorStop(1, '#111111');
    ctx.fillStyle = bodyGradient;
    ctx.fill(body);
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    ctx.stroke(body);

    // Windshield glass
    ctx.fillStyle = 'rgba(185, 223, 230, .42)';
    ctx.beginPath();
    ctx.moveTo(-width * 0.16 + skew * 0.65, -height * 0.22);
    ctx.lineTo(width * 0.18 + skew * 0.65, -height * 0.16);
    ctx.lineTo(width * 0.3 + skew * 0.35, height * 0.07);
    ctx.lineTo(-width * 0.28 + skew * 0.35, height * 0.05);
    ctx.closePath();
    ctx.fill();

    // Body accent line
    ctx.strokeStyle = 'rgba(255, 0, 51, .82)';
    ctx.lineWidth = Math.max(3, width * 0.012);
    ctx.beginPath();
    ctx.moveTo(-width * 0.45, height * 0.15);
    ctx.lineTo(width * 0.47, height * 0.17);
    ctx.stroke();

    // Lights
    ctx.fillStyle = nose > 0 ? '#ff0033' : 'rgba(255,255,255,.82)';
    ctx.fillRect(width * 0.4 * nose, height * 0.03, width * 0.08 * nose, height * 0.05);
    ctx.fillStyle = nose > 0 ? 'rgba(255,255,255,.82)' : '#ff0033';
    ctx.fillRect(-width * 0.48 * nose, height * 0.08, width * 0.08 * nose, height * 0.045);

    // Wheels
    const wheelOffset = width * (0.26 + Math.abs(perspective) * 0.05);
    drawWheel(-wheelOffset, height * 0.34, height * 0.19, 0.88);
    drawWheel(wheelOffset, height * 0.34, height * 0.19, 0.88);

    // Badge
    ctx.fillStyle = 'rgba(255, 0, 51, .85)';
    ctx.font = `${Math.max(14, width * 0.035)}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('GT-R', 0, height * 0.23);
    ctx.restore();
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render() {
    state.scroll = lerp(state.scroll, state.targetScroll, 0.085);
    updateHeroProgress();
    updateFinaleProgress();
    drawBackground(state.scroll);
    if (!prefersReducedMotion) {
      requestAnimationFrame(render);
    }
  }

  function hideLoader() {
    if (loaderHidden || !loader) return;
    loaderHidden = true;
    loaderProgress = 100;
    updateLoaderUi();
    document.body.classList.remove('is-loading');
    loader.classList.add('is-hidden');
  }

  function updateLoaderUi() {
    if (!loader || !loaderStep || !loaderPercent) return;
    const currentStep = loaderSteps.reduce((active, step) => (
      loaderProgress >= step.at ? step : active
    ), loaderSteps[0]);
    loader.style.setProperty('--loader-progress', `${loaderProgress}%`);
    loaderStep.textContent = currentStep.label;
    loaderPercent.textContent = `${Math.round(loaderProgress)}%`;
  }

  function tickLoader() {
    if (loaderHidden) return;
    const elapsed = performance.now() - loaderStartedAt;
    const timeProgress = clamp((elapsed / minimumLoaderTime) * 100, 0, 100);
    const target = pageLoaded ? timeProgress : Math.min(timeProgress, 84);
    loaderProgress = lerp(loaderProgress, target, 0.14);
    updateLoaderUi();

    if (pageLoaded && (elapsed >= minimumLoaderTime + 2000 || (elapsed >= minimumLoaderTime && loaderProgress > 98))) {
      hideLoader();
      return;
    }

    requestAnimationFrame(tickLoader);
  }

  // --------------------------------------------------------------------------
  // 2. Navigation, Mobile Menu & Active Spy
  // --------------------------------------------------------------------------
  function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const primaryNav = document.getElementById('primary-nav');
    const navBackdrop = document.getElementById('nav-backdrop');
    const navLinks = document.querySelectorAll('.nav a, .nav-link');
    const backToTop = document.getElementById('back-to-top');

    function closeMobileNav() {
      if (primaryNav) primaryNav.classList.remove('is-open');
      if (navBackdrop) navBackdrop.classList.remove('is-open');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
      }
    }

    // Hamburger Toggle & Mobile Navigation
    if (navToggle && primaryNav) {
      navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = primaryNav.classList.toggle('is-open');
        if (navBackdrop) navBackdrop.classList.toggle('is-open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
      });

      // Close when clicking nav links
      navLinks.forEach(link => {
        link.addEventListener('click', closeMobileNav);
      });

      // Close when clicking backdrop
      if (navBackdrop) {
        navBackdrop.addEventListener('click', closeMobileNav);
      }

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!primaryNav.contains(e.target) && !navToggle.contains(e.target)) {
          closeMobileNav();
        }
      });

      // Close on Escape key and return focus
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && primaryNav.classList.contains('is-open')) {
          closeMobileNav();
          navToggle.focus();
        }
      });
    }

    // Back to top click
    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Active Section Spy (Restricted to top-level sections so drawers do not pollute active state)
    const trackedIds = ['hero', 'intro', 'r32', 'r33', 'r34', 'r35', 'timeline', 'credits', 'finale'];
    const sections = Array.from(document.querySelectorAll('section[id], header[id]'))
      .filter(el => trackedIds.includes(el.id));

    if ('IntersectionObserver' in window && sections.length > 0) {
      const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            let id = entry.target.getAttribute('id');
            if (id === 'intro') id = 'hero'; // Heritage intro maps to Hero/Overview
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href === `#${id}`) {
                link.classList.add('is-active');
              } else if (href && href.startsWith('#')) {
                link.classList.remove('is-active');
              }
            });
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });

      sections.forEach(s => spyObserver.observe(s));
    }
  }

  // --------------------------------------------------------------------------
  // 3. Scroll Reveals
  // --------------------------------------------------------------------------
  function setupReveals() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // --------------------------------------------------------------------------
  // 4. Generation Dossier Stories Data
  // --------------------------------------------------------------------------
  const generationStories = {
    r32: {
      jtcc: {
        kicker: 'Race record',
        title: '29 starts. 29 wins.',
        copy: 'From 1990 to 1993, the R32 GT-R swept every Japanese Touring Car Championship round it entered. The run became so complete that the car\'s class and balance of power had to be reconsidered.',
        stat: '100%',
        label: 'JTCC win rate',
      },
      godzilla: {
        kicker: 'Bathurst shockwave',
        title: 'Japan\'s monster lands in Australia.',
        copy: 'At Bathurst, the Skyline humbled local heroes with turbocharged pace and all-wheel-drive traction. The Godzilla nickname stuck because the car felt too powerful for the old order.',
        stat: '2x',
        label: 'Bathurst 1000 wins',
      },
      attesa: {
        kicker: 'Grip system',
        title: 'ATTESA made traction strategic.',
        copy: 'The electronic all-wheel-drive system could send torque forward when the rear tires needed help. That made the R32 brutally effective in exits, rain, and endurance racing.',
        stat: '50%',
        label: 'Available front torque',
      },
      rb26: {
        kicker: 'Engine legend',
        title: 'The RB26 was born under-rated.',
        copy: 'Officially held to the Japanese 276 hp agreement, the twin-turbo straight-six had much more headroom. Tuners found a deep iron-block foundation for serious boost.',
        stat: '600+',
        label: 'Tuner-friendly horsepower',
      },
      nismo: {
        kicker: 'Homologation special',
        title: 'Built for the track.',
        copy: 'Nissan Motorsport International produced limited-run homologation specials: the N1 stripped weight and reinforced the block for endurance racing, while the Nismo edition received exclusive aero parts and suspension tuning.',
        stat: '560',
        label: 'Total N1 & Nismo units',
      },
    },

    r33: {
      nurburgring: {
        kicker: 'Nürburgring record',
        title: 'First under 8 minutes.',
        copy: 'The R33 became the first production car to break the 8-minute barrier at the Nürburgring Nordschleife with a blistering 7:59.887 lap time, a full 21 seconds faster than the R32.',
        stat: '7:59',
        label: 'Nordschleife Lap',
      },
      lemans: {
        kicker: 'Le Mans 1995',
        title: 'LM Limited Edition.',
        copy: 'Created to celebrate Nissan\'s Le Mans participation, where the R33 GT-R competed strongly against elite supercars. Only 188 LM Limited units were built featuring Champion Blue paint.',
        stat: '188',
        label: 'LM Units Built',
      },
      nismo: {
        kicker: 'NISMO 400R',
        title: 'The 400hp Unicorn.',
        copy: 'Arguably the most special R33. Built by NISMO featuring an RBX-GT2 2.8L twin-turbo engine producing 400 hp. Today it is one of the rarest and most valuable Skyline GT-Rs ever.',
        stat: '44',
        label: '400R Units Built',
      },
      autech: {
        kicker: 'Autech Sedan',
        title: '4-Door GT-R.',
        copy: 'An ultra-rare special edition 4-door GT-R sedan built for the Skyline\'s 40th anniversary. It maintained the RB26DETT and ATTESA AWD in a family-friendly package.',
        stat: '416',
        label: 'Sedans Built',
      },
    },

    r34: {
      mfd: {
        kicker: '5.8-inch MFD',
        title: 'Telemetry for the street.',
        copy: 'The R34 introduced a futuristic 5.8-inch multifunction display (MFD) showing boost, oil and water temp, G-forces, and lap timing, blending video game aesthetics with real-world performance.',
        stat: '5.8"',
        label: 'Multifunction Display',
      },
      vspec: {
        kicker: 'V-Spec & V-Spec II',
        title: 'Track Focused.',
        copy: 'The V-Spec offered better suspension tuning and an improved ATTESA E-TS Pro AWD calibration. The V-Spec II pushed it further with a carbon fiber hood featuring a NACA duct for enhanced engine cooling.',
        stat: 'AWD',
        label: 'ATTESA E-TS Pro',
      },
      nur: {
        kicker: 'Nür Editions',
        title: 'The Ultimate R34.',
        copy: 'The M-Spec Nür and V-Spec II Nür were the final special editions honoring its Nürburgring testing heritage. Only 1,000 Nür editions were built, powered by the reinforced N1-spec engine block.',
        stat: '1,000',
        label: 'Nür Units Built',
      },
      popculture: {
        kicker: 'Godzilla Returns',
        title: 'Pop Culture Icon.',
        copy: 'The R34 became globally legendary through games like Gran Turismo and Need for Speed, and movies like the Fast & Furious franchise, cementing its status as the peak Skyline generation.',
        stat: '11,578',
        label: 'Total Production',
      },
    },

    r35: {
      vr38: {
        kicker: 'Takumi Craftsmanship',
        title: 'Five masters. Clean room assembly.',
        copy: 'Every VR38DETT twin-turbo V6 engine is hand-assembled by one of only five master craftsmen—the Takumi—in a hermetically sealed clean room in Yokohama. A signed aluminum plaque with the builder\'s name is bolted to the front of every engine block.',
        stat: '5',
        label: 'Takumi Masters',
      },
      transaxle: {
        kicker: 'Independent Rear Transaxle',
        title: 'Dual-clutch GR6 transaxle layout.',
        copy: 'The R35 pioneered the world\'s first independent rear transaxle AWD system. Two carbon-composite driveshafts link the engine to the rear gearbox, delivering optimal 54/46 dynamic weight balance under brutal acceleration.',
        stat: '6-spd',
        label: 'Dual-Clutch Transaxle',
      },
      nurburgring: {
        kicker: '7:08.68 Lap Record',
        title: 'Nürburgring Nordschleife conqueror.',
        copy: 'In 2013, racing driver Michael Krumm piloted the Nissan GT-R NISMO with the N Attack Package around the Nürburgring Nordschleife in an astonishing 7:08.679, setting an all-time benchmark for volume production cars.',
        stat: '7:08',
        label: 'Green Hell Record',
      },
      nismo: {
        kicker: 'NISMO GT3 Homologation',
        title: '600 horsepower track terror.',
        copy: 'The GT-R NISMO takes the VR38DETT to 600 hp with GT3-spec high-flow turbochargers, dry carbon-fiber aerodynamic bodywork generating 100 kg of downforce, and giant Brembo carbon-ceramic brakes.',
        stat: '600 hp',
        label: 'NISMO Peak Output',
      },
      farewell: {
        kicker: '2007-2025 Era',
        title: 'Eighteen years of supercar hunting.',
        copy: 'Over an 18-year production run, the R35 constantly evolved and defended its title against exotics costing five times as much. The T-Spec Takumi and Skyline editions serve as the glorious final chapter.',
        stat: '18 Yrs',
        label: 'Reign of Godzilla',
      },
    },
  };

  // --------------------------------------------------------------------------
  // 5. Unified Drawer Manager
  // --------------------------------------------------------------------------
  function initGenerationDrawer(genKey) {
    const drawer = document.getElementById(`${genKey}-drawer`);
    const openBtn = document.getElementById(`${genKey}-drawer-open`);
    const backdrop = document.getElementById(`${genKey}-drawer-backdrop`);
    const scrollContainer = document.getElementById(`${genKey}-drawer-content`);
    const panel = drawer ? drawer.querySelector(`.${genKey}-drawer__panel, .gen-drawer__panel`) : null;
    const closeButtons = drawer ? drawer.querySelectorAll(`.${genKey}-drawer__close, .gen-drawer__close`) : [];

    if (!drawer || !openBtn || !backdrop || !scrollContainer || !panel) {
      return;
    }

    let drawerObserver = null;

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      panel.scrollTop = 0;

      // Play video if present
      const video = drawer.querySelector('video');
      if (video) {
        video.play().catch(() => {});
      }

      setupDrawerReveals();

      // Set focus to the first close button for keyboard accessibility
      const firstClose = drawer.querySelector('button');
      if (firstClose) {
        firstClose.focus();
      }
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      resetDrawerReveals();

      // Pause and mute video
      const video = drawer.querySelector('video');
      const soundBtn = drawer.querySelector('.sound-toggle');
      if (video) {
        video.pause();
        if (!video.muted) {
          video.muted = true;
          if (soundBtn) {
            soundBtn.classList.remove('is-unmuted');
            soundBtn.setAttribute('aria-pressed', 'false');
            soundBtn.setAttribute('aria-label', 'Unmute video');
          }
        }
      }

      // Return focus to trigger
      openBtn.focus();
    }

    function setupDrawerReveals() {
      if (drawerObserver) {
        drawerObserver.disconnect();
      }

      drawerObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
            }
          });
        },
        { root: panel, threshold: 0.12 }
      );

      scrollContainer.querySelectorAll(`.${genKey}-reveal, .gen-reveal`).forEach((el) => {
        drawerObserver.observe(el);
      });
    }

    function resetDrawerReveals() {
      if (drawerObserver) {
        drawerObserver.disconnect();
        drawerObserver = null;
      }
      scrollContainer.querySelectorAll(`.${genKey}-reveal, .gen-reveal`).forEach((el) => {
        el.classList.remove('is-visible');
      });
    }

    openBtn.addEventListener('click', openDrawer);
    closeButtons.forEach((btn) => btn.addEventListener('click', closeDrawer));
    backdrop.addEventListener('click', closeDrawer);

    // Keyboard navigation: Escape to close
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Keyboard navigation: Modal focus trap inside panel
    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      const focusables = panel.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    });

    // Cinema CTA button smooth scrolling
    const cinemaCta = drawer.querySelector(`.${genKey}-cinema__cta, .gen-cinema__cta`);
    if (cinemaCta) {
      cinemaCta.addEventListener('click', (e) => {
        e.preventDefault();
        const briefing = drawer.querySelector(`.${genKey}-briefing, .gen-briefing`);
        if (briefing && panel) {
          panel.scrollTo({ top: briefing.offsetTop - 20, behavior: 'smooth' });
        }
      });
    }

    // Story selector tabs
    const stories = generationStories[genKey];
    if (stories) {
      const storyButtons = scrollContainer.querySelectorAll('[data-story]');
      const focusCard = scrollContainer.querySelector(`.${genKey}-focus, .gen-focus`);
      const focusKicker = document.getElementById(`${genKey}-focus-kicker`);
      const focusTitle = document.getElementById(`${genKey}-focus-title`);
      const focusCopy = document.getElementById(`${genKey}-focus-copy`);
      const focusStat = document.getElementById(`${genKey}-focus-stat`);
      const focusLabel = document.getElementById(`${genKey}-focus-label`);
      let storyTimeout = null;

      function selectStory(storyKey) {
        const key = storyKey ? storyKey.toLowerCase() : '';
        const story = stories[storyKey] || stories[key];
        if (!story || !focusKicker || !focusTitle || !focusCopy || !focusStat || !focusLabel) {
          return;
        }

        if (storyTimeout) {
          clearTimeout(storyTimeout);
          storyTimeout = null;
        }

        storyButtons.forEach((button) => {
          const btnKey = (button.dataset.story || '').toLowerCase();
          const isActive = btnKey === key || button.dataset.story === storyKey;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', String(isActive));
        });

        if (focusCard) {
          focusCard.style.opacity = '0.35';
          focusCard.style.transform = 'translateY(6px)';
          storyTimeout = setTimeout(() => {
            focusKicker.textContent = story.kicker;
            focusTitle.textContent = story.title;
            focusCopy.textContent = story.copy;
            focusStat.textContent = story.stat;
            focusLabel.textContent = story.label;
            focusCard.style.opacity = '1';
            focusCard.style.transform = 'translateY(0)';
            storyTimeout = null;
          }, 120);
        } else {
          focusKicker.textContent = story.kicker;
          focusTitle.textContent = story.title;
          focusCopy.textContent = story.copy;
          focusStat.textContent = story.stat;
          focusLabel.textContent = story.label;
        }
      }

      storyButtons.forEach((button) => {
        button.addEventListener('click', () => selectStory(button.dataset.story));
      });
    }
  }

  // --------------------------------------------------------------------------
  // 6. Sound Toggles
  // --------------------------------------------------------------------------
  function initSoundToggles() {
    const soundToggles = document.querySelectorAll('.sound-toggle');
    soundToggles.forEach((btn) => {
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
  }

  // --------------------------------------------------------------------------
  // 7. 3D Model Loading Handlers
  // --------------------------------------------------------------------------
  function initModelCards() {
    document.querySelectorAll('.model-card').forEach((card) => {
      const iframe = card.querySelector('iframe');
      const loaderEl = card.querySelector('.model-card__loading');
      if (iframe && loaderEl) {
        iframe.addEventListener('load', () => {
          loaderEl.classList.add('is-loaded');
        });
        // Timeout fallback if iframe load event is suppressed
        setTimeout(() => {
          loaderEl.classList.add('is-loaded');
        }, 5000);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. Mobile Landing & Direct Scroll to Introduction
  // --------------------------------------------------------------------------
  function initMobileLanding() {
    const heroSection = document.getElementById('hero');
    const introSection = document.getElementById('intro');
    const scrollHint = document.querySelector('.hero__scroll-hint');
    const exploreBtn = document.querySelector('.hero__copy .button[href="#intro"]');

    function scrollToIntro(e) {
      if (e) e.preventDefault();
      if (introSection) {
        introSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
      }
    }

    if (scrollHint) {
      scrollHint.addEventListener('click', scrollToIntro);
      scrollHint.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          scrollToIntro(e);
        }
      });
    }

    if (exploreBtn) {
      exploreBtn.addEventListener('click', scrollToIntro);
    }

    // Touch gesture handler: swiping up while landing on hero immediately glides to intro
    if (heroSection) {
      let touchStartY = 0;
      let touchStartX = 0;
      let isTrackingTouch = false;

      heroSection.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
          isTrackingTouch = true;
        }
      }, { passive: true });

      heroSection.addEventListener('touchend', (e) => {
        if (!isTrackingTouch) return;
        isTrackingTouch = false;

        // Ensure changedTouches exists
        if (!e.changedTouches || e.changedTouches.length === 0) return;

        // When user is near the top of hero on mobile
        if (window.innerWidth <= 980 && window.scrollY < 120) {
          const touchEndY = e.changedTouches[0].clientY;
          const touchEndX = e.changedTouches[0].clientX;
          const diffY = touchStartY - touchEndY;
          const diffX = Math.abs(touchStartX - touchEndX);

          // Intentional swipe up (finger moved up by > 40px)
          if (diffY > 40 && diffY > diffX) {
            scrollToIntro();
          }
        }
      }, { passive: true });
    }
  }

  // --------------------------------------------------------------------------
  // 9. Initialization Lifecycle
  // --------------------------------------------------------------------------
  document.body.classList.add('is-loading');
  resize();
  updateScroll();
  setupReveals();
  render();
  tickLoader();

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('pointermove', (event) => {
    state.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('load', () => {
    pageLoaded = true;
  });

  // Safety fallback: ensure preloader never gets stuck
  window.setTimeout(() => {
    pageLoaded = true;
  }, 4000);

  // Initialize interactive components when DOM is ready (or immediately if already interactive/complete)
  function init() {
    initNavigation();
    initGenerationDrawer('r32');
    initGenerationDrawer('r33');
    initGenerationDrawer('r34');
    initGenerationDrawer('r35');
    initSoundToggles();
    initModelCards();
    initMobileLanding();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
