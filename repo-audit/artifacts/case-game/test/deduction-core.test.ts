import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_001 as case001 } from '../src/data/cases/case-001.ts';
import {
  createInitialInvestigationState,
  inspectEvidence,
  reviewTimeline,
  discoverHotspot,
  addConnection,
  removeConnection,
  attemptDeriveContradiction,
  getDiscoveredContradictions,
  checkAccusation,
  loadInvestigationState,
  saveInvestigationState,
  type InvestigationState,
} from '../src/lib/case-logic.ts';
import type { CaseFile } from '../src/data/types.ts';

test('Test 1: Inspecting required evidence alone does NOT reveal contradiction', () => {
  let state = createInitialInvestigationState();
  // Inspect all evidence required by contradiction-latch
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = discoverHotspot(state, 'latch-scratch');

  const discovered = getDiscoveredContradictions(case001, state);
  assert.equal(discovered.length, 0, 'No contradictions should be revealed merely by inspecting evidence');
  assert.equal(state.discoveredContradictionIds.length, 0);
});

test('Test 2: Reviewing required timeline entries alone does NOT reveal contradiction', () => {
  let state = createInitialInvestigationState();
  state = reviewTimeline(state, 't4');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't3');

  const discovered = getDiscoveredContradictions(case001, state);
  assert.equal(discovered.length, 0, 'No contradictions should be revealed merely by reviewing timeline');
  assert.equal(state.discoveredContradictionIds.length, 0);
});

test('Test 3: Creating an arbitrary connection does NOT reveal contradiction', () => {
  let state = createInitialInvestigationState();
  state = addConnection(state, 'suspect', 'mariam', 'evidence', 'victim-phone');
  
  assert.equal(state.connections.length, 1);
  const conn = state.connections[0];
  assert.equal(conn.status, 'hypothesis');

  // Attempting to derive contradiction from an arbitrary connection should fail
  const result = attemptDeriveContradiction(case001, state, conn.id);
  assert.equal(result.success, false, 'Arbitrary connection should not derive contradiction');
  assert.equal(result.newState.discoveredContradictionIds.length, 0);
  assert.equal(getDiscoveredContradictions(case001, result.newState).length, 0);
});

test('Test 4: Creating the correct hypothesis but NOT pressing "derive contradiction" does NOT reveal contradiction', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = reviewTimeline(state, 't4');
  state = discoverHotspot(state, 'latch-scratch');

  // Player creates correct connection between latch and zip-tie
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  assert.equal(state.connections.length, 1);
  assert.equal(state.connections[0].status, 'hypothesis');

  // System must NOT automatically discover contradiction
  const discovered = getDiscoveredContradictions(case001, state);
  assert.equal(discovered.length, 0, 'Contradiction must not auto-reveal before player tests hypothesis');
  assert.equal(state.discoveredContradictionIds.length, 0);
});

test('Test 5: Correct hypothesis + explicit validation DOES reveal contradiction', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = reviewTimeline(state, 't4');
  state = discoverHotspot(state, 'latch-scratch');

  // Player creates connection
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  const connId = state.connections[0].id;

  // Player explicitly requests validation ("استنتاج تعارض")
  const result = attemptDeriveContradiction(case001, state, connId);
  assert.equal(result.success, true, 'Validation should succeed with correct hypothesis and prerequisites');
  assert.equal(result.discoveredContradiction?.id, 'contradiction-latch');

  // Contradiction is now discovered in state
  const nextState = result.newState;
  assert.ok(nextState.discoveredContradictionIds.includes('contradiction-latch'));
  assert.ok(nextState.validatedDeductionIds.includes('contradiction-latch'));

  // Connection is upgraded from hypothesis to validated
  const updatedConn = nextState.connections.find((c) => c.id === connId);
  assert.equal(updatedConn?.status, 'validated');

  // getDiscoveredContradictions now returns the confirmed contradiction
  const discovered = getDiscoveredContradictions(case001, nextState);
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].id, 'contradiction-latch');
});

test('Test 6: Wrong hypothesis does NOT reveal the intended contradiction', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'victim-phone');
  state = reviewTimeline(state, 't4');
  state = discoverHotspot(state, 'latch-scratch');

  // Player connects latch to wrong item (victim-phone)
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'victim-phone');
  const connId = state.connections[0].id;

  const result = attemptDeriveContradiction(case001, state, connId);
  assert.equal(result.success, false, 'Wrong hypothesis must fail validation');
  assert.equal(result.newState.discoveredContradictionIds.length, 0);

  // Error message must be restrained and not leak correct solution
  assert.ok(result.message.length > 0);
  assert.ok(!result.message.includes('zip-tie'), 'Error message must not leak required item');
  assert.ok(!result.message.includes('layla'), 'Error message must not leak suspect');
});

test('Test 7: Validated contradiction persists after state reload', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = reviewTimeline(state, 't4');
  state = discoverHotspot(state, 'latch-scratch');
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');

  const result = attemptDeriveContradiction(case001, state, state.connections[0].id);
  const validatedState = result.newState;

  // Simulate mock window.localStorage
  const storageMap = new Map<string, string>();
  const mockWindow = {
    localStorage: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
    },
  };

  (globalThis as any).window = mockWindow;

  try {
    saveInvestigationState(case001.id, validatedState);
    const reloadedState = loadInvestigationState(case001.id);

    assert.deepEqual(reloadedState.discoveredContradictionIds, ['contradiction-latch']);
    assert.ok(reloadedState.validatedDeductionIds.includes('contradiction-latch'));
    assert.equal(reloadedState.connections.length, 1);
    assert.equal(reloadedState.connections[0].status, 'validated');
    assert.equal(getDiscoveredContradictions(case001, reloadedState).length, 1);
  } finally {
    delete (globalThis as any).window;
  }
});

test('Test 8: A player can create multiple hypotheses without corrupting state', () => {
  let state = createInitialInvestigationState();
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  state = addConnection(state, 'suspect', 'layla', 'evidence', 'card-log');
  state = addConnection(state, 'suspect', 'salem', 'evidence', 'safe-shortage');
  state = addConnection(state, 'suspect', 'nabil', 'evidence', 'bug-record');
  state = addConnection(state, 'timeline', 't1', 'evidence', 'victim-phone');

  assert.equal(state.connections.length, 5);
  for (const conn of state.connections) {
    assert.equal(conn.status, 'hypothesis');
    assert.ok(conn.id.length > 0);
  }
});

test('Test 9: Duplicate connections do not create duplicate deductions or duplicate connections', () => {
  let state = createInitialInvestigationState();
  // Add forward
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  assert.equal(state.connections.length, 1);

  // Add exact duplicate
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  assert.equal(state.connections.length, 1, 'Exact duplicate must not be added');

  // Add reverse duplicate
  state = addConnection(state, 'evidence', 'zip-tie', 'evidence', 'latch');
  assert.equal(state.connections.length, 1, 'Reverse direction duplicate must not be added');

  // Add self-connection
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'latch');
  assert.equal(state.connections.length, 1, 'Self-connection must be rejected');
});

test('Test 10: Removing/undoing a hypothesis does not accidentally erase already validated discoveries', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = reviewTimeline(state, 't4');
  state = discoverHotspot(state, 'latch-scratch');
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');

  const result = attemptDeriveContradiction(case001, state, state.connections[0].id);
  let validatedState = result.newState;
  assert.equal(validatedState.discoveredContradictionIds.length, 1);

  // Now player removes the hypothesis card from the board
  const connId = validatedState.connections[0].id;
  validatedState = removeConnection(validatedState, connId);

  // Connection is removed from active board
  assert.equal(validatedState.connections.length, 0);

  // But the discovered contradiction in the case file REMAINS confirmed and intact
  assert.deepEqual(validatedState.discoveredContradictionIds, ['contradiction-latch']);
  const discovered = getDiscoveredContradictions(case001, validatedState);
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].id, 'contradiction-latch');
});

test('Test 11: A case with no contradiction requirements does not crash', () => {
  const emptyCase: CaseFile = {
    ...case001,
    id: 'empty-test-case',
    contradictions: [
      {
        id: 'c-empty',
        title: 'Empty Requirements Test',
        description: 'No requirements defined',
        suspectId: 'layla',
        relatedEvidenceIds: [],
        relatedTimelineIds: [],
        requiredConnections: [],
      },
    ],
  };

  let state = createInitialInvestigationState();
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');

  assert.doesNotThrow(() => {
    const discovered = getDiscoveredContradictions(emptyCase, state);
    assert.equal(discovered.length, 0);

    const result = attemptDeriveContradiction(emptyCase, state);
    assert.equal(result.success, false);
  });
});

test('Test 12: Existing non-investigation functionality continues to work', () => {
  let state = createInitialInvestigationState();
  // Inspect all critical evidence and timeline for Case 001
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = inspectEvidence(state, 'layla-bag');
  state = inspectEvidence(state, 'card-log');
  state = reviewTimeline(state, 't2');
  state = reviewTimeline(state, 't3');
  state = reviewTimeline(state, 't4');
  state = reviewTimeline(state, 't5');

  // Check accusation with 0 player-discovered contradictions
  const initialAccusationResult = checkAccusation(case001, state, {
    culpritId: case001.solution.culpritId,
    motive: case001.solution.motive,
    method: case001.solution.method,
    time: case001.solution.time,
  });

  // Since player hasn't validated any contradiction, contradictionsFound must be 0
  assert.equal(initialAccusationResult.contradictionsFound, 0);

  // Now player validates a contradiction
  state = discoverHotspot(state, 'latch-scratch');
  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  const deductionResult = attemptDeriveContradiction(case001, state, state.connections[0].id);
  assert.equal(deductionResult.success, true);
  state = deductionResult.newState;

  // Accusation result now reflects the 1 player-discovered contradiction
  const updatedAccusationResult = checkAccusation(case001, state, {
    culpritId: case001.solution.culpritId,
    motive: case001.solution.motive,
    method: case001.solution.method,
    time: case001.solution.time,
  });

  assert.equal(updatedAccusationResult.contradictionsFound, 1);
  assert.equal(updatedAccusationResult.correctCulprit, true);
  assert.equal(updatedAccusationResult.correctMotive, true);
  assert.equal(updatedAccusationResult.correctMethod, true);
});
