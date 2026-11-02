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

// 次の試合で、前の試合と重ねたい札の枚数（50枚のうち4割）
export const KEEP = 20;
// 重なりが KEEP からこの枚数までのずれなら「合っている」とみなす
const TOLERANCE = 2;

const COMBOS = Object.fromEntries(Object.keys(METHODS).map((m) => [m, combinations(METHODS[m].pick)]));
const pickOne = (arr) => arr[randInt(arr.length)];

// ある決め方で、前の試合の札（prev。最初の試合は null）との重なりが KEEP 枚に
// いちばん近くなる数字の組み合わせを、使用回数の少ないものから返す。
// 「3つの数字」は除く1枚で重なりを1枚だけ調整できる。
function bestFor(method, prev, used) {
  let bestDev = Infinity;
  let opts = [];
  for (const digits of COMBOS[method]) {
    const base = cardsFor(method, digits);
    let dev = 0, removable = null;
    if (prev) {
      const inter = base.filter((n) => prev.has(n));
      let overlap = inter.length;
      if (method === "three") {
        // 重なりが多すぎれば重なっている札を、足りなければ重なっていない札を除く
        const out = base.filter((n) => !prev.has(n));
        removable = overlap > KEEP || out.length === 0 ? inter : out;
        if (removable === inter) overlap -= 1;
      }
      dev = Math.abs(overlap - KEEP);
    } else if (method === "three") {
      removable = base;
    }
    if (dev < bestDev) { bestDev = dev; opts = []; }
    if (dev === bestDev) opts.push({ digits, removable });
  }
  const uses = (o) => used.get(method + o.digits.join("")) ?? 0;
  const least = Math.min(...opts.map(uses));
  return { dev: bestDev, opts: opts.filter((o) => uses(o) === least) };
}

// 試合予定を作る。
// ・2試合目以降は、前の試合の札から KEEP 枚（4割）、それ以外から残り（6割）になるよう
//   数字の組み合わせを選ぶ。重なりをその枚数にできる決め方があれば、その中から選ぶ。
// ・決め方は、その条件を満たすもののうちから同じ確率で選ぶ。
// ・同じ組み合わせは、条件を満たす未使用の組み合わせがある限り出さない。
export function generateSchedule(count, methods) {
  const used = new Map();
  const matches = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    const cand = methods.map((m) => ({ m, ...bestFor(m, prev, used) }));
    const bestDev = Math.min(...cand.map((c) => c.dev));
    const ok = cand.filter((c) => c.dev <= Math.max(TOLERANCE, bestDev));
    const { m: method, opts } = pickOne(ok);
    const o = pickOne(opts);
    const removed = o.removable ? pickOne(o.removable) : null;
    const k = method + o.digits.join("");
    used.set(k, (used.get(k) ?? 0) + 1);
    matches.push({ method, digits: o.digits, removed, date: "" });
    prev = new Set(cardsFor(method, o.digits, removed));
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
