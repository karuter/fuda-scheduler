import { METHODS, cardsFor, generateSchedule, encode, decode, kanjiNum } from "./logic.js";
import { poem, firstPhrase } from "./poems.js";

const $ = (s) => document.querySelector(s);
let matches = null;

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
};

function saveToUrl() {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("p", encode(matches));
  history.replaceState(null, "", url);
}

function showCreate() {
  $("#create").hidden = false;
  $("#schedule").hidden = true;
  $("#subtitle").textContent = "試合で使う五十枚を、先に決めておく";
}

function showSchedule() {
  $("#create").hidden = true;
  $("#schedule").hidden = false;
  $("#subtitle").textContent = `全${matches.length}試合`;
  render();
}

function render() {
  const ol = $("#matches");
  ol.innerHTML = "";
  matches.forEach((m, i) => {
    const li = document.createElement("li");
    li.className = "match";
    const cards = cardsFor(m.method, m.digits, m.removed);
    li.innerHTML = `
      <div class="mhead">
        <b>第${kanjiNum(i + 1)}試合</b>
        <label class="date${m.date ? "" : " empty"}"><span class="date-text">${fmtDate(m.date) || "日付を入れる"}</span>
          <input type="date" value="${m.date}" aria-label="第${i + 1}試合の日付"></label>
      </div>
      <div class="rule">
        <span class="mlabel">${METHODS[m.method].label}</span>
        <span class="digits">${m.digits.map((d) => `<i>${d}</i>`).join("")}</span>
      </div>
      ${m.removed != null ? `<p class="removed">除く札：<b>${m.removed}</b> ${firstPhrase(m.removed)}</p>` : ""}
      <details>
        <summary>札を見る（${cards.length}枚）</summary>
        <div class="cards">
          ${cards.map((n) => `<button class="fuda" data-n="${n}"><span class="n">${n}</span><span class="k">${firstPhrase(n)}</span></button>`).join("")}
        </div>
      </details>
      <p class="print-list">${cards.join("・")}</p>`;
    const input = li.querySelector("input[type=date]");
    input.addEventListener("change", () => {
      m.date = input.value;
      li.querySelector(".date-text").textContent = fmtDate(m.date) || "日付を入れる";
      li.querySelector(".date").classList.toggle("empty", !m.date);
      saveToUrl();
    });
    ol.appendChild(li);
  });
}

$("#generate").addEventListener("click", () => {
  const count = Number($("#count").value);
  const methods = [...document.querySelectorAll("input[name=method]:checked")].map((c) => c.value);
  const err = $("#error");
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    err.textContent = "試合数は1〜200で入れてください";
    err.hidden = false;
    return;
  }
  if (methods.length === 0) {
    err.textContent = "決め方を1つ以上選んでください";
    err.hidden = false;
    return;
  }
  err.hidden = true;
  matches = generateSchedule(count, methods);
  saveToUrl();
  showSchedule();
  window.scrollTo(0, 0);
});

$("#remake").addEventListener("click", () => {
  if (!confirm("いまの予定を消して、新しく作り直しますか？\n（共有済みのリンクは、そのまま残ります）")) return;
  history.replaceState(null, "", location.pathname);
  matches = null;
  showCreate();
});

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  setTimeout(() => (t.hidden = true), 2500);
}

$("#share").addEventListener("click", async () => {
  const url = location.href;
  if (navigator.share) {
    try { await navigator.share({ title: "かるた部 札決め", url }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("リンクをコピーしました");
  } catch {
    prompt("このリンクをコピーしてください", url);
  }
});

$("#print").addEventListener("click", () => window.print());

$("#matches").addEventListener("click", (e) => {
  const f = e.target.closest(".fuda");
  if (!f) return;
  const n = Number(f.dataset.n);
  const dlg = $("#poem");
  dlg.querySelector(".pnum").textContent = `${n}番`;
  dlg.querySelector(".ptext").textContent = poem(n);
  dlg.showModal();
});
$("#poem").addEventListener("click", (e) => { if (e.target.id === "poem") e.target.close(); });

// 起動時：URL に予定があれば一覧を出す
const loaded = decode(new URLSearchParams(location.search).get("p"));
if (loaded) { matches = loaded; showSchedule(); } else { showCreate(); }
