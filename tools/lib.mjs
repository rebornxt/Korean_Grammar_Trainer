import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { audioTexts, TOPICS } from "../public/core.js";
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const hash = (x) => createHash("sha256").update(x).digest("hex");
export const readJSON = async (p) => JSON.parse(await readFile(p, "utf8"));
export async function loadContent(root = ROOT) {
  const dir = resolve(root, "content");
  const course = await readJSON(resolve(dir, "course.json"));
  const progress = await readJSON(resolve(dir, "progress.json"));
  const config = await readJSON(resolve(dir, "audio-config.json"));
  const files = (await readdir(resolve(dir, "lessons")))
    .filter((x) => x.endsWith(".json"))
    .sort();
  const lessons = await Promise.all(
    files.map((f) => readJSON(resolve(dir, "lessons", f))),
  );
  return { course, learned: progress.learned, lessons, config };
}
const insist = (v, msg) => {
  if (!v) throw Error(msg);
};
const str = (x) => typeof x === "string" && x.trim().length > 0;
const ko = (x) => str(x) && /[가-힣]/.test(x) && !/[ก-๙]/.test(x);
const id = (x) =>
  str(x) &&
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(x) &&
  !["__proto__", "constructor", "prototype"].includes(x);
function source(s) {
  insist(s && str(s.label), "Source label required");
  const u = new URL(s.url);
  insist(u.protocol === "https:", "Source URL must be HTTPS");
}
export function validateContent(c) {
  insist(
    Array.isArray(c.learned) && new Set(c.learned).size === c.learned.length,
    "Learned IDs must be a unique array",
  );
  insist(
    /^ko-KR-[\w]+$/.test(c.config.voice) &&
      /^-?\d{1,2}%$/.test(c.config.rate) &&
      c.config.format === "audio-24khz-48kbitrate-mono-mp3" &&
      typeof c.config.approved === "boolean",
    "Invalid Korean audio config",
  );
  const ids = new Set(),
    knowledge = new Map(),
    wordMap = new Map();
  const add = (x) => {
    insist(id(x) && !ids.has(x), `Duplicate or unsafe ID: ${x}`);
    ids.add(x);
  };
  for (const l of c.lessons) {
    add(l.id);
    insist(
      str(l.title) && c.course.sections.some((s) => s.id === l.sectionId),
      "Invalid lesson section/title",
    );
    source(l.source);
    insist(["draft", "ready"].includes(l.status), "Invalid lesson status");
    for (const k of ["words", "rules", "questions"])
      insist(Array.isArray(l[k]), `${l.id}: ${k} must be an array`);
    for (const w of l.words) {
      add(w.id);
      insist(ko(w.ko) && str(w.th), "Word needs Korean and Thai");
      wordMap.set(w.id, w);
      knowledge.set(w.id, l.id);
    }
    for (const r of l.rules) {
      add(r.id);
      insist(
        TOPICS[r.topic] &&
          str(r.title) &&
          str(r.explanation) &&
          Array.isArray(r.examples),
        "Invalid rule",
      );
      if (r.source) source(r.source);
      for (const e of r.examples)
        insist(ko(e.ko) && str(e.th), "Example needs Korean and Thai");
      knowledge.set(r.id, l.id);
    }
    for (const q of l.questions) add(q.id);
  }
  for (const x of c.learned)
    insist(
      c.lessons.some((l) => l.id === x),
      `Learned lesson missing: ${x}`,
    );
  const published = new Set(
    c.lessons
      .filter((l) => l.status === "ready" && c.learned.includes(l.id))
      .map((l) => l.id),
  );
  for (const l of c.lessons) {
    if (l.status === "ready") {
      insist(
        c.learned.includes(l.id),
        `${l.id}: cannot publish unlearned lesson`,
      );
      insist(l.questions.length > 0, `${l.id}: ready lesson has no questions`);
    }
    const refs = (ids) => {
      insist(Array.isArray(ids), "References must be an array");
      for (const r of ids) {
        insist(knowledge.has(r), `Unknown knowledge: ${r}`);
        if (l.status === "ready")
          insist(
            published.has(knowledge.get(r)),
            `Unlearned/draft dependency: ${r}`,
          );
      }
    };
    for (const r of l.rules)
      for (const e of r.examples) {
        refs(e.wordIds || []);
        for (const x of e.wordIds || [])
          insist(wordMap.has(x), "Example wordIds must reference words");
      }
    for (const q of l.questions) {
      insist(
        ["choice", "order", "recall"].includes(q.type) &&
          TOPICS[q.topic] &&
          str(q.prompt) &&
          str(q.explanation) &&
          ko(q.answerText),
        `${q.id}: invalid question`,
      );
      if (q.source) source(q.source);
      refs(q.requires || []);
      refs(q.wordIds || []);
      for (const x of q.wordIds || [])
        insist(wordMap.has(x), "wordIds must reference words");
      if (q.promptAudio)
        insist(
          q.promptAudio === q.prompt &&
            ko(q.promptAudio) &&
            !/[＿_□]/.test(q.promptAudio),
          `${q.id}: prompt audio must be the visible complete prompt`,
        );
      if (q.type === "choice") {
        insist(
          Array.isArray(q.options) && q.options.length >= 2,
          "Need at least two choices",
        );
        insist(
          new Set(q.options.map((o) => o.id)).size === q.options.length &&
            new Set(q.options.map((o) => o.text)).size === q.options.length,
          "Duplicate choices",
        );
        insist(
          q.options.every((o) => id(o.id) && str(o.text)) &&
            q.options.some((o) => o.id === q.answer),
          "Invalid choice answer",
        );
      }
      if (q.type === "order") {
        insist(
          Array.isArray(q.chunks) &&
            q.chunks.length >= 2 &&
            q.chunks.every(str) &&
            Array.isArray(q.accepted) &&
            q.accepted.length > 0,
          "Invalid chunks",
        );
        for (const a of q.accepted)
          insist(
            Array.isArray(a) &&
              a.length === q.chunks.length &&
              new Set(a).size === a.length &&
              a.every(
                (i) => Number.isInteger(i) && i >= 0 && i < q.chunks.length,
              ),
            "Accepted order must contain each chunk once",
          );
        insist(!q.promptAudio, "Order prompts cannot play the answer");
        insist(
          q.accepted[0].map((i) => q.chunks[i]).join(" ") === q.answerText,
          "Canonical chunks must equal spoken answer",
        );
      }
      if (q.type === "recall") {
        refs([q.wordId]);
        insist(
          wordMap.get(q.wordId)?.ko === q.answerText &&
            q.topic === "vocabulary",
          "Recall needs its word and vocabulary topic",
        );
        insist(!q.promptAudio, "Recall prompt must not reveal the answer");
      }
    }
  }
  return c;
}
export function audioManifest(c, all = false) {
  const lessons = c.lessons.filter(
    (l) => all || (l.status === "ready" && c.learned.includes(l.id)),
  );
  return audioTexts(lessons).map((text) => ({
    text,
    file: `audio/${hash(JSON.stringify([text.normalize("NFC"), c.config.voice, c.config.rate, c.config.format]))}.mp3`,
  }));
}
