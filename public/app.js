import { catalog } from "./catalog.js";
import {
  STORAGE_KEY,
  TOPICS,
  freshState,
  validateState,
  backup,
  parseBackup,
  availableLessons,
  questionPool,
  checkAnswer,
  scoreAnswer,
  shuffle,
  isAudioShortcut,
  AudioPlayer,
} from "./core.js";
const $ = (s) => document.querySelector(s);
const node = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const child of children.flat(Infinity))
    if (child !== null && child !== undefined)
      e.append(child.nodeType ? child : document.createTextNode(String(child)));
  return e;
};
const button = (text, fn, cls = "") =>
  node("button", { type: "button", class: cls, onclick: fn }, text);
let state = freshState(),
  q = null,
  revealed = false,
  answered = false,
  order = [],
  pendingImport = null;
let registration = null;
const player = new AudioPlayer(catalog.audio);
function notice(text) {
  $("#notice").textContent = text;
  $("#notice").hidden = !text;
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = validateState(JSON.parse(saved));
} catch {
  notice("อ่านผลที่บันทึกไว้ไม่ได้ ใช้แอพต่อได้ แต่ควรเก็บไฟล์สำรองไว้");
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    notice("บันทึกผลในเครื่องไม่ได้ กรุณาสำรองผลก่อนปิดหน้านี้");
  }
}
function stop() {
  player.stop();
}
async function play(text) {
  try {
    if (!(await player.play(text))) notice("เสียงนี้ยังไม่พร้อมใช้งาน");
  } catch (e) {
    notice(e.message);
  }
}
function speech(text) {
  return player.has(text)
    ? node(
        "button",
        {
          type: "button",
          class: "speak-text",
          lang: "ko",
          "aria-label": `ฟัง ${text}`,
          onclick: () => play(text),
        },
        text,
      )
    : node("span", { lang: "ko" }, text);
}
function wordAudio(ids = []) {
  const all = availableLessons(catalog).flatMap((l) => l.words || []);
  return node(
    "div",
    { class: "word-audio" },
    ids
      .map((id) => all.find((w) => w.id === id))
      .filter(Boolean)
      .map((w) => speech(w.ko)),
  );
}
function source(s) {
  return node(
    "a",
    {
      class: "source",
      href: s.url,
      target: "_blank",
      rel: "noopener noreferrer",
    },
    `${s.label}${s.locator ? " · " + s.locator : ""}`,
  );
}
function view(name) {
  stop();
  q = null;
  state.view = name;
  save();
  render();
}
function render() {
  document.body.dataset.view = state.view;
  document.querySelectorAll("nav button").forEach((b) => {
    if (b.dataset.view === state.view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#view").replaceChildren();
  if (state.view === "lessons") renderLessons();
  else renderLearning();
}
function empty(title = "ยังไม่มีเนื้อหาสำหรับฝึก") {
  return node(
    "div",
    { class: "empty-plain" },
    node("h2", {}, title),
    node(
      "p",
      {},
      "เมื่อเรียนจบแล้ว แจ้งชื่อ Section และ Lecture เพื่อเพิ่มคำศัพท์ แบบฝึก คำอธิบาย และเสียงของบทนั้น",
    ),
    button("ดูแผนที่บทเรียน", () => view("lessons")),
  );
}
function renderLessons() {
  const ready = availableLessons(catalog);
  const stats = node(
    "div",
    { class: "stats" },
    [
      [catalog.learned.length, "บทที่เรียนแล้ว"],
      [ready.length, "บทพร้อมทบทวน"],
      [ready.reduce((n, l) => n + (l.words || []).length, 0), "คำศัพท์ในคลัง"],
    ].map(([n, t]) =>
      node(
        "div",
        { class: "stat" },
        node("strong", {}, n),
        node("span", {}, t),
      ),
    ),
  );
  $("#view").append(stats);
  if (ready.length) {
    const list = node("div", { class: "ready-grid" });
    for (const l of ready) {
      const open = (target) => {
        state.filters.lesson = l.id;
        state.filters.topic = "all";
        state.filters.rule = "all";
        state.filters.deck = "all";
        view(target);
      };
      list.append(node("section", { class: "ready-card" },
        node("h2", {}, l.title),
        node("p", {}, `${l.questions.length} แบบฝึก · ${l.words.length} คำศัพท์`),
        node("div", { class: "actions" },
          button("ฝึกบทนี้", () => open("practice"), "primary"),
          button("อ่านทบทวน", () => open("review")))));
    }
    $("#view").append(list);
  }
  if (!ready.length)
    $("#view").append(
      node(
        "div",
        { class: "empty" },
        node("div", { class: "empty-icon", "aria-hidden": "true" }, "＋"),
        node(
          "div",
          {},
          node("h2", {}, "พื้นที่นี้จะค่อย ๆ เติบโตไปกับคุณ"),
          node(
            "p",
            {},
            "อ่านฮันกึลได้แล้ว เริ่มทบทวนจากบทที่คุณกำลังจะเรียน เมื่อเรียนจบค่อยเพิ่มเนื้อหา พร้อมคำอธิบายและเสียงให้กลับมาฝึกได้ทุกเมื่อ",
          ),
          node(
            "div",
            { class: "example" },
            "ลองแจ้งว่า “เรียน Section 5 ถึง Lecture 46 แล้ว”",
          ),
        ),
      ),
    );
  $("#view").append(
    node(
      "div",
      { class: "section-heading" },
      node("h2", {}, "แผนที่คอร์สของคุณ"),
      node(
        "small",
        {},
        `${catalog.course.groups.length} ส่วน · ${catalog.course.sections.length} sections · เริ่มนับการเรียนใหม่`,
      ),
    ),
  );
  for (const [i, g] of catalog.course.groups.entries()) {
    const details = node("details", { class: "course-group" });
    details.append(
      node(
        "summary",
        {},
        node("span", { class: "group-num" }, String(i + 1).padStart(2, "0")),
        node("span", { class: "group-name" }, g.title),
        node("span", { class: "group-meta" }, `Section ${g.from}–${g.to}`),
        node("span", { class: "chevron", "aria-hidden": "true" }, "›"),
      ),
    );
    const rows = node("div", { class: "course-sections" });
    for (const s of catalog.course.sections.filter(
      (s) => s.number >= g.from && s.number <= g.to,
    )) {
      const lessons = catalog.lessons.filter((l) => l.sectionId === s.id);
      const done = lessons.filter((l) => catalog.learned.includes(l.id));
      const available = ready.filter((l) => l.sectionId === s.id);
      const status = done.length
        ? `${done.length} บทเรียนแล้ว · ${available.length} พร้อม`
        : "ยังไม่ได้เรียน";
      rows.append(
        node(
          "div",
          { class: "course-row" },
          node("span", {}, `${s.number}. ${s.title}`),
          node("span", { class: "badge" }, status),
        ),
      );
      for (const l of lessons) {
        const isReady = ready.some((x) => x.id === l.id);
        const row = node(
          "div",
          { class: "lesson-row" },
          node("strong", {}, l.title),
          node(
            "span",
            { class: `badge ${isReady ? "ready" : ""}` },
            isReady
              ? "พร้อมทบทวน"
              : catalog.learned.includes(l.id)
                ? "เรียนแล้ว—รอเนื้อหา"
                : "ยังไม่ได้เรียน",
          ),
        );
        if (isReady)
          row.append(
            button("ฝึกบทนี้", () => {
              state.filters.lesson = l.id;
              state.filters.topic = "all";
              state.filters.rule = "all";
              state.filters.deck = "all";
              view("practice");
            }),
          );
        rows.append(row);
      }
    }
    details.append(rows);
    $("#view").append(details);
  }
  $("#view").append(
    node(
      "small",
      {},
      "แผนที่อ้างอิงชื่อส่วนของคอร์ส ณ 12 ก.ย. 2026 · สถานะราย section สรุปเฉพาะบทที่นำมาบันทึกในแอพ",
    ),
  );
}
function select(label, key, options) {
  const s = node(
    "select",
    {
      "aria-label": label,
      onchange: () => {
        stop();
        state.filters[key] = s.value;
        save();
        render();
      },
    },
    options.map(([value, text]) => node("option", { value }, text)),
  );
  s.value = state.filters[key];
  return node("label", {}, label, s);
}
function renderLearning() {
  const ready = availableLessons(catalog);
  if (!ready.length) {
    $("#view").append(
      empty(state.view === "review" ? "ยังไม่มีบทอ่านทบทวน" : undefined),
    );
    return;
  }
  const topics = [
    ...new Set(ready.flatMap((l) => l.questions.map((q) => q.topic))),
  ];
  if (!ready.some((l) => l.id === state.filters.lesson))
    state.filters.lesson = "all";
  if (!topics.includes(state.filters.topic)) state.filters.topic = "all";
  const rules = ready
    .flatMap((l) => l.rules)
    .filter(
      (r) => state.filters.topic === "all" || r.topic === state.filters.topic,
    );
  if (!rules.some((r) => r.id === state.filters.rule))
    state.filters.rule = "all";
  const filters = node(
    "div",
    { class: "filters" },
    select("บทเรียน", "lesson", [
      ["all", "ทุกบทที่พร้อมทบทวน"],
      ...ready.map((l) => [l.id, l.title]),
    ]),
    select("หัวข้อ", "topic", [
      ["all", "ทุกหัวข้อ"],
      ...topics.map((t) => [t, TOPICS[t] || t]),
    ]),
  );
  if (rules.length)
    filters.append(
      select("หัวข้อย่อย", "rule", [
        ["all", "ทุกกฎ"],
        ...rules.map((r) => [r.id, r.title]),
      ]),
    );
  if (state.view === "practice")
    filters.append(
      select("ชุดคำศัพท์", "deck", [
        ["all", "ทุกคำ"],
        ["new", "ใหม่"],
        ["known", "จำได้"],
        ["unknown", "ยังจำไม่ได้"],
        ["review", "เคยตอบแล้ว"],
      ]),
    );
  $("#view").append(filters);
  save();
  if (state.view === "review") {
    for (const l of ready.filter(
      (l) => state.filters.lesson === "all" || l.id === state.filters.lesson,
    )) {
      const section = node(
        "section",
        { class: "card" },
        node("h2", { class: "review-title" }, l.title),
      );
      for (const r of l.rules.filter(
        (r) =>
          (state.filters.topic === "all" || r.topic === state.filters.topic) &&
          (state.filters.rule === "all" || state.filters.rule === r.id),
      )) {
        section.append(node("h3", {}, r.title), node("p", {}, r.explanation));
        if (r.added)
          section.append(node("small", {}, "คำอธิบายเสริมจากผู้จัดทำ"));
        for (const e of r.examples || [])
          section.append(
            node(
              "div",
              { class: "example-block" },
              node("div", { class: "ko" }, speech(e.ko)),
              node("p", { class: "translation" }, e.th),
              wordAudio(e.wordIds),
            ),
          );
        section.append(source(r.source || l.source));
      }
      if (["all", "vocabulary"].includes(state.filters.topic))
        for (const w of l.words)
          section.append(
            node(
              "div",
              { class: "example-block" },
              node("div", { class: "ko" }, speech(w.ko)),
              node("p", {}, w.th),
            ),
          );
      if (section.children.length === 1) continue;
      section.append(source(l.source));
      $("#view").append(section);
    }
    return;
  }
  $("#view").append(node("div", { id: "exercise" }));
  next();
}
function next() {
  const previous = q?.id;
  stop();
  revealed = false;
  answered = false;
  order = [];
  const pool = questionPool(catalog, state.filters, state);
  q =
    shuffle(pool.filter((x) => pool.length === 1 || x.id !== previous))[0] ||
    null;
  if (!q) {
    $("#exercise").replaceChildren(empty("ไม่มีข้อฝึกในตัวกรองนี้"));
    return;
  }
  if (q.type === "order") q.displayOrder = shuffle(q.chunks.map((_, i) => i));
  drawQuestion();
}
function drawQuestion() {
  const root = $("#exercise");
  root.replaceChildren();
  const sc = state.scores[q.topic] || { streak: 0, best: 0 };
  const card = node(
    "section",
    { class: "card" },
    node(
      "div",
      { class: "section-heading" },
      node("p", { class: "cue" }, TOPICS[q.topic] || q.topic),
      node(
        "span",
        { class: "score" },
        `ต่อเนื่อง ${sc.streak} · สูงสุด ${sc.best}`,
      ),
    ),
    node(
      "p",
      { class: "cue" },
      q.type === "choice"
        ? "แตะเลือกคำตอบที่ถูกต้อง"
        : q.type === "order"
          ? "แตะชิ้นคำเพื่อเรียงประโยค · แตะคำที่เลือกเพื่อเอาออก"
          : "นึกคำตอบก่อน แล้วค่อยเปิดเฉลย",
    ),
    node("div", { class: "ko" }, q.promptAudio ? speech(q.prompt) : q.prompt),
    q.translation ? node("p", { class: "translation" }, q.translation) : null,
  );
  if (q.type === "choice") {
    const choices = node("div", { class: "choices" });
    for (const o of q.options) {
      const b = button(o.text, () => answer(o.id));
      b.disabled = answered;
      choices.append(b);
    }
    card.append(choices);
  }
  if (q.type === "order") {
    const zone = node("div", {
      class: "answer-zone",
      "aria-label": "ประโยคที่เรียงแล้ว",
    });
    if (!order.length)
      zone.append(node("small", {}, "ประโยคของคุณจะอยู่ตรงนี้"));
    order.forEach((idx, pos) => {
      const b = button(q.chunks[idx], () => {
        order.splice(pos, 1);
        drawQuestion();
      });
      b.disabled = answered;
      zone.append(b);
    });
    const chunks = node("div", { class: "chunks" });
    for (const idx of q.displayOrder || []) {
      const b = button(q.chunks[idx], () => {
        order.push(idx);
        drawQuestion();
      });
      b.disabled = answered || order.includes(idx);
      chunks.append(b);
    }
    card.append(zone, chunks);
    if (!answered) {
      const check = button("ตรวจคำตอบ", () => answer(order.slice()), "primary");
      check.disabled = order.length !== q.chunks.length;
      card.append(
        node(
          "div",
          { class: "actions" },
          check,
          button("เริ่มเรียงใหม่", () => {
            order = [];
            drawQuestion();
          }),
        ),
      );
    }
  }
  if (q.type === "recall" && !revealed)
    card.append(
      node(
        "div",
        { class: "actions" },
        button(
          "เปิดเฉลย",
          () => {
            revealed = true;
            drawQuestion();
          },
          "primary",
        ),
      ),
    );
  if (revealed) {
    const feedback = node(
      "div",
      { class: `feedback ${answered && q.result === false ? "wrong" : ""}` },
      node(
        "h3",
        {},
        answered
          ? q.result
            ? "จำได้อีกนิดแล้ว"
            : "ลองจำจากคำอธิบายนี้"
          : "คำตอบ",
      ),
      node("div", { class: "ko" }, speech(q.answerText)),
      wordAudio(q.wordIds),
      node("p", {}, q.explanation),
      source(q.source),
    );
    const actions = node("div", { class: "actions" });
    if (player.has(q.answerText))
      actions.append(button("ฟังเสียง · S", () => play(q.answerText)));
    if (q.type === "recall" && !answered)
      actions.append(
        button("จำได้", () => answer(true), "primary"),
        button("ยังจำไม่ได้", () => answer(false)),
      );
    if (answered) actions.append(button("ข้อต่อไป", next, "primary"));
    feedback.append(actions);
    card.append(feedback);
  }
  root.append(card);
}
function answer(value) {
  if (answered) return;
  answered = true;
  revealed = true;
  q.result = checkAnswer(q, value);
  scoreAnswer(state, q.topic, q.result);
  if (q.type === "recall")
    state.words[q.wordId] = q.result ? "known" : "unknown";
  save();
  drawQuestion();
}
document
  .querySelectorAll("nav button")
  .forEach((b) => (b.onclick = () => view(b.dataset.view)));
document.addEventListener("keydown", (e) => {
  if (
    state.view === "practice" &&
    q &&
    isAudioShortcut(e, revealed) &&
    !$("#import-dialog").open
  ) {
    e.preventDefault();
    play(q.answerText);
  }
});
$("#backup").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup(state), null, 2)], {
      type: "application/json",
    }),
  );
  const a = node("a", {
    href: url,
    download: `korean-review-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#restore").onclick = () => $("#backup-file").click();
$("#backup-file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 2_000_000) throw Error("ไฟล์สำรองมีขนาดใหญ่เกินไป");
    pendingImport = parseBackup(await f.text());
    $("#import-summary").textContent =
      `มีสถานะคำศัพท์ ${Object.keys(pendingImport.words).length} คำ`;
    stop();
    $("#import-dialog").showModal();
  } catch {
    notice(
      "นำเข้าไม่ได้: ไฟล์ไม่ใช่ข้อมูลสำรองที่ถูกต้องของแอพนี้ หรือมีขนาดใหญ่เกินไป",
    );
  }
  e.target.value = "";
};
$("#cancel-import").onclick = () => {
  $("#import-dialog").close();
  pendingImport = null;
};
$("#confirm-import").onclick = () => {
  if (pendingImport) {
    state = pendingImport;
    pendingImport = null;
    save();
    stop();
    $("#import-dialog").close();
    render();
    notice("นำเข้าผลทบทวนแล้ว");
  }
};
$("#import-dialog").addEventListener("cancel", () => (pendingImport = null));
$("#version").textContent = `รุ่น ${catalog.version} · ผลทบทวนเก็บในอุปกรณ์นี้`;
function offlineText(text) {
  $("#offline").textContent = text;
}
function askStatus() {
  registration?.active?.postMessage({ type: "STATUS" });
}
async function setupOffline() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    offlineText("ออฟไลน์ต้องเปิดผ่าน HTTPS หรือ localhost");
    return;
  }
  try {
    registration = await navigator.serviceWorker.register("./sw.js", {
      scope: "./",
      updateViaCache: "none",
    });
    if (registration.waiting) $("#update-box").hidden = false;
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      offlineText("กำลังดาวน์โหลดสำหรับออฟไลน์…");
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          if (registration.waiting && navigator.serviceWorker.controller)
            $("#update-box").hidden = false;
          askStatus();
        }
        if (worker.state === "redundant")
          offlineText("ดาวน์โหลดไม่ครบ ลองตรวจออฟไลน์อีกครั้ง");
      });
    });
    navigator.serviceWorker.ready.then(() => askStatus());
    askStatus();
  } catch {
    offlineText("ยังไม่พร้อมออฟไลน์ · ลองใหม่เมื่อออนไลน์");
  }
}
navigator.serviceWorker?.addEventListener("message", (e) => {
  if (e.data?.type === "STATUS") {
    offlineText(
      e.data.complete
        ? "พร้อมใช้ออฟไลน์ · รวมเสียง"
        : "ไฟล์ออฟไลน์ไม่ครบ · โปรดตรวจอัปเดต",
    );
  }
  if (e.data?.type === "INSTALL_FAILED")
    offlineText("ดาวน์โหลดไม่ครบ หรือพื้นที่ไม่พอ · ใช้รุ่นเดิมได้");
});
let updating = false;
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (updating) location.reload();
  else {
    askStatus();
    if (registration?.active)
      registration.active.postMessage({ type: "VERSION" });
  }
});
navigator.serviceWorker?.addEventListener("message", (e) => {
  if (e.data?.type === "VERSION" && e.data.version !== catalog.version) {
    $("#update-box").hidden = false;
  }
});
$("#update").onclick = () => {
  save();
  stop();
  updating = true;
  if (registration?.waiting)
    registration.waiting.postMessage({ type: "ACTIVATE" });
  else location.reload();
};
$("#retry-offline").onclick = async () => {
  if (!registration) {
    await setupOffline();
    return;
  }
  offlineText("กำลังตรวจไฟล์และรุ่นใหม่…");
  try {
    await registration.update();
    registration.active?.postMessage({ type: "REPAIR" });
  } catch {
    offlineText("ตรวจอัปเดตไม่ได้ · ลองใหม่เมื่อออนไลน์");
  }
};
window.addEventListener("online", askStatus);
window.addEventListener("offline", askStatus);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
  else askStatus();
});
render();
setupOffline();
