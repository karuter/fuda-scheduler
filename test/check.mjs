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

// 252試合作ると、1の位だけなら全組み合わせが1回ずつ出る
const s = generateSchedule(252, ["ones"]);
assert.equal(new Set(s.map((m) => m.digits.join(""))).size, 252);

const sched = generateSchedule(30, ["ones", "tens", "three"]);
sched[0].date = "2026-11-08";
assert.deepEqual(decode(encode(sched)), sched);
console.log("OK", encode(sched).length, "chars for 30 matches");
