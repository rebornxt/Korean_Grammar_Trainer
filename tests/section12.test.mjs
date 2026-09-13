import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, validateContent } from '../tools/lib.mjs';
import { freshState, questionPool } from '../public/core.js';

test('Section 12 is learned explicitly and all six groups are reachable', async () => {
  const c = validateContent(await loadContent());
  const units = c.lessons.filter(l => l.id.startsWith('s12-'));
  assert.equal(units.length, 6);
  for (const l of units) {
    assert.equal(l.sectionId, 'section-12');
    assert(c.learned.includes(l.id));
    const s = freshState(); s.filters.lesson = l.id;
    assert.equal(questionPool(c, s.filters, s).length, l.questions.length);
    assert(l.questions.every(q => !q.promptAudio && q.source.locator.startsWith('หน้า')));
  }
});
test('irregular forms preserve exceptions and corrected source spellings', async () => {
  const c = await loadContent();
  const qs = c.lessons.filter(l => l.id.startsWith('s12-')).flatMap(l => l.questions);
  for (const [word, answer] of [['돕다','도와요'],['굽다','구워요'],['잡다','잡아요'],['입다','입어요'],['듣다','들어요'],['낫다','나아요'],['젓다','저어요'],['모으다','모아요'],['기르다','길러요'],['하얗다','하얘요']]) {
    const q = qs.find(q => q.id.startsWith('s12-conjugate-') && q.prompt.startsWith(word+' ·'));
    assert.equal(q.answerText, answer);
    assert.equal(q.options.find(o => o.id === q.answer).text, answer);
  }
  assert(!qs.some(q => ['하예요','나요'].includes(q.answerText)));
});
