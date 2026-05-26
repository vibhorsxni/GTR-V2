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
