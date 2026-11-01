// 札の選び方と、試合予定の生成・URLへの保存を担当する。
// 札番号は 1〜100。100番は「00」として扱い、1〜9番は「01」〜「09」として扱う。

export const METHODS = {
  ones: { code: "o", label: "1の位", pick: 5 },
  tens: { code: "t", label: "10の位", pick: 5 },
  three: { code: "x", label: "3つの数字", pick: 3 },
};
const BY_CODE = Object.fromEntries(Object.entries(METHODS).map(([k, v]) => [v.code, k]));

const key = (n) => n % 100; // 100 → 0
const onesOf = (n) => key(n) % 10;
const tensOf = (n) => Math.floor(key(n) / 10);
const ALL = Array.from({ length: 100 }, (_, i) => i + 1);

// 決め方と数字から、その試合で使う札（removed を除く）を返す
export function cardsFor(method, digits, removed = null) {
  const set = new Set(digits);
  let cards;
  if (method === "ones") cards = ALL.filter((n) => set.has(onesOf(n)));
  else if (method === "tens") cards = ALL.filter((n) => set.has(tensOf(n)));
  else cards = ALL.filter((n) => set.has(onesOf(n)) || set.has(tensOf(n)));
  return removed == null ? cards : cards.filter((n) => n !== removed);
}

// 0〜9 から k 個選ぶ組み合わせをすべて列挙する
function combinations(k, start = 0, acc = [], out = []) {
  if (acc.length === k) { out.push([...acc]); return out; }
  for (let d = start; d <= 9; d++) { acc.push(d); combinations(k, d + 1, acc, out); acc.pop(); }
  return out;
}

const randInt = (n) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
};

// 試合予定を作る。決め方は選ばれたものから同じ確率で選び、
// 同じ決め方の中では、組み合わせを使い切るまで同じものを出さない。
export function generateSchedule(count, methods) {
  const pools = {};
  const refill = (m) => { pools[m] = combinations(METHODS[m].pick); };
  methods.forEach(refill);
  const matches = [];
  for (let i = 0; i < count; i++) {
    const method = methods[randInt(methods.length)];
    if (pools[method].length === 0) refill(method);
    const digits = pools[method].splice(randInt(pools[method].length), 1)[0];
    let removed = null;
    if (method === "three") {
      const c = cardsFor(method, digits);
      removed = c[randInt(c.length)];
    }
    matches.push({ method, digits, removed, date: "" });
  }
  return matches;
}

// URL に入れる形: 1試合ずつ "o23578" / "t01469" / "x147-23"、日付は "_20261108" を後ろに付ける
export function encode(matches) {
  return matches.map((m) => {
    let s = METHODS[m.method].code + m.digits.join("");
    if (m.removed != null) s += "-" + m.removed;
    if (m.date) s += "_" + m.date.replaceAll("-", "");
    return s;
  }).join(".");
}

export function decode(str) {
  if (!str) return null;
  const out = [];
  for (const part of str.split(".")) {
    const mt = part.match(/^([otx])(\d{3}|\d{5})(?:-(\d{1,3}))?(?:_(\d{8}))?$/);
    if (!mt) return null;
    const method = BY_CODE[mt[1]];
    const digits = mt[2].split("").map(Number);
    if (digits.length !== METHODS[method].pick) return null;
    const removed = mt[3] ? Number(mt[3]) : null;
    const date = mt[4] ? `${mt[4].slice(0, 4)}-${mt[4].slice(4, 6)}-${mt[4].slice(6)}` : "";
    out.push({ method, digits, removed, date });
  }
  return out;
}

const KANJI = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export function kanjiNum(n) {
  if (n < 10) return KANJI[n];
  if (n >= 100) return String(n);
  const t = Math.floor(n / 10), o = n % 10;
  return (t === 1 ? "" : KANJI[t]) + "十" + KANJI[o];
}

export { combinations };
