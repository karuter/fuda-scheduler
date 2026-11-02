// 全パターンで50枚になること、URL変換が往復で一致することを確かめる
import assert from "node:assert/strict";
import { cardsFor, combinations, generateSchedule, encode, decode } from "../js/logic.js";
import { POEMS } from "../js/poems.js";

assert.equal(POEMS.length, 100);
const five = combinations(5), three = combinations(3);
assert.equal(five.length * 2, 504);
assert.equal(three.length, 120);
for (const d of five) {
  assert.equal(cardsFor("ones", d).length, 50);
  assert.equal(cardsFor("tens", d).length, 50);
}
for (const d of three) {
  const c = cardsFor("three", d);
  assert.equal(c.length, 51, `three ${d}`);
  assert.equal(cardsFor("three", d, c[0]).length, 50);
}
// 1の位で0を選ぶと 10,20,…,100、10の位で0を選ぶと 1〜9と100
assert.deepEqual(cardsFor("ones", [0]), [10,20,30,40,50,60,70,80,90,100]);
assert.deepEqual(cardsFor("tens", [0]), [1,2,3,4,5,6,7,8,9,100]);

// 前の試合との重なりを数える
const overlap = (a, b) => {
  const set = new Set(cardsFor(a.method, a.digits, a.removed));
  return cardsFor(b.method, b.digits, b.removed).filter((n) => set.has(n)).length;
};

// 同じ決め方だけなら、毎回ちょうど20枚が前の試合と重なる
for (const m of ["ones", "tens"]) {
  const s = generateSchedule(60, [m]);
  for (let i = 1; i < s.length; i++) assert.equal(overlap(s[i - 1], s[i]), 20, `${m} #${i}`);
  assert.equal(new Set(s.map((x) => x.digits.join(""))).size, 60, `${m} 重複なし`);
}

// 3つ全部を混ぜても、重なりは20枚前後（前後2枚以内）に収まる。全試合で50枚
const mix = generateSchedule(200, ["ones", "tens", "three"]);
const ov = [];
for (let i = 1; i < mix.length; i++) {
  assert.equal(cardsFor(mix[i].method, mix[i].digits, mix[i].removed).length, 50);
  ov.push(overlap(mix[i - 1], mix[i]));
}
assert.ok(ov.every((x) => Math.abs(x - 20) <= 2), `重なり ${[...new Set(ov)].sort()}`);
assert.ok(new Set(mix.map((x) => x.method)).size === 3, "3つの決め方が全部出る");
// 3つの数字だけでも50枚で、重なりは20枚に近い
const th = generateSchedule(100, ["three"]);
for (let i = 1; i < th.length; i++) assert.ok(Math.abs(overlap(th[i - 1], th[i]) - 20) <= 3);

const sched = generateSchedule(30, ["ones", "tens", "three"]);
sched[0].date = "2026-11-08";
assert.deepEqual(decode(encode(sched)), sched);
console.log("OK", encode(sched).length, "chars for 30 matches");
