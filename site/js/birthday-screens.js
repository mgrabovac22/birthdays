import { hashText } from "./themes.js";

export const SCREEN_DURATION = 7_000;

export const birthdayScreens = [
  {
    id: "envelope", name: "Zvjezdana kuverta", symbol: "✦", orbit: "spiral",
    sky: "#180e24", glow: "#762c59", colors: ["#ff9fc5", "#fbc487", "#c294ef", "#ffe4b3"],
    wide: [.46, .02, 1], narrow: [0, -.26, 1],
  },
  {
    id: "cake", name: "Torta pod svijećama", symbol: "♨", orbit: "arch",
    sky: "#241120", glow: "#8b4338", colors: ["#ffd097", "#f490a8", "#db86a2", "#fff0bd"],
    wide: [-.46, .02, 1.05], narrow: [0, -.28, .98],
  },
  {
    id: "aurora", name: "Planet aurore", symbol: "◉", orbit: "wave",
    sky: "#0b1c27", glow: "#195e65", colors: ["#a0ffdc", "#6ad9ec", "#969bff", "#dafeea"],
    wide: [0, -.33, 1.02], narrow: [0, -.30, .97],
  },
  {
    id: "gift", name: "Komet s poklonom", symbol: "◇", orbit: "comet",
    sky: "#14132d", glow: "#414681", colors: ["#c5c7ff", "#87c1fc", "#9a78f0", "#f8e9ff"],
    wide: [.46, -.01, .96], narrow: [0, -.27, .96],
  },
  {
    id: "fireworks", name: "Vatromet želja", symbol: "✺", orbit: "bloom",
    sky: "#271124", glow: "#842d45", colors: ["#ffadbb", "#ffab70", "#f477a7", "#ffefbd"],
    wide: [0, .38, .98], narrow: [0, .36, .88],
  },
];

export function screenTheme(day, index) {
  const screen = birthdayScreens[index];
  const colors = screen.colors.slice();
  colors[2] = day.colors[(index + 1) % day.colors.length];
  return { ...day, ...screen, colors, seed: hashText(`${day.seed}/${screen.id}`) };
}

export function figureOrigin(theme, width) {
  return width >= 780 ? theme.wide : theme.narrow;
}

export function createScreenCycle(onChange, clock = {
  now: () => performance.now(),
  schedule: (callback, duration) => setTimeout(callback, duration),
  cancel: (timer) => clearTimeout(timer),
}) {
  let index = 0;
  let remaining = SCREEN_DURATION;
  let playing = false;
  let deadline = 0;
  let timer;

  function start() {
    if (playing) {
      deadline = clock.now() + remaining;
      timer = clock.schedule(() => select(index + 1), remaining);
    }
    onChange({ index, remaining, playing });
  }

  function select(value) {
    clock.cancel(timer);
    index = ((value % birthdayScreens.length) + birthdayScreens.length) % birthdayScreens.length;
    remaining = SCREEN_DURATION;
    start();
  }

  function setPlaying(value) {
    if (playing === value) return;
    if (playing) {
      remaining = Math.max(0, deadline - clock.now());
      clock.cancel(timer);
    }
    playing = value;
    start();
  }

  return { select, setPlaying };
}
