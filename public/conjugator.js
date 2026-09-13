const FORM_ORDER = { polite: 0, formal: 1, casual: 2 };

function formMeta(prompt) {
  if (prompt.includes("ทางการ"))
    return { id: "formal", label: "รูปทางการ", hint: "합니다체" };
  if (prompt.includes("กันเอง"))
    return { id: "casual", label: "รูปกันเอง", hint: "반말" };
  return { id: "polite", label: "รูปสุภาพ", hint: "해요체" };
}

function isSingleConjugation(word, question) {
  return (
    word?.ko?.endsWith("다") &&
    question.type === "choice" &&
    question.topic === "endings" &&
    question.prompt.startsWith(`${word.ko} ·`) &&
    typeof question.answerText === "string" &&
    !/\s/.test(question.answerText) &&
    question.answerText !== word.ko
  );
}

export function conjugationEntries(catalog) {
  const lessons = catalog.lessons.filter(
    (lesson) =>
      catalog.learned.includes(lesson.id) && lesson.status === "ready",
  );
  const words = new Map(
    lessons.flatMap((lesson) =>
      (lesson.words || []).map((word) => [word.id, { ...word, lesson }]),
    ),
  );
  const entries = new Map();

  for (const lesson of lessons) {
    const rules = new Map((lesson.rules || []).map((rule) => [rule.id, rule]));
    for (const question of lesson.questions || []) {
      const word = (question.wordIds || []).map((id) => words.get(id)).find(Boolean);
      if (!isSingleConjugation(word, question)) continue;
      const rule = (question.requires || []).map((id) => rules.get(id)).find(Boolean);
      if (!rule) continue;
      const meta = formMeta(question.prompt);
      const entry = entries.get(word.id) || {
        id: word.id,
        dictionary: word.ko,
        meaning: word.th,
        group: lesson.id.startsWith("s12-") ? "changing" : "basic",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        forms: [],
      };
      if (!entry.forms.some((form) => form.id === meta.id))
        entry.forms.push({
          ...meta,
          questionId: question.id,
          answer: question.answerText,
          stem: word.ko.slice(0, -1),
          ruleId: rule.id,
          ruleTitle: rule.title,
          explanation: rule.explanation,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          source: question.source || rule.source || lesson.source,
        });
      if (entry.group !== "changing" && lesson.id.startsWith("s12-")) {
        entry.group = "changing";
        entry.lessonId = lesson.id;
        entry.lessonTitle = lesson.title;
      }
      entries.set(word.id, entry);
    }
  }

  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      forms: entry.forms.sort(
        (a, b) => FORM_ORDER[a.id] - FORM_ORDER[b.id],
      ),
    }))
    .sort((a, b) => a.dictionary.localeCompare(b.dictionary, "ko"));
}
