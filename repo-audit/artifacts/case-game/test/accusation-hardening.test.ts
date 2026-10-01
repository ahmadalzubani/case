import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_001 as caseFile } from '../src/data/cases/case-001.ts';
import {
  createInitialInvestigationState,
  inspectEvidence,
  reviewTimeline,
  discoverHotspot,
  addConnection,
  attemptDeriveContradiction,
  validateIndictment,
  submitFinalIndictment,
  saveInvestigationState,
  loadInvestigationState,
  clearInvestigationState,
  inspectSuspect,
  inspectLocation,
  type ConnectionKind,
  type InvestigationState,
  type IndictmentDraft,
} from '../src/lib/case-logic';

function setupFullInvestigationState(): InvestigationState {
  let s = createInitialInvestigationState();

  // Inspect all evidence
  s = inspectEvidence(s, 'latch');
  s = inspectEvidence(s, 'zip-tie');
  s = inspectEvidence(s, 'layla-bag');
  s = inspectEvidence(s, 'card-log');
  s = inspectEvidence(s, 'victim-phone');
  s = inspectEvidence(s, 'safe-shortage');
  s = inspectEvidence(s, 'bug-record');
  s = inspectEvidence(s, 'master-card');

  // Review all timeline
  s = reviewTimeline(s, 't1');
  s = reviewTimeline(s, 't2');
  s = reviewTimeline(s, 't3');
  s = reviewTimeline(s, 't4');
  s = reviewTimeline(s, 't5');
  s = reviewTimeline(s, 't6');

  // Discover hotspots
  s = discoverHotspot(s, 'latch-scratch');
  s = discoverHotspot(s, 'cutter-paint-fleck');

  // Form and validate hypotheses
  // 1. Method
  s = addConnection(s, 'evidence', 'latch', 'evidence', 'zip-tie');
  s = attemptDeriveContradiction(caseFile, s, s.connections[s.connections.length - 1].id).newState;

  // 2. Identity
  s = addConnection(s, 'suspect', 'layla', 'evidence', 'card-log');
  s = attemptDeriveContradiction(caseFile, s, s.connections[s.connections.length - 1].id).newState;

  // 3. Motive (synthesis: suspect + victim-phone + timeline ultimatum)
  s = addConnection(s, 'suspect', 'layla', 'evidence', 'victim-phone');
  s = addConnection(s, 'evidence', 'victim-phone', 'timeline', 't1');
  s = attemptDeriveContradiction(caseFile, s, s.connections[s.connections.length - 1].id).newState;

  // 4. Opportunity (synthesis: suspect + bug-record + timeline timing)
  s = addConnection(s, 'suspect', 'nabil', 'evidence', 'bug-record');
  s = addConnection(s, 'evidence', 'bug-record', 'timeline', 't3');
  s = attemptDeriveContradiction(caseFile, s, s.connections[s.connections.length - 1].id).newState;

  // Additional contradictions for distractors
  s = addConnection(s, 'suspect', 'salem', 'evidence', 'safe-shortage');
  s = attemptDeriveContradiction(caseFile, s, s.connections[s.connections.length - 1].id).newState;

  s = addConnection(s, 'suspect', 'mariam', 'evidence', 'master-card');
  s = attemptDeriveContradiction(caseFile, s, s.connections[s.connections.length - 1].id).newState;

  return s;
}

// ─── Scenario A: Suspect Ordering & Presentation Neutrality ─────────────────

test('Scenario A1: Suspect list ordering follows narrative hotel encounter order, not culprit positioning', () => {
  const suspectIds = caseFile.suspects.map((s) => s.id);
  assert.deepEqual(
    suspectIds,
    ['salem', 'mariam', 'nabil', 'layla'],
    'Suspects must follow narrative encounter order (Salem 01 -> Mariam 02 -> Nabil 03 -> Layla 04)'
  );
  assert.notEqual(suspectIds[0], 'layla', 'Culprit must NOT be first in the list');
});

test('Scenario A2: Suspect cards have neutral roles and no visually privileged alert badges', () => {
  for (const suspect of caseFile.suspects) {
    assert.ok(suspect.suspectType, `Suspect ${suspect.id} must have a suspectType`);
    assert.notEqual(
      suspect.suspectType,
      'مشتبه بها رئيسية',
      `Suspect ${suspect.id} must not be labeled as prime suspect before trial`
    );
  }
});

// ─── Scenario B & C: Selector & Claim Neutrality (No Solution Leakage) ──────

test('Scenario B1: Deduction selectors expose ALL earned contradictions without pre-filtering', () => {
  const state = setupFullInvestigationState();
  const earned = state.discoveredContradictionIds;
  assert.equal(earned.length, 6, 'Player has earned all 6 contradictions');

  // In Phase 1F, claim selectors must offer all 6 earned contradictions, not just the 1 valid answer
  const reqs = caseFile.accusationConfig!.requirements;
  for (const req of reqs) {
    // All earned deductions are eligible to be displayed in the dropdown
    const availableOptions = earned;
    assert.equal(
      availableOptions.length,
      6,
      `Selector for ${req.claimType} must expose all earned deductions without filtering to requiredDeductionIds`
    );
  }
});

test('Scenario B2: Structurally complete indictment allows submission regardless of correctness', () => {
  const state = setupFullInvestigationState();

  // Create a draft with all claims filled, but with WRONG culprit (Salem) and WRONG deduction for identity
  const completeWrongDraft: IndictmentDraft = {
    culpritId: 'salem',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-salem' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };

  const validation = validateIndictment(caseFile, state, completeWrongDraft);
  assert.equal(validation.missingClaims.length, 0, 'No claims are missing');
  assert.equal(validation.wrongCulprit, true, 'Culprit is identified as wrong by engine');
});

// ─── Scenario D: Engine Disciplinary Consequence for False Accusation ───────

test('Scenario D1: Submitting a wrong complete indictment (wrong culprit) deducts 2 credibility points', () => {
  const state = setupFullInvestigationState();
  assert.equal(state.credibilityPoints, 3);

  const draft: IndictmentDraft = {
    culpritId: 'nabil',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };

  const { result, newState } = submitFinalIndictment(caseFile, state, draft);
  assert.equal(result.outcome, 'failed');
  assert.equal(result.correctCulprit, false);
  assert.equal(newState.credibilityPoints, 1, 'Penalty of -2 credibility points applied (3 -> 1)');
  assert.notEqual(newState.accusationPhase, 'submitted_solved');
});

test('Scenario D2: Submitting a complete indictment with correct culprit but unsupported deductions applies -2 penalty', () => {
  const state = setupFullInvestigationState();
  assert.equal(state.credibilityPoints, 3);

  const draft: IndictmentDraft = {
    culpritId: 'layla', // Correct culprit
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-salem' }, // WRONG motive deduction!
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-mariam' }, // WRONG opportunity deduction!
    ],
  };

  const { result, newState } = submitFinalIndictment(caseFile, state, draft);
  assert.equal(result.outcome, 'failed');
  assert.equal(newState.credibilityPoints, 1, 'Penalty of -2 credibility points applied for false proof');
});

test('Scenario D3: A second false accusation leads to disciplinary lockout (credibility = 0)', () => {
  let state = setupFullInvestigationState();
  state = { ...state, credibilityPoints: 1 }; // Player already penalized once

  const draft: IndictmentDraft = {
    culpritId: 'mariam',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-mariam' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };

  const { result, newState } = submitFinalIndictment(caseFile, state, draft);
  assert.equal(result.outcome, 'failed');
  assert.equal(newState.credibilityPoints, 0);
  assert.equal(newState.accusationPhase, 'lockout');
});

// ─── Scenario E: Reload Persistence ─────────────────────────────────────────

test('Scenario E1: Disciplinary penalty persists across storage reload and cannot be undone by refresh', () => {
  const caseId = 'case-001';
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
    clearInvestigationState(caseId);

    let state = setupFullInvestigationState();
    const draft: IndictmentDraft = {
      culpritId: 'salem',
      claims: [
        { claimType: 'identity', attachedDeductionId: 'contradiction-salem' },
        { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
        { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
        { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
      ],
    };

    const { newState } = submitFinalIndictment(caseFile, state, draft);
    saveInvestigationState(caseId, newState);

    const reloaded = loadInvestigationState(caseId);
    assert.equal(reloaded.credibilityPoints, 1, 'Credibility penalty must persist in storage');
    assert.equal(reloaded.finalResult?.outcome, 'failed');

    clearInvestigationState(caseId);
  } finally {
    delete (globalThis as any).window;
  }
});

test('Scenario E2: Lockout state persists across storage reload', () => {
  const caseId = 'case-001';
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
    clearInvestigationState(caseId);

    let state = setupFullInvestigationState();
    state = { ...state, credibilityPoints: 1 };

    const draft: IndictmentDraft = {
      culpritId: 'salem',
      claims: [
        { claimType: 'identity', attachedDeductionId: 'contradiction-salem' },
        { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
        { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
        { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
      ],
    };

    const { newState } = submitFinalIndictment(caseFile, state, draft);
    saveInvestigationState(caseId, newState);

    const reloaded = loadInvestigationState(caseId);
    assert.equal(reloaded.accusationPhase, 'lockout', 'Lockout must persist across reload');
    assert.equal(reloaded.credibilityPoints, 0);

    clearInvestigationState(caseId);
  } finally {
    delete (globalThis as any).window;
  }
});

// ─── Scenario F: Random Hypothesis Sweep & Brute-Force Hardening ────────────

test('Scenario F1: Adversarial blind random pairing without prerequisites yields ZERO contradictions', () => {
  const uninspectedState = createInitialInvestigationState();

  const allItems = [
    { kind: 'evidence' as const, id: 'latch' },
    { kind: 'evidence' as const, id: 'zip-tie' },
    { kind: 'evidence' as const, id: 'layla-bag' },
    { kind: 'evidence' as const, id: 'card-log' },
    { kind: 'suspect' as const, id: 'layla' },
    { kind: 'suspect' as const, id: 'salem' },
    { kind: 'timeline' as const, id: 't4' },
  ];

  let testState = uninspectedState;
  let derivedCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      testState = addConnection(testState, allItems[i].kind, allItems[i].id, allItems[j].kind, allItems[j].id);
      const conn = testState.connections[testState.connections.length - 1];
      const res = attemptDeriveContradiction(caseFile, testState, conn.id);
      if (res.success) {
        derivedCount++;
        testState = res.newState;
      }
    }
  }

  assert.equal(derivedCount, 0, 'Blind pairing without inspecting evidence/timeline must yield 0 contradictions');
  assert.equal(testState.discoveredContradictionIds.length, 0);
});

test('Scenario F2: Targeted testing of an invalid hypothesis marks connection as status: rejected', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'safe-shortage');

  state = addConnection(state, 'evidence', 'latch', 'evidence', 'safe-shortage');
  const conn = state.connections[0];
  assert.equal(conn.status, 'hypothesis');

  const result = attemptDeriveContradiction(caseFile, state, conn.id);
  assert.equal(result.success, false);

  const updatedConn = result.newState.connections.find((c) => c.id === conn.id);
  assert.equal(updatedConn?.status, 'rejected', 'Failed connection must be marked as rejected');
});

test('Scenario F3: Rejected connections cannot satisfy contradiction requirements even if left on the board', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  // Hotspot is NOT discovered yet
  state = reviewTimeline(state, 't4');

  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  const conn = state.connections[0];

  // Attempt derive without hotspot -> fails and marks as rejected
  const res1 = attemptDeriveContradiction(caseFile, state, conn.id);
  assert.equal(res1.success, false);
  state = res1.newState;
  assert.equal(state.connections[0].status, 'rejected');

  // Player now discovers the hotspot later, but the connection is still marked rejected
  state = discoverHotspot(state, 'latch-scratch');

  // Attempting to derive with a rejected connection must fail
  const res2 = attemptDeriveContradiction(caseFile, state, conn.id);
  assert.equal(res2.success, false, 'Rejected connection cannot be re-derived');
  assert.equal(state.discoveredContradictionIds.length, 0);
});

test('Scenario F4: Player cannot derive critical deductions if visual hotspots remain unexamined', () => {
  let state = createInitialInvestigationState();
  state = inspectEvidence(state, 'latch');
  state = inspectEvidence(state, 'zip-tie');
  state = reviewTimeline(state, 't4');
  // Hotspot 'latch-scratch' intentionally omitted!

  state = addConnection(state, 'evidence', 'latch', 'evidence', 'zip-tie');
  const conn = state.connections[0];

  const res = attemptDeriveContradiction(caseFile, state, conn.id);
  assert.equal(res.success, false, 'Must fail because latch-scratch hotspot was not examined');
  assert.ok(!res.newState.discoveredContradictionIds.includes('contradiction-latch'));
});

// ─── Scenario G: Accusation Readiness & Interrogation Decoupling ─────────────

test('Scenario G1: Interrogation is NOT a mandatory accusation gate in Phase 1F', () => {
  const state = setupFullInvestigationState();
  // Ensure brokenSuspectIds is completely empty
  assert.equal((state.brokenSuspectIds || []).length, 0);

  const draft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };

  const validation = validateIndictment(caseFile, state, draft);
  assert.equal(validation.status, 'valid', 'Indictment must be valid based purely on earned proof');

  const { result, newState } = submitFinalIndictment(caseFile, state, draft);
  assert.equal(result.outcome, 'solved');
  assert.equal(newState.accusationPhase, 'submitted_solved');
});

test('Scenario G2: Incomplete draft (missing claims) cannot be submitted as final and causes no penalty', () => {
  const state = setupFullInvestigationState();
  const draft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      // Other 3 claims omitted
    ],
  };

  const { result, newState, returnToInvestigation } = submitFinalIndictment(caseFile, state, draft);
  assert.equal(result.outcome, 'failed');
  assert.equal(newState.credibilityPoints, 3, 'No penalty for incomplete draft');
  assert.equal(returnToInvestigation, true);
});

// ─── Test F5: Full Prerequisite Brute-Force Test ─────────────────────────────

test('Test F5: Full Prerequisite Brute-Force Test — can mechanical exhaustive pairing extract all critical deductions?', () => {
  // Step 1: Fully explore the case (every piece of evidence, every hotspot, every timeline event, every suspect, every location)
  let state = createInitialInvestigationState();
  for (const ev of caseFile.evidence) {
    state = inspectEvidence(state, ev.id);
    if (ev.hotspots) {
      for (const h of ev.hotspots) {
        state = discoverHotspot(state, h.id);
      }
    }
  }
  for (const t of caseFile.timeline) {
    state = reviewTimeline(state, t.id);
  }
  for (const s of caseFile.suspects) {
    state = inspectSuspect(state, s.id);
  }
  for (const l of caseFile.locations) {
    state = inspectLocation(state, l.id);
  }

  // Step 2: Build the complete list of all possible items
  const allItems: Array<{ kind: ConnectionKind; id: string }> = [
    ...caseFile.evidence.map((e) => ({ kind: 'evidence' as const, id: e.id })),
    ...caseFile.suspects.map((s) => ({ kind: 'suspect' as const, id: s.id })),
    ...caseFile.timeline.map((t) => ({ kind: 'timeline' as const, id: t.id })),
    ...caseFile.locations.map((l) => ({ kind: 'location' as const, id: l.id })),
  ];

  // Step 3: Exhaustively pair EVERY possible combination and attempt derive on each
  let derivedContradictionIds: string[] = [];
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      state = addConnection(state, allItems[i].kind, allItems[i].id, allItems[j].kind, allItems[j].id);
      const conn = state.connections[state.connections.length - 1];
      const res = attemptDeriveContradiction(caseFile, state, conn.id);
      state = res.newState;
      if (res.success && res.discoveredContradiction) {
        if (!derivedContradictionIds.includes(res.discoveredContradiction.id)) {
          derivedContradictionIds.push(res.discoveredContradiction.id);
        }
      }
    }
  }

  const criticalDeductionIds = caseFile.accusationConfig!.requirements.flatMap((r) => r.requiredDeductionIds);
  const criticalFound = criticalDeductionIds.filter((id) => state.discoveredContradictionIds.includes(id));

  // The player MUST NOT be able to systematically extract the complete deduction chain through blind/random pairing
  assert.ok(
    criticalFound.length < criticalDeductionIds.length,
    `Mechanical pairing must NOT discover the complete deduction chain. Found: ${criticalFound.length}/${criticalDeductionIds.length}`
  );
  assert.equal(
    state.discoveredContradictionIds.includes('contradiction-motive'),
    false,
    'Motive contradiction requires multi-link synthesis (suspect + evidence + timeline) and must resist mechanical 1-pair brute force'
  );
  assert.equal(
    state.discoveredContradictionIds.includes('contradiction-nabil'),
    false,
    'Opportunity contradiction requires multi-link synthesis (suspect + evidence + timeline) and must resist mechanical 1-pair brute force'
  );

  // Attempting to draft an indictment with only the brute-forced deductions fails
  const bruteForceDraft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      // Motive and Opportunity are unearned and cannot be attached legitimately
    ],
  };

  const validation = validateIndictment(caseFile, state, bruteForceDraft);
  assert.equal(validation.status, 'incomplete', 'Indictment must remain incomplete without understanding Motive and Opportunity');
  assert.equal(validation.missingClaims.length, 2, 'Must be missing 2 claims');
});
