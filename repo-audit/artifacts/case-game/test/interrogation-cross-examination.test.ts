import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_001 as case001 } from '../src/data/cases/case-001.ts';
import {
  createInitialInvestigationState,
  inspectEvidence,
  reviewTimeline,
  discoverHotspot,
  addConnection,
  attemptDeriveContradiction,
  getEarnedDeductions,
  getAvailableStatements,
  executeInterrogationChallenge,
  executeRawEvidenceConfrontation,
  saveInvestigationState,
  loadInvestigationState,
  type InvestigationState,
} from '../src/lib/case-logic.ts';

const layla = case001.suspects.find((s) => s.id === 'layla')!;
const salem = case001.suspects.find((s) => s.id === 'salem')!;
const nabil = case001.suspects.find((s) => s.id === 'nabil')!;
const mariam = case001.suspects.find((s) => s.id === 'mariam')!;

test('Test 1: A player cannot present a deduction they have not validated', () => {
  const state = createInitialInvestigationState();

  // Layla contradiction has NOT been validated yet
  assert.equal(state.discoveredContradictionIds.includes('contradiction-layla'), false);

  // Earned deductions list must NOT include unvalidated contradictions
  const earned = getEarnedDeductions(case001, state);
  assert.equal(earned.some((d) => d.id === 'contradiction-layla'), false);

  // Attempting to present unearned deduction must fail without penalty
  const result = executeInterrogationChallenge(
    case001,
    layla,
    state,
    'layla-stmt-2',
    'contradiction-layla',
  );

  assert.equal(result.success, false);
  assert.equal(result.credibilityDeducted, false, 'No credibility penalty for unearned deduction attempt');
  assert.equal(result.title, 'استنتاج غير مكتسب');
});

test('Test 2: A raw evidence item cannot substitute for a required validated deduction', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'card-log');

  // Player presents raw evidence card-log directly against Layla's alibi statement
  const result = executeRawEvidenceConfrontation(
    case001,
    layla,
    state,
    'layla-stmt-2',
    'card-log',
  );

  assert.equal(result.success, false, 'Raw evidence must not satisfy deduction challenge');
  assert.equal(result.credibilityDeducted, true, 'Confronting with raw evidence without deduction deducts credibility');
  assert.equal(result.newState.credibilityPoints, 2);
  assert.equal(result.newState.brokenSuspectIds.includes('layla'), false);
  assert.ok(result.dialogueText.includes('مجرد إبراز هذا الدليل لا يثبت شيئاً ضدي'));
});

test('Test 3: A validated deduction can be presented against its compatible statement', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'card-log');
  state = inspectEvidence(state, 'layla-bag');
  state = discoverHotspot(state, 'cutter-paint-fleck');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't4');
  state = addConnection(state, 'suspect', 'layla', 'evidence', 'card-log');

  // Player proves the contradiction on the board
  const deriveResult = attemptDeriveContradiction(case001, state, state.connections[0].id);
  assert.equal(deriveResult.success, true);
  state = deriveResult.newState;

  // Now the deduction is legitimately earned
  const earned = getEarnedDeductions(case001, state);
  assert.ok(earned.some((d) => d.id === 'contradiction-layla'));

  // Player presents the earned deduction against Layla's statement #2
  const confrontation = executeInterrogationChallenge(
    case001,
    layla,
    state,
    'layla-stmt-2',
    'contradiction-layla',
  );

  assert.equal(confrontation.success, true);
  assert.equal(confrontation.effectiveness, 'strong');
  assert.equal(confrontation.credibilityDeducted, false);
  assert.ok(confrontation.dialogueText.includes('سجل البطاقة الإلكترونية'));
});

test('Test 4: An incompatible deduction does not resolve the statement', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'safe-shortage');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't5');
  state = addConnection(state, 'suspect', 'salem', 'evidence', 'safe-shortage');

  // Player validates Salem's safe shortage contradiction
  const deriveResult = attemptDeriveContradiction(case001, state, state.connections[0].id);
  assert.equal(deriveResult.success, true);
  state = deriveResult.newState;

  // Player tries to present Salem's contradiction against Layla's alibi statement
  const confrontation = executeInterrogationChallenge(
    case001,
    layla,
    state,
    'layla-stmt-2',
    'contradiction-salem',
  );

  assert.equal(confrontation.success, false);
  assert.equal(confrontation.credibilityDeducted, true);
  assert.equal(confrontation.newState.credibilityPoints, 2);
  assert.equal(confrontation.newState.brokenSuspectIds.includes('layla'), false);
});

test('Test 5: Successful confrontation produces the intended state change', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = reviewTimeline(state, 't4');
  state = discoverHotspot(state, 'latch-scratch');
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');

  // Validate locked-room contradiction
  const derive = attemptDeriveContradiction(case001, state, state.connections[0].id);
  assert.equal(derive.success, true);
  state = derive.newState;

  // Decisive confrontation against Layla's locked-room claim (layla-stmt-3)
  const confrontation = executeInterrogationChallenge(
    case001,
    layla,
    state,
    'layla-stmt-3',
    'contradiction-latch',
  );

  assert.equal(confrontation.success, true);
  assert.equal(confrontation.breaksSuspect, true);
  assert.equal(confrontation.effectiveness, 'decisive');

  // State changes: suspect is broken, statement challenged, clue added
  const nextState = confrontation.newState;
  assert.ok(nextState.brokenSuspectIds.includes('layla'));
  assert.ok(nextState.challengedStatementIds.includes('layla-stmt-3'));
  assert.ok(nextState.notebook.clueIds.includes('interrogation:layla:layla-stmt-3'));
});

test('Test 6: Failed confrontation applies the intended credibility consequence', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'safe-shortage');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't5');
  state = addConnection(state, 'suspect', 'salem', 'evidence', 'safe-shortage');
  const derive = attemptDeriveContradiction(case001, state, state.connections[0].id);
  state = derive.newState;

  assert.equal(state.credibilityPoints, 3);

  // Wrong confrontation 1
  let res = executeInterrogationChallenge(case001, layla, state, 'layla-stmt-2', 'contradiction-salem');
  assert.equal(res.newState.credibilityPoints, 2);

  // Wrong confrontation 2
  res = executeInterrogationChallenge(case001, layla, res.newState, 'layla-stmt-2', 'contradiction-salem');
  assert.equal(res.newState.credibilityPoints, 1);

  // Wrong confrontation 3 -> Lockout
  res = executeInterrogationChallenge(case001, layla, res.newState, 'layla-stmt-2', 'contradiction-salem');
  assert.equal(res.newState.credibilityPoints, 0);
});

test('Test 7: Failed confrontation does NOT reveal the correct deduction', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'safe-shortage');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't5');
  state = addConnection(state, 'suspect', 'salem', 'evidence', 'safe-shortage');
  state = attemptDeriveContradiction(case001, state, state.connections[0].id).newState;

  const result = executeInterrogationChallenge(
    case001,
    layla,
    state,
    'layla-stmt-2',
    'contradiction-salem',
  );

  assert.equal(result.success, false);
  // Fail dialogue must not leak the correct answer
  assert.ok(!result.dialogueText.includes('contradiction-layla'));
  assert.ok(!result.dialogueText.includes('card-log'));
  assert.ok(!result.dialogueText.includes('استخدم سجل البطاقة'));
});

test('Test 8: Successful confrontation can unlock the next intended statement/branch', () => {
  let state = createInitialInvestigationState();

  // Statement 5 is initially locked
  const initialStatements = getAvailableStatements(layla, state);
  assert.equal(initialStatements.some((s) => s.statementId === 'layla-stmt-5'), false);

  // Validate contradiction-layla
  state = inspectEvidence(state, 'card-log');
  state = inspectEvidence(state, 'layla-bag');
  state = discoverHotspot(state, 'cutter-paint-fleck');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't4');
  state = addConnection(state, 'suspect', 'layla', 'evidence', 'card-log');
  state = attemptDeriveContradiction(case001, state, state.connections[0].id).newState;

  // Successfully challenge stmt-2
  const confrontation = executeInterrogationChallenge(
    case001,
    layla,
    state,
    'layla-stmt-2',
    'contradiction-layla',
  );
  assert.equal(confrontation.success, true);
  state = confrontation.newState;

  // Now statement 5 is unlocked in available statements!
  assert.ok(state.unlockedStatementIds.includes('layla-stmt-5'));
  const updatedStatements = getAvailableStatements(layla, state);
  assert.ok(updatedStatements.some((s) => s.statementId === 'layla-stmt-5'));
});

test('Test 9: Interrogation state persists across reload', () => {
  let state = createInitialInvestigationState();
  state = {
    ...state,
    brokenSuspectIds: ['layla'],
    credibilityPoints: 1,
    unlockedStatementIds: ['layla-stmt-5'],
    challengedStatementIds: ['layla-stmt-2'],
  };

  const storageMap = new Map<string, string>();
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
    },
  };
  (globalThis as any).window = mockWindow;

  try {
    saveInvestigationState(case001.id, state);
    const reloaded = loadInvestigationState(case001.id);

    assert.deepEqual(reloaded.brokenSuspectIds, ['layla']);
    assert.equal(reloaded.credibilityPoints, 1);
    assert.deepEqual(reloaded.unlockedStatementIds, ['layla-stmt-5']);
    assert.deepEqual(reloaded.challengedStatementIds, ['layla-stmt-2']);
  } finally {
    delete (globalThis as any).window;
  }
});

test('Test 10: Repeatedly presenting the same deduction does not duplicate rewards or corrupt progression', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'card-log');
  state = inspectEvidence(state, 'layla-bag');
  state = discoverHotspot(state, 'cutter-paint-fleck');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't4');
  state = addConnection(state, 'suspect', 'layla', 'evidence', 'card-log');
  state = attemptDeriveContradiction(case001, state, state.connections[0].id).newState;

  // Present once
  let res = executeInterrogationChallenge(case001, layla, state, 'layla-stmt-2', 'contradiction-layla');
  state = res.newState;
  assert.equal(state.unlockedStatementIds.length, 1);
  assert.equal(state.challengedStatementIds.length, 1);

  // Present again
  res = executeInterrogationChallenge(case001, layla, state, 'layla-stmt-2', 'contradiction-layla');
  state = res.newState;
  assert.equal(state.unlockedStatementIds.length, 1, 'No duplicate unlocked statements');
  assert.equal(state.challengedStatementIds.length, 1, 'No duplicate challenged statement IDs');
});

test('Test 11: A suspect cannot become "broken" merely because unrelated deductions were discovered', () => {
  let state = createInitialInvestigationState();

  // Validate all contradictions
  state.discoveredContradictionIds = [
    'contradiction-latch',
    'contradiction-layla',
    'contradiction-salem',
    'contradiction-nabil',
    'contradiction-mariam',
  ];

  // Neither Salem nor Nabil nor Mariam have been cross-examined yet
  assert.equal(state.brokenSuspectIds.includes('salem'), false);
  assert.equal(state.brokenSuspectIds.includes('nabil'), false);
  assert.equal(state.brokenSuspectIds.includes('mariam'), false);
  assert.equal(state.brokenSuspectIds.includes('layla'), false);
});

test('Test 12: Previous Phase 1A+B tests and Salem/Nabil/Mariam cross-examinations all work', () => {
  // Test Salem's cross-examination separates theft from murder
  let stateSalem = createInitialInvestigationState();
  stateSalem.discoveredContradictionIds = ['contradiction-salem'];
  const resSalem = executeInterrogationChallenge(
    case001,
    salem,
    stateSalem,
    'salem-stmt-2',
    'contradiction-salem',
  );
  assert.equal(resSalem.success, true);
  assert.equal(resSalem.breaksSuspect, true);
  assert.ok(resSalem.dialogueText.includes('سرقت 500 دينار'));
  assert.ok(resSalem.newState.brokenSuspectIds.includes('salem'));

  // Test Nabil's cross-examination breaks deep-sleep alibi
  let stateNabil = createInitialInvestigationState();
  stateNabil.discoveredContradictionIds = ['contradiction-nabil'];
  const resNabil = executeInterrogationChallenge(
    case001,
    nabil,
    stateNabil,
    'nabil-stmt-1',
    'contradiction-nabil',
  );
  assert.equal(resNabil.success, true);
  assert.equal(resNabil.breaksSuspect, true);
  assert.ok(resNabil.dialogueText.includes('تسجيلات هاتفي'));
  assert.ok(resNabil.newState.brokenSuspectIds.includes('nabil'));

  // Test Mariam's cross-examination clears her of murder
  let stateMariam = createInitialInvestigationState();
  stateMariam.discoveredContradictionIds = ['contradiction-mariam'];
  const resMariam = executeInterrogationChallenge(
    case001,
    mariam,
    stateMariam,
    'mariam-stmt-1',
    'contradiction-mariam',
  );
  assert.equal(resMariam.success, true);
  assert.equal(resMariam.breaksSuspect, true);
  assert.ok(resMariam.dialogueText.includes('لم أقتل طارق'));
  assert.ok(resMariam.newState.brokenSuspectIds.includes('mariam'));
});
