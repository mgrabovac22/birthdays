import { randomFrom, traceStars } from "./themes.js";
import { figureOrigin } from "./birthday-screens.js";

export function createPlayground({ stage, chime, scatterFallback }) {
  const get = (id) => document.getElementById(id);
  const traceButton = get("trace-button");
  const wishButton = get("wish-button");
  const meteorButton = get("meteor-button");
  const traceLayer = get("trace-layer");
  const links = get("trace-links");
  const field = get("trace-stars");
  const wishLayer = get("wish-layer");
  const candleButton = get("candle-button");
  const effects = get("sky-effects");
  const status = get("playground-status");
  let theme;
  let director;
  let paused;
  let activity;
  let extinguished = false;
  let stars = [];
  let collected = 0;

  function scrollToStage() {
    stage.scrollIntoView({ block: "nearest", behavior: paused ? "auto" : "smooth" });
  }

  function addEffect(className) {
    const element = document.createElement("span");
    element.className = className;
    element.addEventListener("animationend", () => element.remove(), { once: true });
    effects.append(element);
    return element;
  }

  function celebrate(x, y) {
    if (paused) return;
    if (director?.available) director.celebrate(x, y);
    else scatterFallback(x, y);
    const ring = addEffect("effect-ring");
    ring.style.left = `${50 + x * 50}%`;
    ring.style.top = `${50 - y * 50}%`;
  }

  function drawLinks() {
    if (activity !== "trace" || collected < 2) return;
    const { width, height } = traceLayer.getBoundingClientRect();
    const lines = stars.slice(1, collected).map((end, index) => {
      const start = stars[index];
      const dx = (end.x - start.x) * width;
      const dy = (end.y - start.y) * height;
      const line = document.createElement("span");
      line.className = "trace-line";
      line.style.left = `${start.x * 100}%`;
      line.style.top = `${start.y * 100}%`;
      line.style.width = `${Math.hypot(dx, dy)}px`;
      line.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`;
      line.style.setProperty("--trace-color", theme.colors[0]);
      return line;
    });
    links.replaceChildren(...lines);
  }

  function updateTrace() {
    const complete = collected === stars.length;
    traceLayer.classList.toggle("is-complete", complete);
    [...field.children].forEach((button, index) => {
      button.classList.toggle("is-collected", index < collected);
      button.toggleAttribute("disabled", index !== collected);
      if (index === collected) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    status.textContent = complete
      ? "Zviježđe je dovršeno. Sutra te čeka novo."
      : `${collected} od ${stars.length} spojeno. Odaberi zvijezdu ${collected + 1}.`;
    drawLinks();
  }

  function collect(index) {
    if (activity !== "trace" || index !== collected) return;
    const { x, y } = stars[index];
    const view = stage.getBoundingClientRect();
    const fieldBounds = traceLayer.getBoundingClientRect();
    const screenX = 2 * (fieldBounds.left - view.left + x * fieldBounds.width) / view.width - 1;
    const screenY = 1 - 2 * (fieldBounds.top - view.top + y * fieldBounds.height) / view.height;
    collected += 1;
    updateTrace();
    if (collected === stars.length) {
      celebrate(screenX, screenY);
      chime("reveal");
      traceButton.focus({ preventScroll: true });
    } else {
      if (!paused) {
        if (director?.available) director.scatter(screenX, screenY);
        else scatterFallback(screenX, screenY);
      }
      chime("step", index);
      field.children[collected]?.focus({ preventScroll: true });
    }
  }

  function startTrace() {
    collected = 0;
    links.replaceChildren();
    stars = traceStars(theme.seed);
    field.replaceChildren(...stars.map(({ x, y }, index) => {
      const button = document.createElement("button");
      button.className = "trace-star";
      button.type = "button";
      button.style.left = `${x * 100}%`;
      button.style.top = `${y * 100}%`;
      button.setAttribute("aria-label", `Spoji zvijezdu ${index + 1}`);
      const glyph = document.createElement("span");
      glyph.textContent = "✦";
      glyph.setAttribute("aria-hidden", "true");
      button.append(glyph, String(index + 1));
      button.addEventListener("click", () => collect(index));
      return button;
    }));
    updateTrace();
  }

  function setActivity(value) {
    activity = value;
    extinguished = false;
    effects.replaceChildren();
    stage.classList.toggle("is-tracing", value === "trace");
    stage.classList.toggle("is-wishing", value === "wish");
    traceLayer.hidden = value !== "trace";
    wishLayer.hidden = value !== "wish";
    wishLayer.classList.remove("is-out");
    traceButton.setAttribute("aria-pressed", String(value === "trace"));
    wishButton.setAttribute("aria-pressed", String(value === "wish"));
    status.textContent = "";
    links.replaceChildren();
    field.replaceChildren();
    director?.setActivity(activity, extinguished);
    if (value === "trace") startTrace();
    if (value === "wish") {
      candleButton.textContent = "Ugasi svjećicu";
      status.textContent = "Svjećica gori. Zaželi želju!";
    }
  }

  meteorButton.addEventListener("click", () => {
    if (paused) {
      if (activity) setActivity(undefined);
      status.textContent = "Nastavi animacije za prikaz meteorske kiše.";
      return;
    }
    setActivity(undefined);
    status.textContent = "Meteorska kiša je počela.";
    if (director?.available) director.shower();
    else {
      const rng = randomFrom(theme.seed);
      const direction = rng() < .5 ? -1 : 1;
      for (let i = 0; i < 14; i += 1) {
        const meteor = addEffect("effect-comet");
        meteor.style.left = `${direction === 1 ? rng() * 58 - 12 : 48 + rng() * 53}%`;
        meteor.style.top = `${rng() * 52 + 6}%`;
        meteor.style.setProperty("--dx", `${direction * (145 + rng() * 340)}px`);
        meteor.style.setProperty("--dy", `${160 + rng() * 190}px`);
        meteor.style.setProperty("--comet-angle", direction === 1 ? "32deg" : "148deg");
        meteor.style.setProperty("--delay", `${i * .13}s`);
        meteor.style.setProperty("--duration", `${.68 + rng() * .63}s`);
        meteor.style.setProperty("--effect-color", theme.colors[i % theme.colors.length]);
      }
    }
    chime("shower");
    scrollToStage();
  });

  traceButton.addEventListener("click", () => {
    if (activity === "trace") {
      setActivity(undefined);
      return;
    }
    setActivity("trace");
    scrollToStage();
    field.firstElementChild.focus({ preventScroll: true });
  });
  wishButton.addEventListener("click", () => {
    if (activity === "wish") {
      setActivity(undefined);
      return;
    }
    setActivity("wish");
    scrollToStage();
    candleButton.focus({ preventScroll: true });
  });

  candleButton.addEventListener("click", () => {
    extinguished = !extinguished;
    wishLayer.classList.toggle("is-out", extinguished);
    candleButton.textContent = extinguished ? "Ponovno upali svjećicu" : "Ugasi svjećicu";
    status.textContent = extinguished ? "Želja je poletjela! ✦" : "Svjećica gori. Zaželi želju!";
    director?.setActivity(activity, extinguished);
    if (extinguished) {
      const [x, y] = figureOrigin(theme, stage.clientWidth);
      celebrate(x, y + .14);
    }
    chime(extinguished ? "reveal" : "spark");
  });

  const closeOnEscape = (event) => {
    if (event.key !== "Escape" || !activity) return;
    const primary = activity === "trace" ? traceButton : wishButton;
    setActivity(undefined);
    primary.focus({ preventScroll: true });
  };
  stage.addEventListener("keydown", closeOnEscape);
  new ResizeObserver(drawLinks).observe(traceLayer);

  return {
    setDirector(value) {
      director = value;
      director.setActivity(activity, extinguished);
    },
    setTheme(value) {
      theme = value;
      if (activity === "trace") {
        const hadFocus = field.contains(document.activeElement);
        startTrace();
        if (hadFocus) field.firstElementChild.focus({ preventScroll: true });
      }
    },
    setPaused(value) {
      paused = value;
      if (paused) effects.replaceChildren();
    },
    reset() { setActivity(undefined); },
  };
}
