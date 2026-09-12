# Adding newly learned content

This is a personal, incremental review companion. Do not import the entire course, infer completion from Udemy ticks, or treat a later lecture as completion of all earlier lectures. Do not add a Hangul reading course. UI and explanations are Thai; repository documentation and identifiers are English.

## Each update

1. Read `content/progress.json` and existing lesson packages. Resolve the learner's reported section/lecture to its actual course source. Confirm only ambiguous reports. Record the precise URL and locator.
2. Put downloaded worksheets and extraction notes in ignored `private/`. Read the worksheet first; inspect accessible transcript/video details when needed. Do not infer a full grammar lesson from its title alone. Keep verbatim source records separate from authored Thai and supplementary examples.
3. Create or extend a package in `content/lessons/` with a stable ID, status `draft`, source metadata and empty arrays where content is still pending. Add its ID to `progress.json` only if the learner says it was learned. This displays “เรียนแล้ว—รอเนื้อหา” without publishing partial exercises.
4. Author rules, vocabulary and questions. List every required rule/word in `requires`, including knowledge needed to reject distractors. Use only learned material. Explicitly enumerate valid sentence orders; remove ambiguous questions instead of forcing one possible answer to be uniquely correct. Have a human/agent check grammar, Thai, speech level and source fidelity.
5. Check voice samples and select the shared voice/rate before the first content release. Set the package to `ready`, run `node tools/audio.mjs --check`, then generate only missing clips with `--generate`. These are local edits; the website remains on the previous deployed version until the final build and push.
6. Listen to new words and sentences, especially pronunciation across word boundaries, counters and speech levels. Run `npm test` and `npm run build`. Build refuses missing audio or unlearned/draft dependencies. Review the actual tap/assembly/recall flows before publishing.
7. Report added lessons/topics/word counts, unresolved source questions and any supplementary explanations. Preserve all old IDs; adding content must not reset results.

## Minimal package example (shape only)

Do not copy placeholder values into production. `tests/fixture.mjs` contains executable synthetic examples of all three question types.

```json
{
  "id": "udemy-LECTURE_ID",
  "sectionId": "section-05",
  "title": "Lecture number · actual title",
  "status": "draft",
  "source": {
    "url": "https://www.udemy.com/course/korean-for-absolute-beginners-1/learn/lecture/LECTURE_ID",
    "label": "Section 5 · Lecture number",
    "locator": "Worksheet page / video timestamp"
  },
  "words": [], "rules": [], "questions": []
}
```

Every word, rule and question ID is globally unique and stable. Never renumber IDs to close gaps. Optional `source` on a rule/question overrides the lesson source; optional authoring fields such as `added: true` or `notes` can explain supplementary material.

| Record | Required fields / behavior |
| --- | --- |
| Word | `id`, `ko`, `th`. The `ko` text generates a clip. |
| Rule | `id`, `topic`, `title`, `explanation`, `examples`. Each example has `ko`, `th`, optionally `wordIds` for separately playable vocabulary. |
| All questions | `id`, `type`, `topic`, `prompt`, `answerText`, `explanation`; optional `translation`, `requires`, `wordIds`, `source`. Correct `answerText` generates a full clip. |
| Choice | `type: "choice"`; unique `options: [{id, text}]`; `answer` is one option ID. Optional `promptAudio` must exactly equal an already-visible, complete prompt that does not reveal the answer. |
| Assembly | `type: "order"`; `chunks: [text]`; `accepted: [[chunkIndex, ...]]`. Every accepted order uses each index once. First accepted order joined with spaces equals `answerText`. Do not add prompt audio. |
| Recall | `type: "recall"`, `topic: "vocabulary"`, `wordId`; Thai `prompt`, Korean `answerText` equal to the referenced word. Reveal first, then self-assess. No multiple-choice guessing or typed input. |

Topics currently supported: `particles`, `endings`, `order`, `numbers`, `vocabulary`, `conversation`. Add a Thai label in `TOPICS` for a genuinely new topic. Do not create extra drill engines when one of the existing three fits.

Build validates reference existence and learned prerequisites, not the truth of Korean grammar. Content review and listening are required before publishing. Source provenance applies to distractors and inferred answers too; a worksheet without an answer key must not be presented as supplying one.

## Persisted state

`hangeul-om.state.v1` stores view, filters, per-topic streak/best and word ID → known/unknown. New cards have no stored entry. IDs absent from the current catalog survive export/import, so temporarily removing a lesson cannot erase history. Do not reuse old IDs for unrelated content. A schema change needs an explicit migration and test.
