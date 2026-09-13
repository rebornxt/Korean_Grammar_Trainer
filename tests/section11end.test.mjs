import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, validateContent } from '../tools/lib.mjs';
import { freshState, questionPool } from '../public/core.js';

test('Section 11 end has reachable exercises without future lessons or revealing prompt audio', async () => {
  const c = validateContent(await loadContent());
  for (const l of c.lessons.filter(l => l.id.startsWith('s11end-'))) {
    const s = freshState(); s.filters.lesson = l.id;
    assert.equal(questionPool(c, s.filters, s).length, l.questions.length);
    assert.equal(l.sectionId, 'section-11');
    for (const q of l.questions) {
      assert(!q.promptAudio);
      assert(q.source.locator.includes('หน้า'));
    }
  }
});
test('object particles match final consonants and transformations retain negation', async () => {
  const c = await loadContent();
  const objects = c.lessons.find(l => l.id === 's11end-objects');
  const expected = ['을','을','를','을','를','를'];
  objects.questions.filter(q => q.type === 'choice').forEach((q,i) => {
    assert.equal(q.options.find(o => o.id === q.answer).text, expected[i]);
    assert(q.answerText.includes(expected[i] + ' 먹어요.'));
  });
  const q = c.lessons.flatMap(l => l.questions).filter(q => q.id.startsWith('s11end-transform-'));
  assert.equal(q.length, 4);
  for (const item of q) {
    assert(item.answerText.endsWith('지 않아요.'));
    assert.equal(item.options.find(o => o.id === item.answer).text, item.answerText);
  }
});
