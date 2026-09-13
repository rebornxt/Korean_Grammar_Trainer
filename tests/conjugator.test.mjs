import { test } from "node:test";
import assert from "node:assert/strict";
import { loadContent, validateContent } from "../tools/lib.mjs";
import { conjugationEntries } from "../public/conjugator.js";

test("conjugation lab is derived only from learned, published exercises", async () => {
  const catalog = validateContent(await loadContent());
  const entries = conjugationEntries(catalog);
  assert(entries.length > 50);
  assert(entries.every((entry) => entry.dictionary.endsWith("다")));
  assert(entries.every((entry) => entry.forms.length > 0));
  assert(entries.every((entry) =>
    catalog.learned.includes(entry.forms[0].lessonId),
  ));

  const eat = entries.find((entry) => entry.dictionary === "먹다");
  assert.deepEqual(
    eat.forms.map((form) => [form.id, form.answer]),
    [["polite", "먹어요"], ["formal", "먹습니다"], ["casual", "먹어"]],
  );
  assert.equal(
    entries.find((entry) => entry.dictionary === "돕다").forms[0].answer,
    "도와요",
  );
});
