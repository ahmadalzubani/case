import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDialogueTags } from '../src/components/TypewriterText.tsx';

test('Typewriter Engine: Plain text with no tags parses into single token', () => {
  const result = parseDialogueTags('مرحبا بك في غرفة التحقيق');
  assert.equal(result.tokens.length, 1);
  assert.equal(result.totalChars, 24);
  assert.equal(result.plainText, 'مرحبا بك في غرفة التحقيق');
  assert.equal(result.tokens[0].shake, false);
  assert.equal(result.tokens[0].slow, false);
  assert.equal(result.tokens[0].red, false);
  assert.equal(result.tokens[0].impact, false);
});

test('Typewriter Engine: [SHAKE] tag parses correctly and strips markup from visible text', () => {
  const result = parseDialogueTags('أنا [SHAKE]أرتجف من الخوف[/SHAKE] الآن');
  assert.equal(result.plainText, 'أنا أرتجف من الخوف الآن');
  assert.equal(result.tokens.length, 3);
  assert.equal(result.tokens[1].rawText, 'أرتجف من الخوف');
  assert.equal(result.tokens[1].shake, true);
  assert.equal(result.tokens[1].red, false);
});

test('Typewriter Engine: [RED] tag identifies crimson clue words', () => {
  const result = parseDialogueTags('وجدت [RED]سجل البطاقة الإلكترونية[/RED] مفقوداً');
  assert.equal(result.plainText, 'وجدت سجل البطاقة الإلكترونية مفقوداً');
  assert.equal(result.tokens.length, 3);
  assert.equal(result.tokens[1].rawText, 'سجل البطاقة الإلكترونية');
  assert.equal(result.tokens[1].red, true);
});

test('Typewriter Engine: [SLOW] tag flags hesitation slowdown segments', () => {
  const result = parseDialogueTags('كنت... [SLOW]أنتظر في الممر[/SLOW] طويلاً');
  assert.equal(result.plainText, 'كنت... أنتظر في الممر طويلاً');
  assert.equal(result.tokens.length, 3);
  assert.equal(result.tokens[1].rawText, 'أنتظر في الممر');
  assert.equal(result.tokens[1].slow, true);
});

test('Typewriter Engine: [IMPACT] tag marks revelation slam', () => {
  const result = parseDialogueTags('وهنا كانت [IMPACT]المفاجأة الصادمة[/IMPACT]!');
  assert.equal(result.plainText, 'وهنا كانت المفاجأة الصادمة!');
  assert.equal(result.tokens.length, 3);
  assert.equal(result.tokens[1].rawText, 'المفاجأة الصادمة');
  assert.equal(result.tokens[1].impact, true);
});

test('Typewriter Engine: Nested tags support combined effects', () => {
  const result = parseDialogueTags('هذه [RED][SHAKE]كذبة فاضحة[/SHAKE][/RED] يا سيدي');
  assert.equal(result.plainText, 'هذه كذبة فاضحة يا سيدي');
  const targetToken = result.tokens.find((t) => t.rawText === 'كذبة فاضحة');
  assert.ok(targetToken);
  assert.equal(targetToken?.red, true);
  assert.equal(targetToken?.shake, true);
});

test('Typewriter Engine: Empty and whitespace strings do not crash', () => {
  const empty = parseDialogueTags('');
  assert.equal(empty.tokens.length, 0);
  assert.equal(empty.totalChars, 0);
  assert.equal(empty.plainText, '');
});
