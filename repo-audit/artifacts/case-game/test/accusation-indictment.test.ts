/**
 * Phase 1D — Evidence-Based Indictment Test Suite
 * 21 tests including brute-force and lockout
 */
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
  getAccusationConfig,
  type InvestigationState,
  type IndictmentDraft,
  type InvestigationConnection,
} from '../src/lib/case-logic.ts';
import type { Contradiction } from '../src/data/types.ts';

// ─── Test Helpers ──────────────────────────────────────────────────────────

/**
 * Earn a specific contradiction by ID.
 * Prepares all prerequisites then calls attemptDeriveContradiction targeted at each
 * required connection's ID so we bypass the "already found first match" problem.
 */
function earnContradiction(baseState: InvestigationState, contradictionId: string): InvestigationState {
  const contradiction: Contradiction | undefined = caseFile.contradictions.find(
    (c) => c.id === contradictionId,
  );
  if (!contradiction) throw new Error(`contradiction not found: ${contradictionId}`);

  // Already earned — skip
  if (baseState.discoveredContradictionIds.includes(contradictionId)) return baseState;

  let s = baseState;

  // Inspect related evidence
  for (const evId of contradiction.relatedEvidenceIds) {
    s = inspectEvidence(s, evId);
  }
  // Review related timeline
  for (const tId of contradiction.relatedTimelineIds) {
    s = reviewTimeline(s, tId);
  }
  // Discover required hotspots and hotspots on related evidence
  for (const hId of (contradiction.requiredHotspotIds ?? [])) {
    s = discoverHotspot(s, hId);
  }
  for (const evId of contradiction.relatedEvidenceIds) {
    const ev = caseFile.evidence.find((e) => e.id === evId);
    if (ev?.hotspots && ev.hotspots.length > 0) {
      for (const h of ev.hotspots) {
        s = discoverHotspot(s, h.id);
      }
    }
  }
  // Add each required connection, then immediately trigger derivation on that specific connection
  for (const req of (contradiction.requiredConnections ?? [])) {
    s = addConnection(
      s,
      req.itemAKind as 'suspect' | 'evidence' | 'timeline' | 'location',
      req.itemAId,
      req.itemBKind as 'suspect' | 'evidence' | 'timeline' | 'location',
      req.itemBId,
    );
    // Find the connection we just added — it will be the last one since addConnection appends
    const added = s.connections[s.connections.length - 1];
    if (!added) throw new Error(`addConnection failed for ${req.itemAId}↔${req.itemBId}`);

    // Attempt derivation targeted at this specific connection
    const result = attemptDeriveContradiction(caseFile, s, added.id);

    if (result.success && !result.alreadyDiscovered) {
      // Derived a NEW contradiction — update state
      s = result.newState;
    } else if (result.success && result.alreadyDiscovered) {
      // This connection triggered an already-discovered contradiction.
      // Move on — the target contradiction may require a subsequent connection.
    }
    // If not success, the evidence/timeline prerequisites may not be fully met yet
    // (won't happen here since we set them all up first)
  }

  // Verify the contradiction was earned
  if (!s.discoveredContradictionIds.includes(contradictionId)) {
    throw new Error(`earnContradiction: ${contradictionId} was not derived. State: ${JSON.stringify({
      discovered: s.discoveredContradictionIds,
      connections: s.connections.length,
    })}`);
  }
  return s;
}

/** Earn all 4 required deductions for Case 001 */
function earnAllRequiredDeductions(): InvestigationState {
  let s = createInitialInvestigationState();
  s = earnContradiction(s, 'contradiction-latch');
  s = earnContradiction(s, 'contradiction-layla');
  s = earnContradiction(s, 'contradiction-motive');
  s = earnContradiction(s, 'contradiction-nabil');
  return s;
}

/** Build a valid complete draft using the correct culprit and all required deductions */
function buildValidDraft(): IndictmentDraft {
  return {
    culpritId: 'layla',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test('Test 01: Zero deductions + no culprit → all claims missing', () => {
  const state = createInitialInvestigationState();
  const draft: IndictmentDraft = { culpritId: null, claims: [] };
  const result = validateIndictment(caseFile, state, draft);
  assert.equal(result.status, 'incomplete');
  assert.equal(result.missingClaims.length, 4);
});

test('Test 02: Culprit selected + zero deductions → all 4 claims missing', () => {
  const state = createInitialInvestigationState();
  const draft: IndictmentDraft = { culpritId: 'layla', claims: [] };
  const result = validateIndictment(caseFile, state, draft);
  assert.equal(result.status, 'incomplete');
  assert.equal(result.missingClaims.length, 4);
});

test('Test 03: Unearned deduction in draft → unsupported claim', () => {
  const state = createInitialInvestigationState();
  // Player types in a deduction ID they never earned
  const draft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [{ claimType: 'identity', attachedDeductionId: 'contradiction-layla' }],
  };
  const result = validateIndictment(caseFile, state, draft);
  assert.equal(result.status, 'incomplete');
  assert.ok(result.unsupportedClaims.includes('identity'), 'Unearned deduction must be unsupported');
});

test('Test 04: Earned deduction used for wrong claim type → unsupported', () => {
  let s = createInitialInvestigationState();
  s = earnContradiction(s, 'contradiction-nabil'); // opportunity deduction

  const draft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [
      // Using opportunity deduction for identity claim — wrong semantic
      { claimType: 'identity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
  const result = validateIndictment(caseFile, s, draft);
  assert.equal(result.status, 'incomplete');
  assert.ok(result.unsupportedClaims.includes('identity'), 'Wrong semantic claim mapping must be rejected');
});

test('Test 05: Correct proof for identity only → 3 claims still missing', () => {
  let s = createInitialInvestigationState();
  s = earnContradiction(s, 'contradiction-layla');

  const draft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [{ claimType: 'identity', attachedDeductionId: 'contradiction-layla' }],
  };
  const result = validateIndictment(caseFile, s, draft);
  assert.equal(result.status, 'incomplete');
  assert.equal(result.missingClaims.length, 3);
  assert.ok(!result.missingClaims.includes('identity'));
});

test('Test 06: All proofs correct + correct culprit → valid', () => {
  const s = earnAllRequiredDeductions();
  const draft = buildValidDraft();
  const result = validateIndictment(caseFile, s, draft);
  assert.equal(result.status, 'valid');
  assert.equal(result.missingClaims.length, 0);
  assert.equal(result.unsupportedClaims.length, 0);
  assert.equal(result.wrongCulprit, false);
});

test('Test 07: All proofs correct + wrong culprit → false status', () => {
  const s = earnAllRequiredDeductions();
  const draft: IndictmentDraft = {
    culpritId: 'salem', // WRONG
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
  const result = validateIndictment(caseFile, s, draft);
  assert.equal(result.status, 'false');
  assert.equal(result.wrongCulprit, true);
  assert.equal(result.missingClaims.length, 0);
  assert.equal(result.unsupportedClaims.length, 0);
});

test('Test 08: Unrelated earned deduction (salem) cannot satisfy motive claim', () => {
  let s = createInitialInvestigationState();
  s = earnContradiction(s, 'contradiction-salem');
  s = earnContradiction(s, 'contradiction-layla');
  s = earnContradiction(s, 'contradiction-latch');
  s = earnContradiction(s, 'contradiction-nabil');

  const draft: IndictmentDraft = {
    culpritId: 'layla',
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-salem' }, // WRONG
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
  const result = validateIndictment(caseFile, s, draft);
  assert.equal(result.status, 'incomplete');
  assert.ok(result.unsupportedClaims.includes('motive'), 'Salem deduction cannot prove motive');
});

test('Test 09: accusationConfig culprit matches the actual culprit', () => {
  const config = getAccusationConfig(caseFile);
  assert.equal(config.culpritId, 'layla', 'Culprit must be layla');
  assert.equal(config.requirements.length, 4, 'Must have 4 requirements');
  const types = config.requirements.map((r) => r.claimType);
  assert.ok(types.includes('identity'));
  assert.ok(types.includes('motive'));
  assert.ok(types.includes('method'));
  assert.ok(types.includes('opportunity'));
});

test('Test 10: Motive ≠ Identity — contradiction-motive != contradiction-layla', () => {
  const config = getAccusationConfig(caseFile);
  const identity = config.requirements.find((r) => r.claimType === 'identity')!;
  const motive = config.requirements.find((r) => r.claimType === 'motive')!;
  assert.ok(!identity.requiredDeductionIds.includes('contradiction-motive'), 'Motive must not satisfy identity claim');
  assert.ok(!motive.requiredDeductionIds.includes('contradiction-layla'), 'Identity must not satisfy motive claim');
});

test('Test 11: submitFinalIndictment solved → accusationPhase = submitted_solved', () => {
  const s = earnAllRequiredDeductions();
  const draft = buildValidDraft();
  const { result, newState } = submitFinalIndictment(caseFile, s, draft);
  assert.equal(result.outcome, 'solved');
  assert.equal(result.correctCulprit, true);
  assert.equal(newState.accusationPhase, 'submitted_solved');
  assert.ok(newState.finalResult, 'finalResult must be set');
  assert.equal(newState.finalResult?.outcome, 'solved');
});

test('Test 12: False accusation applies -2 credibility penalty', () => {
  const s = earnAllRequiredDeductions();
  const initial = s.credibilityPoints;
  const draft: IndictmentDraft = {
    culpritId: 'nabil', // WRONG
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
  const { result, newState } = submitFinalIndictment(caseFile, s, draft);
  assert.equal(result.outcome, 'failed');
  assert.equal(newState.credibilityPoints, Math.max(0, initial - 2));
  assert.notEqual(newState.accusationPhase, 'submitted_solved');
});

test('Test 13: Investigation progress preserved after failed accusation', () => {
  const s = earnAllRequiredDeductions();
  const origDiscovered = [...s.discoveredContradictionIds];
  const origInspected = [...s.inspectedEvidenceIds];
  const origConnections = s.connections.length;

  const draft: IndictmentDraft = {
    culpritId: 'mariam', // WRONG
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
  const { newState } = submitFinalIndictment(caseFile, s, draft);
  assert.deepEqual(newState.discoveredContradictionIds, origDiscovered);
  assert.deepEqual(newState.inspectedEvidenceIds, origInspected);
  assert.equal(newState.connections.length, origConnections);
  assert.equal(newState.reviewedTimelineIds.length, s.reviewedTimelineIds.length);
});

test('Test 14: Incomplete indictment rejected without penalty', () => {
  const s = earnAllRequiredDeductions();
  const initial = s.credibilityPoints;
  const draft: IndictmentDraft = { culpritId: 'layla', claims: [] }; // Incomplete

  const { result, newState } = submitFinalIndictment(caseFile, s, draft);
  assert.equal(result.outcome, 'failed');
  assert.equal(newState.credibilityPoints, initial, 'No penalty for incomplete');
  assert.notEqual(newState.accusationPhase, 'lockout');
  assert.deepEqual(newState.discoveredContradictionIds, s.discoveredContradictionIds);
});

test('Test 15: Lockout when credibility reaches 0 from false accusation', () => {
  let s = earnAllRequiredDeductions();
  s = { ...s, credibilityPoints: 1 }; // Near-zero

  const draft: IndictmentDraft = {
    culpritId: 'salem', // WRONG
    claims: [
      { claimType: 'identity', attachedDeductionId: 'contradiction-layla' },
      { claimType: 'motive', attachedDeductionId: 'contradiction-motive' },
      { claimType: 'method', attachedDeductionId: 'contradiction-latch' },
      { claimType: 'opportunity', attachedDeductionId: 'contradiction-nabil' },
    ],
  };
  const { newState } = submitFinalIndictment(caseFile, s, draft);
  assert.equal(newState.credibilityPoints, 0, 'Credibility must be 0');
  assert.equal(newState.accusationPhase, 'lockout', 'Must enter lockout');

  // Investigation data preserved even in lockout
  assert.ok(newState.discoveredContradictionIds.length > 0, 'Contradictions preserved in lockout');
});

test('Test 16: No-op on already submitted_solved — second submission rejected', () => {
  const s = earnAllRequiredDeductions();
  const draft = buildValidDraft();

  const { newState: solvedState } = submitFinalIndictment(caseFile, s, draft);
  assert.equal(solvedState.accusationPhase, 'submitted_solved');

  // Second call
  const { result: r2, newState: s2 } = submitFinalIndictment(caseFile, solvedState, draft);
  assert.equal(s2.accusationPhase, 'submitted_solved', 'Phase must stay submitted_solved');
  assert.equal(s2.credibilityPoints, solvedState.credibilityPoints, 'No penalty on no-op');
});

test('Test 17: No-op on lockout phase — no additional penalty', () => {
  let s = earnAllRequiredDeductions();
  s = { ...s, credibilityPoints: 0, accusationPhase: 'lockout' };

  const draft = buildValidDraft();
  const { result, newState } = submitFinalIndictment(caseFile, s, draft);
  assert.equal(newState.accusationPhase, 'lockout', 'Phase stays lockout');
  assert.equal(newState.credibilityPoints, 0, 'Credibility cannot go below 0');
});

test('Test 18: Phase 1A+B regression — inspector cannot derive contradiction without connection', () => {
  let s = createInitialInvestigationState();
  s = inspectEvidence(s, 'latch');
  s = inspectEvidence(s, 'zip-tie');
  s = discoverHotspot(s, 'latch-scratch');
  s = reviewTimeline(s, 't4');
  // NO connection added
  const r = attemptDeriveContradiction(caseFile, s);
  assert.equal(r.success, false, 'Must not derive without connection');
  assert.equal(s.discoveredContradictionIds.length, 0);
});

test('Test 19: Motive contradiction is independently earned from identity', () => {
  let s = createInitialInvestigationState();
  // Earn only identity (layla) — motive is NOT yet earned
  s = earnContradiction(s, 'contradiction-layla');
  assert.ok(s.discoveredContradictionIds.includes('contradiction-layla'));
  assert.ok(!s.discoveredContradictionIds.includes('contradiction-motive'),
    'Motive must not be auto-revealed when identity is earned');

  // Now earn motive separately
  s = earnContradiction(s, 'contradiction-motive');
  assert.ok(s.discoveredContradictionIds.includes('contradiction-motive'),
    'Motive must be separately earnable');
});

test('Test BF: Brute-force — unaided player cannot produce solved outcome', () => {
  const freshState = createInitialInvestigationState();
  const suspects = caseFile.suspects.map((s) => s.id);
  const claimTypes = ['identity', 'motive', 'method', 'opportunity'] as const;
  const deductionIds = caseFile.contradictions.map((c) => c.id);

  let solvedCount = 0;

  for (const suspectId of suspects) {
    for (const d0 of deductionIds) {
      for (const d1 of deductionIds) {
        // Only test a few combinations to keep test fast
        if (d0 === d1) continue;
        const draft: IndictmentDraft = {
          culpritId: suspectId,
          claims: [
            { claimType: 'identity', attachedDeductionId: d0 },
            { claimType: 'motive', attachedDeductionId: d1 },
            { claimType: 'method', attachedDeductionId: deductionIds[0] },
            { claimType: 'opportunity', attachedDeductionId: deductionIds[1] },
          ],
        };
        const { result } = submitFinalIndictment(caseFile, freshState, draft);
        if (result.outcome === 'solved') solvedCount++;
      }
    }
  }

  assert.equal(solvedCount, 0, 'No combination should solve without earned deductions');
});
