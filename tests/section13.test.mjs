import { test } from "node:test";
import assert from "node:assert/strict";
import { loadContent, validateContent } from "../tools/lib.mjs";
import { questionPool, freshState } from "../public/core.js";
import { conjugationEntries } from "../public/conjugator.js";

test("Section 13 publishes both sentence-formulation lessons with every drill type", async () => {
  const catalog = validateContent(await loadContent());
  const units = catalog.lessons.filter((lesson) => lesson.sectionId === "section-13");
  assert.deepEqual(units.map((lesson) => lesson.id), [
    "s13-sentence-ayo",
    "s13-sentence-eoyo",
  ]);

  for (const lesson of units) {
    assert.equal(lesson.status, "ready");
    assert(catalog.learned.includes(lesson.id));
    assert(lesson.questions.some((question) => question.type === "recall"));
    assert(lesson.questions.some((question) => question.type === "choice"));
    assert(lesson.questions.some((question) => question.type === "order"));
    assert(lesson.questions.every((question) => !question.promptAudio));
    const state = freshState();
    state.filters.lesson = lesson.id;
    assert.equal(questionPool(catalog, state.filters, state).length, lesson.questions.length);
  }

  assert.equal(units.flatMap((lesson) => lesson.words).length, 57);
  assert.equal(units.flatMap((lesson) => lesson.questions).length, 155);
  assert.equal(units.flatMap((lesson) => lesson.questions).filter((q) => q.added).length, 12);
});

test("Section 13 conjugations and source sentences stay explicit", async () => {
  const catalog = validateContent(await loadContent());
  const units = catalog.lessons.filter((lesson) => lesson.sectionId === "section-13");
  const questions = units.flatMap((lesson) => lesson.questions);
  const forms = new Map(
    conjugationEntries(catalog).map((entry) => [
      entry.dictionary,
      entry.forms.find((form) => form.id === "polite")?.answer,
    ]),
  );

  for (const [dictionary, polite] of [
    ["사다", "사요"], ["타다", "타요"], ["닫다", "닫아요"],
    ["차다", "차요"], ["물어보다", "물어봐요"], ["열다", "열어요"],
    ["찍다", "찍어요"], ["재다", "재요"], ["펴다", "펴요"],
  ]) assert.equal(forms.get(dictionary), polite);

  for (const answer of [
    "저는 친구를 만나요.", "손님은 가격을 물어봐요.",
    "학생들은 빵을 먹어요.", "저는 중국어를 배워요.",
  ]) assert(questions.some((question) => question.answerText === answer));

  const order = questions.filter((question) => question.type === "order");
  assert(order.every((question) => question.accepted.length === 2));
  assert(order.every((question) => question.answerText.endsWith(".")));
});
