import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  questionPool,
  checkAnswer,
  scoreAnswer,
  backup,
  parseBackup,
  isAudioShortcut,
  AudioPlayer,
  audioTexts,
} from "../public/core.js";
import { validateContent, audioManifest, loadContent } from "../tools/lib.mjs";
import { fixture } from "./fixture.mjs";
test("rule filter narrows exercises without losing prerequisite knowledge", () => {
  const c = fixture(), s = freshState();
  s.filters.rule = "rule-a";
  assert.deepEqual(questionPool(c, s.filters, s).map(q => q.id), ["q-choice", "q-order"]);
  s.filters.lesson = "lesson-c";
  assert.deepEqual(questionPool(c, s.filters, s).map(q => q.id), ["q-order"]);
});
test("shipping content validates and never includes artificial fixtures", async () => {
  const c = validateContent(await loadContent());
  assert.equal(c.course.sections.length, 82);
  assert.equal(c.course.groups.length, 10);
  assert(c.lessons.every((l) => !l.title.startsWith("TEST")));
});
test("later selected lesson retains earlier knowledge without adding skipped/future lesson", () => {
  const c = validateContent(fixture()),
    s = freshState();
  s.filters.lesson = "lesson-c";
  assert.deepEqual(
    questionPool(c, s.filters, s).map((q) => q.id),
    ["q-order"],
  );
  c.learned = ["lesson-c"];
  assert.deepEqual(questionPool(c, s.filters, s), []);
});
test("publishing an unlearned rule or missing dependency fails", () => {
  const c = fixture();
  c.lessons[2].questions[0].requires = ["word-future"];
  assert.throws(() => validateContent(c), /Unlearned/);
  c.lessons[2].questions[0].requires = ["missing"];
  assert.throws(() => validateContent(c), /Unknown/);
});
test("correct answers and explicit alternate orders; no implicit permissive reorder", () => {
  const c = fixture();
  assert.equal(checkAnswer(c.lessons[0].questions[0], "a"), true);
  assert.equal(checkAnswer(c.lessons[0].questions[0], "b"), false);
  const q = c.lessons[2].questions[0];
  assert.equal(checkAnswer(q, [1, 0]), false);
  q.accepted.push([1, 0]);
  assert.equal(checkAnswer(q, [1, 0]), true);
  assert.equal(checkAnswer(q, [0, 0]), false);
});
test("backup round trip preserves IDs absent from current corpus and rejects malformed payloads", () => {
  const s = freshState();
  s.words["retained-old-id"] = "known";
  scoreAnswer(s, "order", true);
  assert.deepEqual(parseBackup(JSON.stringify(backup(s))), s);
  assert.throws(() => parseBackup('{"app":"other"}'));
  const bad = backup(s);
  bad.state.words["retained-old-id"] = "bogus";
  assert.throws(() => parseBackup(JSON.stringify(bad)));
  const unsafe = JSON.parse(JSON.stringify(backup(s)));
  unsafe.state.scores = JSON.parse('{"__proto__":{"streak":0,"best":0}}');
  assert.throws(() => parseBackup(JSON.stringify(unsafe)));
});
test("word decks move from new to known and review, best survives wrong answer", () => {
  const c = fixture(),
    s = freshState();
  s.filters.topic = "vocabulary";
  s.filters.deck = "new";
  assert.equal(questionPool(c, s.filters, s).length, 1);
  s.words["word-a"] = "known";
  assert.equal(questionPool(c, s.filters, s).length, 0);
  s.filters.deck = "review";
  assert.equal(questionPool(c, s.filters, s).length, 1);
  scoreAnswer(s, "order", true);
  scoreAnswer(s, "order", false);
  assert.deepEqual(s.scores.order, { streak: 0, best: 1 });
});
test("S shortcut works after reveal including focused button, never edits/save shortcuts", () => {
  assert.equal(
    isAudioShortcut({ key: "s", target: { tagName: "BUTTON" } }, true),
    true,
  );
  assert.equal(isAudioShortcut({ key: "S" }, true), true);
  for (const event of [
    { key: "s", ctrlKey: true },
    { key: "s", altKey: true },
    { key: "s", metaKey: true },
    { key: "s", repeat: true },
    { key: "s", target: { tagName: "INPUT" } },
    { key: "s", target: { isContentEditable: true } },
  ])
    assert.equal(isAudioShortcut(event, true), false);
  assert.equal(isAudioShortcut({ key: "s" }, false), false);
});
test("whole-sentence playback stops previous audio and replay restarts", async () => {
  const clips = [];
  const p = new AudioPlayer(
    [
      { text: "학생", file: "a.mp3" },
      { text: "저는 학생입니다.", file: "b.mp3" },
    ],
    (url) => {
      const a = {
        url,
        currentTime: 4,
        stopped: false,
        play: async () => {},
        pause() {
          this.stopped = true;
        },
      };
      clips.push(a);
      return a;
    },
  );
  await p.play("학생");
  await p.play("저는 학생입니다.");
  assert.equal(clips[0].stopped, true);
  assert.equal(clips[0].currentTime, 0);
  assert.equal(clips[1].url, "b.mp3");
  await p.play("저는 학생입니다.");
  assert.equal(clips[1].stopped, true);
  p.stop();
  assert.equal(clips[2].stopped, true);
  assert.equal(await p.play("missing"), false);
});
test("audio manifest deduplicates and keys change with voice/rate; future content absent", () => {
  const c = fixture();
  const a = audioManifest(c);
  assert.equal(a.length, 2);
  assert(!a.some((x) => x.text === "학교"));
  c.config.rate = "0%";
  assert.notEqual(audioManifest(c)[0].file, a[0].file);
  assert.deepEqual(audioTexts([]), []);
});
test("blank or answer-revealing prompt audio fails publication", () => {
  const c = fixture();
  c.lessons[0].questions[0].promptAudio = "저는 학생입니다.";
  assert.throws(() => validateContent(c), /visible complete prompt/);
});
