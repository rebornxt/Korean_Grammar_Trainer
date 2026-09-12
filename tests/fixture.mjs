// Artificial fixture. Never imported by public/ or included in the release.
export function fixture() {
  return {
    course: {
      sections: [{ id: "section-05", number: 5, title: "Test" }],
      groups: [{ id: "g1", title: "Test", from: 5, to: 5 }],
    },
    learned: ["lesson-a", "lesson-c"],
    config: {
      voice: "ko-KR-SunHiNeural",
      rate: "-10%",
      format: "audio-24khz-48kbitrate-mono-mp3",
      approved: true,
    },
    lessons: [
      {
        id: "lesson-a",
        sectionId: "section-05",
        title: "TEST A",
        status: "ready",
        source: {
          label: "Synthetic test fixture",
          url: "https://example.com/test",
        },
        words: [{ id: "word-a", ko: "학생", th: "นักเรียน" }],
        rules: [
          {
            id: "rule-a",
            topic: "endings",
            title: "Test rule",
            explanation: "Test explanation",
            examples: [
              {
                ko: "저는 학생입니다.",
                th: "ฉันเป็นนักเรียน",
                wordIds: ["word-a"],
              },
            ],
          },
        ],
        questions: [
          {
            id: "q-choice",
            type: "choice",
            topic: "endings",
            prompt: "저는 ___.",
            translation: "ฉันเป็นนักเรียน",
            options: [
              { id: "a", text: "학생입니다" },
              { id: "b", text: "학생" },
            ],
            answer: "a",
            answerText: "저는 학생입니다.",
            explanation: "คำอธิบายทดสอบ",
            requires: ["rule-a"],
            wordIds: ["word-a"],
          },
          {
            id: "q-recall",
            type: "recall",
            topic: "vocabulary",
            wordId: "word-a",
            prompt: "นักเรียน",
            answerText: "학생",
            explanation: "ความหมายทดสอบ",
            requires: ["word-a"],
          },
        ],
      },
      {
        id: "lesson-b",
        sectionId: "section-05",
        title: "TEST FUTURE",
        status: "draft",
        source: { label: "Test", url: "https://example.com/test" },
        words: [{ id: "word-future", ko: "학교", th: "โรงเรียน" }],
        rules: [],
        questions: [],
      },
      {
        id: "lesson-c",
        sectionId: "section-05",
        title: "TEST C",
        status: "ready",
        source: { label: "Test", url: "https://example.com/test" },
        words: [],
        rules: [],
        questions: [
          {
            id: "q-order",
            type: "order",
            topic: "order",
            prompt: "ฉันเป็นนักเรียน",
            chunks: ["저는", "학생입니다."],
            accepted: [[0, 1]],
            answerText: "저는 학생입니다.",
            explanation: "คำอธิบายทดสอบ",
            requires: ["rule-a"],
            wordIds: ["word-a"],
          },
        ],
      },
    ],
  };
}
