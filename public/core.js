// Pure learning/state logic. Shared by the UI and tests; no network or storage.
export const STORAGE_KEY = "hangeul-om.state.v1";
export const TOPICS = {
  pronouns: "คำสรรพนาม",
  particles: "คำช่วย",
  endings: "การผันและคำลงท้าย",
  order: "เรียงประโยค",
  numbers: "ตัวเลขและลักษณนาม",
  vocabulary: "คำศัพท์",
  conversation: "บทสนทนา",
};
export function freshState() {
  return {
    schemaVersion: 1,
    view: "lessons",
    filters: { lesson: "all", topic: "all", rule: "all", deck: "all" },
    scores: {},
    words: {},
  };
}
const record = (x) =>
  x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.getPrototypeOf(x) === Object.prototype;
const safeKey = (s) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(s) &&
  !["constructor", "prototype", "__proto__"].includes(s);
export function validateState(s) {
  if (
    !record(s) ||
    s.schemaVersion !== 1 ||
    !["lessons", "practice", "conjugator", "review"].includes(s.view) ||
    !record(s.filters) ||
    !record(s.scores) ||
    !record(s.words)
  )
    throw Error("รูปแบบไฟล์สำรองไม่รองรับ");
  for (const key of ["lesson", "topic", "deck"])
    if (!safeKey(s.filters[key])) throw Error("ตัวกรองในไฟล์ไม่ถูกต้อง");
  if (s.filters.rule !== undefined && !safeKey(s.filters.rule))
    throw Error("ตัวกรองกฎไม่ถูกต้อง");
  if (!["all", "new", "known", "unknown", "review"].includes(s.filters.deck))
    throw Error("ชุดคำศัพท์ไม่ถูกต้อง");
  for (const [k, v] of Object.entries(s.scores))
    if (
      !safeKey(k) ||
      !record(v) ||
      !Number.isSafeInteger(v.streak) ||
      !Number.isSafeInteger(v.best) ||
      v.streak < 0 ||
      v.best < v.streak
    )
      throw Error("คะแนนในไฟล์ไม่ถูกต้อง");
  for (const [k, v] of Object.entries(s.words))
    if (!safeKey(k) || !["known", "unknown"].includes(v))
      throw Error("สถานะคำศัพท์ไม่ถูกต้อง");
  return {
    schemaVersion: 1,
    view: s.view,
    filters: {
      lesson: s.filters.lesson,
      topic: s.filters.topic,
      deck: s.filters.deck,
      rule: s.filters.rule || "all",
    },
    scores: Object.fromEntries(
      Object.entries(s.scores).map(([k, v]) => [
        k,
        { streak: v.streak, best: v.best },
      ]),
    ),
    words: { ...s.words },
  };
}
export function backup(state) {
  return {
    app: "hangeul-om",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    state: validateState(state),
  };
}
export function parseBackup(text) {
  if (text.length > 2_000_000) throw Error("ไฟล์สำรองมีขนาดใหญ่เกินไป");
  const b = JSON.parse(text);
  if (b.app !== "hangeul-om" || b.schemaVersion !== 1)
    throw Error("ไฟล์นี้ไม่ใช่ข้อมูลสำรองของแอพเกาหลี");
  return validateState(b.state);
}
export function scoreAnswer(state, topic, ok) {
  const old = state.scores[topic] || { streak: 0, best: 0 };
  const streak = ok ? old.streak + 1 : 0;
  state.scores[topic] = { streak, best: Math.max(old.best, streak) };
}
export function availableLessons(c) {
  return c.lessons.filter(
    (l) => c.learned.includes(l.id) && l.status === "ready",
  );
}
export function availableKnowledge(c) {
  return new Set(
    availableLessons(c).flatMap((l) =>
      [...(l.rules || []), ...(l.words || [])].map((x) => x.id),
    ),
  );
}
export function questionPool(c, f, state) {
  const knowledge = availableKnowledge(c);
  return availableLessons(c)
    .filter((l) => f.lesson === "all" || l.id === f.lesson)
    .flatMap((l) =>
      (l.questions || []).map((q) => ({
        ...q,
        lessonId: l.id,
        source: q.source || l.source,
      })),
    )
    .filter(
      (q) =>
        (f.topic === "all" || q.topic === f.topic) &&
        (!f.rule || f.rule === "all" || (q.requires || []).includes(f.rule)) &&
        (q.requires || []).every((id) => knowledge.has(id)),
    )
    .filter((q) => {
      if (q.type !== "recall" || f.deck === "all") return true;
      const s = state.words[q.wordId];
      return f.deck === "new" ? !s : f.deck === "review" ? !!s : s === f.deck;
    });
}
export function checkAnswer(q, answer) {
  if (q.type === "choice") return answer === q.answer;
  if (q.type === "order")
    return q.accepted.some(
      (a) => a.length === answer.length && a.every((x, i) => x === answer[i]),
    );
  return Boolean(answer);
}
export function shuffle(a, random = Math.random) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function isAudioShortcut(event, revealed) {
  const target = event.target;
  return (
    revealed &&
    ["s", "S"].includes(event.key) &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.repeat &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) &&
    !target?.isContentEditable
  );
}
export function audioTexts(lessons) {
  const result = new Set();
  for (const l of lessons) {
    for (const w of l.words || []) result.add(w.ko);
    for (const r of l.rules || [])
      for (const e of r.examples || []) {
        result.add(e.ko);
      }
    for (const q of l.questions || []) {
      result.add(q.answerText);
      if (q.promptAudio) result.add(q.promptAudio);
    }
  }
  return [...result].filter(Boolean).sort();
}
export class AudioPlayer {
  constructor(manifest, createAudio = (url) => new Audio(url)) {
    this.clips = new Map(manifest.map((x) => [x.text, x.file]));
    this.createAudio = createAudio;
    this.current = null;
    this.serial = 0;
  }
  has(text) {
    return this.clips.has(text);
  }
  stop() {
    this.serial++;
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
  }
  async play(text) {
    this.stop();
    const file = this.clips.get(text);
    if (!file) return false;
    const serial = this.serial;
    const clip = this.createAudio(file);
    this.current = clip;
    try {
      await clip.play();
      return true;
    } catch (e) {
      if (serial !== this.serial) return true;
      this.current = null;
      throw Error(
        "ยังเล่นเสียงนี้ไม่ได้ ลองเชื่อมต่ออินเทอร์เน็ตเพื่อดาวน์โหลดให้ครบ",
      );
    }
  }
}
