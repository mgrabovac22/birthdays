import { birthdayDay, BIRTHDAY_TIME_ZONE } from "./calendar.js";
import { createPlayground } from "./playground.js";
import { dayTheme, hashText } from "./themes.js";

const byId = (id) => document.getElementById(id);
const stage = byId("stage");
const greeting = byId("greeting");
const recipient = byId("recipient");
const message = byId("message");
const celebrants = byId("celebrants");
const trigger = byId("stage-trigger");
const motion = byId("motion-toggle");
const sound = byId("sound-toggle");
const genericMessage = message.textContent;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const dateFormat = new Intl.DateTimeFormat("hr-HR", {
  timeZone: BIRTHDAY_TIME_ZONE, day: "numeric", month: "long",
});

let paused = reducedMotion.matches;
let motionOverride = false;
let theme;
let director;
let day;
let dateTimer;
let request;
let lastFetch = -Infinity;
let cards = [];
let currentDesign;
let audio;
let audioGain;
let playingSound = false;
let lastChime = -Infinity;
let brush;
let dragged = false;
const playground = createPlayground({ stage, chime: playChime, scatterFallback });

function setMotion(value) {
  paused = value;
  stage.classList.toggle("is-paused", paused);
  motion.setAttribute("aria-pressed", String(paused));
  motion.title = paused ? "Nastavi animacije" : "Zaustavi animacije";
  motion.setAttribute("aria-label", motion.title);
  if (paused) {
    stage.style.setProperty("--pan-x", "0px");
    stage.style.setProperty("--pan-y", "0px");
    byId("fallback-sparkles").replaceChildren();
    brush = undefined;
  }
  director?.setPaused(paused);
  playground.setPaused(paused);
}

function playChime(kind, step) {
  if (!playingSound || audio?.state !== "running") return;
  const start = audio.currentTime;
  if (kind === "spark" && start - lastChime < .12) return;
  lastChime = start;
  const notes = {
    reveal: theme.notes,
    shower: [...theme.notes].reverse().map((note) => note + 12),
    step: [theme.notes[step]],
    spark: [theme.notes[2], theme.notes[4]],
  }[kind];
  notes.forEach((note, index) => {
    const time = start + index * (kind === "shower" ? .105 : kind === "reveal" ? .078 : .045);
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = index % 2 ? "sine" : "triangle";
    oscillator.frequency.value = 440 * (2 ** ((note - 69) / 12));
    envelope.gain.setValueAtTime(.001, time);
    envelope.gain.exponentialRampToValueAtTime(.16 / Math.sqrt(index + 1), time + .023);
    envelope.gain.exponentialRampToValueAtTime(.001, time + .57);
    oscillator.connect(envelope).connect(audioGain);
    oscillator.start(time);
    oscillator.stop(time + .58);
  });
}

function setSound(enabled) {
  playingSound = enabled;
  if (audioGain) audioGain.gain.setTargetAtTime(enabled ? .48 : 0, audio.currentTime, .015);
  sound.setAttribute("aria-pressed", String(enabled));
  sound.title = enabled ? "Isključi zvuk" : "Uključi zvuk";
  sound.setAttribute("aria-label", sound.title);
}

function scatterFallback(x, y, trailing = false) {
  const sparks = byId("fallback-sparkles");
  if (!trailing) sparks.replaceChildren();
  const count = trailing ? 4 : 24;
  for (let i = 0; i < count; i += 1) {
    const star = document.createElement("span");
    const angle = i * 2.4;
    const radius = trailing ? 12 + Math.random() * 32 : 33 + Math.random() * 150;
    star.textContent = i % 3 ? "✧" : "✦";
    star.style.left = `${50 + x * 50}%`;
    star.style.top = `${50 - y * 50}%`;
    star.style.setProperty("--dx", `${Math.cos(angle) * radius}px`);
    star.style.setProperty("--dy", `${Math.sin(angle) * radius}px`);
    star.style.setProperty("--spark-color", theme.colors[i % theme.colors.length]);
    star.addEventListener("animationend", () => star.remove(), { once: true });
    sparks.append(star);
  }
  while (sparks.childElementCount > 85) sparks.firstElementChild.remove();
}

function reveal() {
  if (currentDesign === undefined) return;
  playground.reset();
  stage.classList.add("is-open");
  director?.reveal(currentDesign);
  if (!director?.available && !paused) {
    const wide = stage.clientWidth >= 780;
    scatterFallback(wide ? .46 : 0, wide ? .02 : -.26);
  }
  playChime("reveal");
}

function showGreeting(index) {
  const card = cards[index];
  const seed = card ? hashText(JSON.stringify([card.name, card.message])) : theme.seed;
  recipient.hidden = !card;
  recipient.textContent = card?.name ?? "";
  message.textContent = card?.message ?? genericMessage;
  byId("greeting-label").textContent = card ? "DANAS SLAVIMO" : "ROĐENDANSKA ČESTITKA";
  [...celebrants.children].forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
  if (currentDesign === seed) return;
  currentDesign = seed;
  greeting.classList.remove("is-revealing");
  requestAnimationFrame(() => greeting.classList.add("is-revealing"));
  reveal();
}

function setCards(nextCards) {
  if (currentDesign !== undefined && JSON.stringify(nextCards) === JSON.stringify(cards)) return;
  cards = nextCards;
  celebrants.hidden = cards.length < 2;
  celebrants.replaceChildren(...(cards.length < 2 ? [] : cards.map(({ name }, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => showGreeting(index));
    return button;
  })));
  showGreeting(0);
}

async function loadToday() {
  if (request || Date.now() - lastFetch < 11_000) return;
  const requested = day.iso;
  const attempt = new AbortController();
  const url = new URL("../today.json", import.meta.url);
  url.searchParams.set("date", requested);
  request = attempt;
  lastFetch = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store", credentials: "omit", signal: attempt.signal });
    if (!response.ok) throw new Error("Greeting unavailable.");
    const payload = await response.json();
    if (request !== attempt) return;
    if (birthdayDay().iso !== requested) {
      updateDay();
      return;
    }
    if (payload?.date === requested && Array.isArray(payload.cards)) {
      setCards(payload.cards.filter((card) => typeof card?.name === "string" && typeof card?.message === "string"));
    }
  } catch {
    // The generic card stays available if the daily publication is late or the site is offline.
  } finally {
    if (request === attempt) {
      request = undefined;
      if (currentDesign === undefined) setCards([]);
    }
  }
}

function updateDay() {
  clearTimeout(dateTimer);
  const now = new Date();
  const nextDay = birthdayDay(now);
  if (day?.iso !== nextDay.iso) {
    const changedDay = Boolean(day);
    request?.abort();
    request = undefined;
    lastFetch = -Infinity;
    day = nextDay;
    theme = dayTheme(now);
    const today = byId("today");
    today.dateTime = day.iso;
    today.textContent = dateFormat.format(now);
    stage.style.setProperty("--sky", theme.sky);
    stage.style.setProperty("--glow", theme.glow);
    stage.style.setProperty("--accent", theme.colors[0]);
    stage.style.setProperty("--gold", theme.colors[3]);
    stage.style.setProperty("--art-hue", `${theme.hue}deg`);
    byId("scene-name").textContent = theme.name;
    director?.setTheme(theme);
    playground.setTheme(theme);
    if (changedDay) {
      currentDesign = undefined;
      setCards([]);
    }
  }
  if (!document.hidden) void loadToday();
  dateTimer = setTimeout(updateDay, 60_035 - now.getTime() % 60_000);
}

motion.addEventListener("click", () => {
  motionOverride = true;
  setMotion(!paused);
});
reducedMotion.addEventListener("change", (event) => {
  if (!motionOverride) setMotion(event.matches);
});
sound.addEventListener("click", async () => {
  if (playingSound) {
    setSound(false);
    return;
  }
  sound.disabled = true;
  try {
    if (!audio) {
      audio = new AudioContext();
      audioGain = audio.createGain();
      audioGain.gain.value = 0;
      audioGain.connect(audio.destination);
    }
    await audio.resume();
    setSound(true);
    playChime("spark");
    sound.disabled = false;
  } catch {
    sound.title = "Zvuk nije dostupan u ovom pregledniku";
    sound.setAttribute("aria-label", sound.title);
  }
});

function relativePointer(event) {
  const bounds = stage.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: 1 - (event.clientY - bounds.top) / bounds.height * 2 };
}

trigger.addEventListener("pointermove", (event) => {
  if (paused) return;
  const { x, y } = relativePointer(event);
  if (brush?.id === event.pointerId) {
    const moved = Math.hypot(event.clientX - brush.x, event.clientY - brush.y);
    if (moved > 7 && event.timeStamp - brush.time > 26) {
      dragged = true;
      brush.x = event.clientX;
      brush.y = event.clientY;
      brush.time = event.timeStamp;
      if (director?.available) director.paintStardust(x, y);
      else scatterFallback(x, y, true);
    }
  }
  if (event.pointerType === "touch") return;
  stage.style.setProperty("--pan-x", `${x * -10}px`);
  stage.style.setProperty("--pan-y", `${y * 9}px`);
  director?.aim(x, y);
});
trigger.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  dragged = false;
  if (paused) return;
  brush = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp - 27 };
  trigger.setPointerCapture(event.pointerId);
});
trigger.addEventListener("lostpointercapture", (event) => {
  if (brush?.id === event.pointerId) brush = undefined;
});
trigger.addEventListener("pointerleave", () => {
  stage.style.setProperty("--pan-x", "0px");
  stage.style.setProperty("--pan-y", "0px");
  director?.aim(0, 0);
});
trigger.addEventListener("click", (event) => {
  if (event.detail && dragged) return;
  const { x, y } = event.detail ? relativePointer(event) : { x: 0, y: 0 };
  if (!paused) {
    if (director?.available) director.scatter(x, y);
    else scatterFallback(x, y);
  }
  playChime("spark");
});
byId("replay").addEventListener("click", reveal);

window.addEventListener("pagehide", () => {
  request?.abort();
  request = undefined;
  clearTimeout(dateTimer);
  setSound(false);
});
window.addEventListener("pageshow", updateDay);
window.addEventListener("online", updateDay);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateDay();
});
setMotion(paused);
updateDay();

import("./scene.js").then(({ createScene }) => {
  director = createScene(byId("stage-canvas"), {
    theme,
    paused,
    availability: (available) => stage.classList.toggle("has-webgl", available),
  });
  playground.setDirector(director);
  if (currentDesign !== undefined) director.reveal(currentDesign);
}).catch(() => {
  // The artwork and controls also work on the CSS fallback.
});
