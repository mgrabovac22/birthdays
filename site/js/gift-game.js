import { randomFrom } from "./themes.js";

const jokes = [
  ["Službena dozvola za tortu", "Danas možeš uzeti i rub i sredinu. Čestitka je upravo ovjerila dozvolu."],
  ["Izvještaj iz svemira", "Zvijezde tvrde da danas izgledaš sjajno. Neovisno mišljenje Mjeseca još čekamo."],
  ["Rođendanska prognoza", "Izgledni su naleti smijeha, pljuskovi konfeta i vrlo visoka vjerojatnost druge kriške torte."],
  ["Poklon iz budućnosti", "Tvoja buduća verzija poručuje da je ova godina bila odlična. Posebno preporučuje više plesa."],
];

const surprises = [
  ["Mini izazov", "Zaželi jednu malu i jednu ludu želju. Malu pokušaj ostvariti ovaj tjedan. Ludu zadrži za sebe."],
  ["Tri sekunde slave", "Uspravi se kao da upravo primaš nagradu za najbolju osobu na tulumu. Pljesak je zaslužen."],
  ["Odaberi pjesmu dana", "Pusti onu pjesmu koju uvijek pojačaš kad si sam. Danas je prva na popisu."],
  ["Kupon za jedan spontani plan", "Odaberi dobro društvo i napravite nešto što sutra vrijedi prepričati."],
];

export function giftDeck(name, seed, round = 0) {
  const rng = randomFrom(seed ^ Math.imul(round + 1, 0x6e62a9));
  const deck = [
    jokes[Math.floor(rng() * jokes.length)],
    surprises[Math.floor(rng() * surprises.length)],
    [name ? `Za tebe, ${name} ✦` : "Velika rođendanska želja ✦",
      "Neka ti nova godina donese puno zdravlja, dobra iznenađenja i ljude s kojima je svaki običan dan pomalo slavlje. Sretan rođendan!"],
  ];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createGiftGame({ onOpenChange, chime, canAnimate }) {
  const byId = (id) => document.getElementById(id);
  const dialog = byId("gift-game");
  const launch = byId("gift-game-open");
  const choices = [...byId("gift-grid").querySelectorAll("button")];
  const confetti = byId("game-confetti");
  const reward = byId("gift-reward");
  const again = byId("gift-game-again");
  const opened = new Set();
  let name = "";
  let seed = 0;
  let round = 0;
  let deck = giftDeck(name, seed);

  function countGifts() {
    byId("gift-game-count").textContent = `Otvoreno ${opened.size} / ${choices.length}`;
    again.hidden = opened.size < choices.length;
  }

  function reset() {
    opened.clear();
    deck = giftDeck(name, seed, round);
    choices.forEach((choice) => {
      choice.classList.remove("is-open");
      choice.setAttribute("aria-pressed", "false");
    });
    confetti.replaceChildren();
    reward.hidden = true;
    byId("gift-reward-title").textContent = "";
    byId("gift-reward-message").textContent = "";
    countGifts();
  }

  function scatter(choice) {
    if (!canAnimate()) return;
    const center = choice.getBoundingClientRect();
    const panel = confetti.getBoundingClientRect();
    const palette = ["#fef0ba", "#fb88b3", "#b9aeff", "#76e5db", "#ffb477"];
    confetti.replaceChildren();
    for (let i = 0; i < 44; i += 1) {
      const spark = document.createElement("i");
      const angle = i * 2.399;
      const distance = 32 + Math.random() * 160;
      spark.style.left = `${center.left - panel.left + center.width / 2}px`;
      spark.style.top = `${center.top - panel.top + center.height * .39}px`;
      spark.style.setProperty("--bit", palette[i % palette.length]);
      spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--dy", `${Math.sin(angle) * distance - 55}px`);
      spark.style.setProperty("--spin", `${i * 67}deg`);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
      confetti.append(spark);
    }
  }

  choices.forEach((choice, index) => choice.addEventListener("click", () => {
    const firstVisit = !opened.has(index);
    opened.add(index);
    choice.classList.add("is-open");
    choices.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    const [title, text] = deck[index];
    byId("gift-reward-title").textContent = title;
    byId("gift-reward-message").textContent = text;
    reward.hidden = false;
    countGifts();
    if (firstVisit) {
      scatter(choice);
      chime(opened.size === choices.length ? "reveal" : "spark");
    }
  }));

  launch.addEventListener("click", () => {
    if (dialog.open) return;
    dialog.showModal();
    onOpenChange(true);
    (choices.find((_, index) => !opened.has(index)) ?? again).focus({ preventScroll: true });
  });
  byId("gift-game-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    onOpenChange(false);
    launch.focus({ preventScroll: true });
    confetti.replaceChildren();
  });
  again.addEventListener("click", () => {
    round += 1;
    reset();
    choices[0].focus({ preventScroll: true });
  });

  countGifts();
  return {
    setGreeting(value, newSeed) {
      if (name === value && seed === newSeed) return;
      name = value;
      seed = newSeed;
      round = 0;
      reset();
    },
  };
}
