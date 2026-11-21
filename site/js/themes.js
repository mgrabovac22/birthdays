import { birthdayDay } from "./calendar.js";

const themes = [
  { name: "Zvjezdani valcer", sky: "#1b0e26", glow: "#752a56", colors: ["#ff91bd", "#fbc487", "#c896ff", "#ffebbb"], hue: 0, orbit: "spiral", notes: [60, 64, 67, 72, 76] },
  { name: "Komet od breskve", sky: "#230f20", glow: "#88413a", colors: ["#ffc075", "#ff787b", "#ffc6b7", "#fff2ab"], hue: 28, orbit: "comet", notes: [55, 60, 64, 67, 74] },
  { name: "Ljubičasta pomrčina", sky: "#17102c", glow: "#5b398b", colors: ["#bb94ff", "#737cff", "#ffacd5", "#eee0ff"], hue: -48, orbit: "rings", notes: [57, 60, 64, 69, 72] },
  { name: "Zelena aurora", sky: "#102327", glow: "#216965", colors: ["#79f3c3", "#72e2f5", "#d1ffb7", "#9dbaff"], hue: 137, orbit: "wave", notes: [62, 65, 69, 74, 77] },
  { name: "Mjesečev cvijet", sky: "#101b32", glow: "#304d86", colors: ["#9dd5ff", "#739aff", "#f4c7ff", "#fff4d8"], hue: -83, orbit: "bloom", notes: [60, 62, 65, 67, 72] },
  { name: "Zlatno zviježđe", sky: "#261c1b", glow: "#985b33", colors: ["#ffce78", "#ffa181", "#f7dfad", "#d9a5ff"], hue: 60, orbit: "arch", notes: [65, 69, 72, 77, 81] },
  { name: "Suton orhideja", sky: "#21102a", glow: "#703998", colors: ["#efa0ff", "#fe8bb2", "#a085ff", "#ffd6ef"], hue: -23, orbit: "figure8", notes: [60, 65, 69, 72, 77] },
];

export function dayTheme(date) {
  const { iso } = birthdayDay(date);
  const day = new Date(`${iso}T12:00:00Z`);
  const index = (day.getUTCDay() + 1) % themes.length;
  return { ...themes[index], seed: hashText(iso) };
}

export function hashText(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

export function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function traceStars(seed) {
  const random = randomFrom(seed ^ 0x61ca9d);
  const direction = random() < .5 ? -1 : 1;
  const turn = random() < .5 ? -1 : 1;
  return [[.16, .59], [.32, .34], [.47, .58], [.65, .32], [.82, .55]].map(([x, y]) => ({
    x: .5 + direction * (x - .5 + (random() - .5) * .045),
    y: .47 + turn * (y - .47 + (random() - .5) * .10),
  }));
}
