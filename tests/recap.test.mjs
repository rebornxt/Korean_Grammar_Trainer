import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, validateContent } from '../tools/lib.mjs';
import { freshState, questionPool } from '../public/core.js';

test('recap packages remain reachable with their cross-lesson prerequisites', async () => {
  const c = validateContent(await loadContent());
  const units = c.lessons.filter(l => l.id.startsWith('recap-s1'));
  assert.equal(units.length, 7);
  for (const l of units) {
    assert(c.learned.includes(l.id));
    assert(['section-10', 'section-11'].includes(l.sectionId));
    assert(l.source.locator.includes('หน้า'));
    const state = freshState();
    state.filters.lesson = l.id;
    assert.equal(questionPool(c, state.filters, state).length, l.questions.length);
  }
});

test('source corrections and context-sensitive conjugations stay explicit', async () => {
  const c = await loadContent();
  const words = c.lessons.flatMap(l => l.words);
  const questions = c.lessons.flatMap(l => l.questions);
  assert(words.some(w => w.ko === '쉬다'));
  assert(words.some(w => w.ko === '걔'));
  assert(!words.some(w => w.ko === '시다'));
  for (const [id, answer] of [['06','마십니다'], ['09','듭니다'], ['24','들어요'], ['25','세요'], ['33','마셔요']]) {
    const q = questions.find(q => q.id === 'recap-conjugate-' + id);
    assert.equal(q.answerText, answer);
    assert.equal(q.options.find(o => o.id === q.answer).text, answer);
    assert.equal(new Set(q.options.map(o => o.text)).size, q.options.length);
  }
  assert(!questions.find(q => q.id === 'recap-conjugate-25').options.some(o => o.text === '세어요'));
});
