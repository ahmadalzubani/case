import type {
  CaseFile,
  CaseSolution,
  Evidence,
  Location,
  Suspect,
  TimelineEvent,
  Contradiction,
  ConnectionRequirement,
  ChallengeEffectiveness,
  InterrogationChallenge,
  InterrogationStatement,
  IndictmentClaimType,
  AccusationRequirement,
  CaseAccusationConfig,
} from '@/types/game.types';

export type Inspectable = Suspect | Location | Evidence | TimelineEvent;

export type ConnectionKind = 'evidence' | 'suspect' | 'timeline' | 'location';

export type ConnectionStatus = 'hypothesis' | 'validated' | 'rejected';

export type InvestigationConnection = {
  id: string;
  fromKind: ConnectionKind;
  fromId: string;
  toKind: ConnectionKind;
  toId: string;
  status: ConnectionStatus;
  createdAt?: number;
};

export type NotebookState = {
  evidenceIds: string[];
  suspectIds: string[];
  timelineIds: string[];
  clueIds: string[];
  contradictionIds: string[];
  notes: string;
};

export type InvestigationState = {
  inspectedEvidenceIds: string[];
  discoveredHotspotIds: string[];
  reviewedTimelineIds: string[];
  inspectedSuspectIds: string[];
  inspectedLocationIds: string[];
  brokenSuspectIds: string[];
  credibilityPoints: number;
  notebook: NotebookState;
  connections: InvestigationConnection[];
  discoveredContradictionIds: string[];
  validatedDeductionIds: string[];
  unlockedStatementIds: string[];
  challengedStatementIds: string[];
  // ── Phase 1D: Evidence-Based Indictment ──────────────────────────────────
  /** Autosaved draft being assembled by the player. */
  indictmentDraft?: IndictmentDraft;
  /** Persistent lifecycle phase of the final accusation. */
  accusationPhase?: AccusationPhase;
  /** Result produced by submitFinalIndictment(). Replaces legacy result?. */
  finalResult?: FinalAccusationResult;
  // ── Legacy fields (kept for backward-compat with old saves) ─────────────
  accusation?: PlayerAccusation;
  result?: AccusationResult;
};

export type PlayerAccusation = {
  culpritId: string;
  motive: string;
  method: string;
  time: string;
};

export type AccusationOutcome = 'excellent' | 'partial' | 'wrong';

// ─── Legacy AccusationResult (kept for backward-compat with old saves) ──────
export type AccusationResult = {
  outcome: AccusationOutcome;
  correctCulprit: boolean;
  correctMotive: boolean;
  correctMethod: boolean;
  criticalEvidenceFound: number;
  criticalEvidenceTotal: number;
  criticalTimelineFound: number;
  criticalTimelineTotal: number;
  contradictionsFound: number;
  contradictionsTotal: number;
};

// ─── Phase 1D: Evidence-Based Indictment Engine Types ────────────────────────

/**
 * A single slot in the player's indictment draft.
 * null = player has not attached proof to this claim yet.
 */
export type IndictmentClaimEntry = {
  claimType: IndictmentClaimType;
  attachedDeductionId: string | null;
};

/**
 * The player's draft indictment before final submission.
 * Autosaved to localStorage as the player builds it.
 */
export type IndictmentDraft = {
  culpritId: string | null;
  claims: IndictmentClaimEntry[];
};

/**
 * Lifecycle phase of the final accusation in the current case run.
 * 'drafting'          — player composing indictment (default)
 * 'submitted_solved'  — correct indictment filed; cinematic success shown
 * 'lockout'           — credibility hit 0 due to false accusation; no further attempts
 */
export type AccusationPhase = 'drafting' | 'submitted_solved' | 'lockout';

export type IndictmentValidationStatus = 'incomplete' | 'valid' | 'false';

export type IndictmentValidationResult = {
  status: IndictmentValidationStatus;
  /** Claim types for which the player provided no deduction at all. */
  missingClaims: IndictmentClaimType[];
  /** Claim types for which the player attached a deduction not in the required set. */
  unsupportedClaims: IndictmentClaimType[];
  /** Whether the player selected the wrong culprit (even if proof is internally consistent). */
  wrongCulprit: boolean;
};

/**
 * The authoritative result produced by submitFinalIndictment().
 * Replaces the legacy AccusationResult for all Phase 1D+ flows.
 */
export type FinalAccusationResult = {
  outcome: 'solved' | 'failed';
  correctCulprit: boolean;
  validatedClaims: IndictmentClaimType[];
  missingClaims: IndictmentClaimType[];
  unsupportedClaims: IndictmentClaimType[];
  submittedCulpritId: string | null;
  /** The deduction the player attached to each claim at submission time. */
  submittedDeductionMap: Partial<Record<IndictmentClaimType, string | null>>;
  /** All contradictions the player had earned at submission time. */
  earnedContradictionIds: string[];
  // Kept for CinematicReveal dossier breakdown
  criticalEvidenceFound: number;
  criticalEvidenceTotal: number;
  contradictionsFound: number;
  contradictionsTotal: number;
};

export function getInvestigationStorageKey(caseId: string) {
  return `case-investigation-${caseId}`;
}

export function getCaseStats(caseFile: CaseFile) {
  return [
    { label: 'المشتبه بهم', value: caseFile.suspects.length, key: 'suspects' },
    { label: 'الأدلة', value: caseFile.evidence.length, key: 'evidence' },
    { label: 'المواقع', value: caseFile.locations.length, key: 'locations' },
  ];
}

export function formatEvidenceIndex(index: number) {
  return String(index + 1).padStart(2, '0');
}

export function inspectableKind(item: Inspectable) {
  if ('role' in item) return 'مشتبه به';
  if ('foundAt' in item) return 'دليل';
  if ('time' in item) return 'حدث زمني';
  return 'موقع';
}

export function getInitialSelection(caseFile: CaseFile) {
  const initialTimeline = caseFile.timeline.find((t) => t.id === caseFile.initialTimelineId) || caseFile.timeline[0];
  return {
    suspect: caseFile.suspects[0],
    location: caseFile.locations[0],
    evidence: caseFile.evidence[0],
    timeline: initialTimeline,
  };
}

export function createInitialInvestigationState(): InvestigationState {
  return {
    inspectedEvidenceIds: [],
    discoveredHotspotIds: [],
    reviewedTimelineIds: [],
    inspectedSuspectIds: [],
    inspectedLocationIds: [],
    brokenSuspectIds: [],
    credibilityPoints: 3,
    notebook: {
      evidenceIds: [],
      suspectIds: [],
      timelineIds: [],
      clueIds: [],
      contradictionIds: [],
      notes: '',
    },
    connections: [],
    discoveredContradictionIds: [],
    validatedDeductionIds: [],
    unlockedStatementIds: [],
    challengedStatementIds: [],
  };
}

export function loadInvestigationState(caseId: string): InvestigationState {
  if (typeof window === 'undefined') return createInitialInvestigationState();

  try {
    const storageKey = getInvestigationStorageKey(caseId);
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return createInitialInvestigationState();
    const initial = createInitialInvestigationState();
    const parsedValue: unknown = JSON.parse(saved);
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return initial;
    }
    const parsed = parsedValue as Partial<InvestigationState> & { notes?: unknown };
    const asStringArray = (value: unknown, fallback: string[]) =>
      Array.isArray(value) && value.every((item) => typeof item === 'string')
        ? value
        : fallback;
    const parsedNotebook = parsed.notebook && typeof parsed.notebook === 'object'
      ? parsed.notebook as Partial<NotebookState>
      : undefined;
    const asAccusation = (value: unknown): PlayerAccusation | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      const candidate = value as Partial<PlayerAccusation>;
      return typeof candidate.culpritId === 'string' &&
        typeof candidate.motive === 'string' &&
        typeof candidate.method === 'string' &&
        typeof candidate.time === 'string'
        ? {
            culpritId: candidate.culpritId,
            motive: candidate.motive,
            method: candidate.method,
            time: candidate.time,
          }
        : undefined;
    };
    const asResult = (value: unknown): AccusationResult | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      const candidate = value as Partial<AccusationResult>;
      const outcome = candidate.outcome;
      if (outcome !== 'excellent' && outcome !== 'partial' && outcome !== 'wrong') {
        return undefined;
      }
      const correctCulprit = candidate.correctCulprit;
      const correctMotive = candidate.correctMotive;
      const correctMethod = candidate.correctMethod;
      if (
        typeof correctCulprit !== 'boolean' ||
        typeof correctMotive !== 'boolean' ||
        typeof correctMethod !== 'boolean'
      ) {
        return undefined;
      }
      const criticalEvidenceFound = candidate.criticalEvidenceFound;
      const criticalEvidenceTotal = candidate.criticalEvidenceTotal;
      const criticalTimelineFound = candidate.criticalTimelineFound;
      const criticalTimelineTotal = candidate.criticalTimelineTotal;
      const contradictionsFound = candidate.contradictionsFound;
      const contradictionsTotal = candidate.contradictionsTotal;
      const numberFields = [
        criticalEvidenceFound,
        criticalEvidenceTotal,
        criticalTimelineFound,
        criticalTimelineTotal,
        contradictionsFound,
        contradictionsTotal,
      ];
      if (!numberFields.every((field) => typeof field === 'number' && Number.isFinite(field))) {
        return undefined;
      }
      if (
        typeof criticalEvidenceFound !== 'number' ||
        typeof criticalEvidenceTotal !== 'number' ||
        typeof criticalTimelineFound !== 'number' ||
        typeof criticalTimelineTotal !== 'number' ||
        typeof contradictionsFound !== 'number' ||
        typeof contradictionsTotal !== 'number'
      ) {
        return undefined;
      }
      return {
        outcome,
        correctCulprit,
        correctMotive,
        correctMethod,
        criticalEvidenceFound,
        criticalEvidenceTotal,
        criticalTimelineFound,
        criticalTimelineTotal,
        contradictionsFound,
        contradictionsTotal,
      };
    };
    // ── Phase 1D parsers ───────────────────────────────────────────────
    const CLAIM_TYPES: IndictmentClaimType[] = ['identity', 'motive', 'method', 'opportunity'];
    const asIndictmentDraft = (value: unknown): IndictmentDraft | undefined => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const candidate = value as Record<string, unknown>;
      const culpritId = typeof candidate.culpritId === 'string' ? candidate.culpritId : null;
      const rawClaims = Array.isArray(candidate.claims) ? candidate.claims : [];
      const claims: IndictmentClaimEntry[] = rawClaims
        .filter(
          (c) =>
            c &&
            typeof c === 'object' &&
            CLAIM_TYPES.includes((c as Record<string, unknown>).claimType as IndictmentClaimType),
        )
        .map((c) => ({
          claimType: (c as Record<string, unknown>).claimType as IndictmentClaimType,
          attachedDeductionId:
            typeof (c as Record<string, unknown>).attachedDeductionId === 'string'
              ? ((c as Record<string, unknown>).attachedDeductionId as string)
              : null,
        }));
      return { culpritId, claims };
    };
    const asAccusationPhase = (value: unknown): AccusationPhase | undefined => {
      if (value === 'drafting' || value === 'submitted_solved' || value === 'lockout') return value;
      return undefined;
    };
    const asFinalResult = (value: unknown): FinalAccusationResult | undefined => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const c = value as Record<string, unknown>;
      if (c.outcome !== 'solved' && c.outcome !== 'failed') return undefined;
      if (typeof c.correctCulprit !== 'boolean') return undefined;
      const validatedClaims = Array.isArray(c.validatedClaims)
        ? (c.validatedClaims as unknown[]).filter((x): x is IndictmentClaimType =>
            CLAIM_TYPES.includes(x as IndictmentClaimType),
          )
        : [];
      return {
        outcome: c.outcome,
        correctCulprit: c.correctCulprit,
        validatedClaims,
        missingClaims: Array.isArray(c.missingClaims)
          ? (c.missingClaims as unknown[]).filter((x): x is IndictmentClaimType =>
              CLAIM_TYPES.includes(x as IndictmentClaimType),
            )
          : [],
        unsupportedClaims: Array.isArray(c.unsupportedClaims)
          ? (c.unsupportedClaims as unknown[]).filter((x): x is IndictmentClaimType =>
              CLAIM_TYPES.includes(x as IndictmentClaimType),
            )
          : [],
        submittedCulpritId: typeof c.submittedCulpritId === 'string' ? c.submittedCulpritId : null,
        submittedDeductionMap:
          c.submittedDeductionMap && typeof c.submittedDeductionMap === 'object'
            ? (c.submittedDeductionMap as Partial<Record<IndictmentClaimType, string | null>>)
            : {},
        earnedContradictionIds: asStringArray(c.earnedContradictionIds, []),
        criticalEvidenceFound: typeof c.criticalEvidenceFound === 'number' ? c.criticalEvidenceFound : 0,
        criticalEvidenceTotal: typeof c.criticalEvidenceTotal === 'number' ? c.criticalEvidenceTotal : 0,
        contradictionsFound: typeof c.contradictionsFound === 'number' ? c.contradictionsFound : 0,
        contradictionsTotal: typeof c.contradictionsTotal === 'number' ? c.contradictionsTotal : 0,
      };
    };
    return {
      ...initial,
      inspectedEvidenceIds: asStringArray(parsed.inspectedEvidenceIds, initial.inspectedEvidenceIds),
      discoveredHotspotIds: asStringArray(parsed.discoveredHotspotIds, initial.discoveredHotspotIds),
      reviewedTimelineIds: asStringArray(parsed.reviewedTimelineIds, initial.reviewedTimelineIds),
      inspectedSuspectIds: asStringArray(parsed.inspectedSuspectIds, initial.inspectedSuspectIds),
      inspectedLocationIds: asStringArray(parsed.inspectedLocationIds, initial.inspectedLocationIds),
      brokenSuspectIds: asStringArray(parsed.brokenSuspectIds, initial.brokenSuspectIds),
      credibilityPoints: typeof parsed.credibilityPoints === 'number' && Number.isFinite(parsed.credibilityPoints)
        ? Math.max(0, Math.min(3, parsed.credibilityPoints))
        : initial.credibilityPoints,
      notebook: {
        evidenceIds: asStringArray(parsedNotebook?.evidenceIds, initial.notebook.evidenceIds),
        suspectIds: asStringArray(parsedNotebook?.suspectIds, initial.notebook.suspectIds),
        timelineIds: asStringArray(parsedNotebook?.timelineIds, initial.notebook.timelineIds),
        clueIds: asStringArray(parsedNotebook?.clueIds, initial.notebook.clueIds),
        contradictionIds: asStringArray(parsedNotebook?.contradictionIds, initial.notebook.contradictionIds),
        notes: typeof parsedNotebook?.notes === 'string'
          ? parsedNotebook.notes
          : typeof parsed.notes === 'string'
            ? parsed.notes
            : initial.notebook.notes,
      },
      discoveredContradictionIds: asStringArray(
        parsed.discoveredContradictionIds,
        initial.discoveredContradictionIds,
      ),
      validatedDeductionIds: asStringArray(
        parsed.validatedDeductionIds,
        initial.validatedDeductionIds,
      ),
      unlockedStatementIds: asStringArray(
        parsed.unlockedStatementIds,
        initial.unlockedStatementIds,
      ),
      challengedStatementIds: asStringArray(
        parsed.challengedStatementIds,
        initial.challengedStatementIds,
      ),
      connections: Array.isArray(parsed.connections)
        ? parsed.connections
            .filter(
              (connection) =>
                connection &&
                typeof connection === 'object' &&
                typeof connection.id === 'string' &&
                typeof connection.fromKind === 'string' &&
                typeof connection.fromId === 'string' &&
                typeof connection.toKind === 'string' &&
                typeof connection.toId === 'string',
            )
            .map((conn) => ({
              id: conn.id,
              fromKind: conn.fromKind as ConnectionKind,
              fromId: conn.fromId,
              toKind: conn.toKind as ConnectionKind,
              toId: conn.toId,
              status:
                conn.status === 'validated' ||
                conn.status === 'rejected' ||
                conn.status === 'hypothesis'
                  ? conn.status
                  : 'hypothesis',
              createdAt: typeof conn.createdAt === 'number' ? conn.createdAt : Date.now(),
            }))
        : [],
      // Legacy fields
      accusation: asAccusation(parsed.accusation),
      result: asResult(parsed.result),
      // Phase 1D fields
      indictmentDraft: asIndictmentDraft(parsed.indictmentDraft),
      accusationPhase: asAccusationPhase(parsed.accusationPhase),
      finalResult: asFinalResult(parsed.finalResult),
    };
  } catch {
    return createInitialInvestigationState();
  }
}

export function saveInvestigationState(caseId: string, state: InvestigationState) {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getInvestigationStorageKey(caseId);
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // The investigation remains playable when storage is unavailable.
  }
}

export function clearInvestigationState(caseId: string) {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getInvestigationStorageKey(caseId);
    window.localStorage.removeItem(storageKey);
  } catch {
    // Clearing is best-effort when storage is unavailable.
  }
}

export function getInvestigationProgress(caseFile: CaseFile, state: InvestigationState) {
  const discoveredContradictions = getDiscoveredContradictions(caseFile, state);
  return {
    evidence: state.inspectedEvidenceIds.length,
    evidenceTotal: caseFile.evidence.length,
    timeline: state.reviewedTimelineIds.length,
    timelineTotal: caseFile.timeline.length,
    suspects: state.inspectedSuspectIds.length,
    suspectsTotal: caseFile.suspects.length,
    locations: state.inspectedLocationIds.length,
    locationsTotal: caseFile.locations.length,
    contradictions: discoveredContradictions.length,
    contradictionsTotal: caseFile.contradictions.length,
  };
}

export function getDiscoveredContradictions(
  caseFile: CaseFile,
  state: InvestigationState,
): Contradiction[] {
  const discoveredIds = state.discoveredContradictionIds || [];
  return caseFile.contradictions.filter((contradiction) =>
    discoveredIds.includes(contradiction.id),
  );
}

/**
 * Validates whether a contradiction's player-reasoning requirements are satisfied.
 * Requirements:
 * 1. Player has inspected all required evidence.
 * 2. Player has reviewed all required timeline events.
 * 3. Player has discovered required visual hotspots (if any).
 * 4. Player has created all required hypotheses/connections.
 * If specificConnection is passed, it must match one of the required connections.
 */
export function checkContradictionRequirements(
  contradiction: Contradiction,
  caseFile: CaseFile,
  state: InvestigationState,
  specificConnection?: InvestigationConnection,
): { satisfied: boolean; matchingConnectionIds: string[] } {
  // 1. Must have inspected required evidence items
  const hasEvidence = contradiction.relatedEvidenceIds.every((id) =>
    state.inspectedEvidenceIds.includes(id),
  );
  if (!hasEvidence) return { satisfied: false, matchingConnectionIds: [] };

  // 2. Must have reviewed required timeline events
  const hasTimeline = contradiction.relatedTimelineIds.every((id) =>
    state.reviewedTimelineIds.includes(id),
  );
  if (!hasTimeline) return { satisfied: false, matchingConnectionIds: [] };

  // 3. Must have discovered required hotspots (if any defined)
  const discoveredHotspots = state.discoveredHotspotIds || [];
  if (contradiction.requiredHotspotIds && contradiction.requiredHotspotIds.length > 0) {
    const hasRequiredHotspots = contradiction.requiredHotspotIds.every((hid) =>
      discoveredHotspots.includes(hid),
    );
    if (!hasRequiredHotspots) return { satisfied: false, matchingConnectionIds: [] };
  }

  // 4. If any related evidence has visual hotspots, player must have discovered at least one hotspot for it
  const relatedVisualEvidences = caseFile.evidence.filter(
    (ev) => contradiction.relatedEvidenceIds.includes(ev.id) && ev.hotspots && ev.hotspots.length > 0,
  );
  if (relatedVisualEvidences.length > 0) {
    const allVisualVerified = relatedVisualEvidences.every((ev) =>
      ev.hotspots!.some((h) => discoveredHotspots.includes(h.id)),
    );
    if (!allVisualVerified) return { satisfied: false, matchingConnectionIds: [] };
  }

  // 5. Must have formed the case-defined required connections/hypotheses
  const reqs = contradiction.requiredConnections || [];
  if (reqs.length === 0) {
    // If no connection requirements are specified, cannot be derived via connections alone
    return { satisfied: false, matchingConnectionIds: [] };
  }

  const matchingConnectionIds: string[] = [];

  for (const req of reqs) {
    const matched = state.connections.find((conn) => {
      if (conn.status === 'rejected') return false;
      const matchForward =
        conn.fromId === req.itemAId &&
        conn.fromKind === req.itemAKind &&
        conn.toId === req.itemBId &&
        conn.toKind === req.itemBKind;
      const matchReverse =
        conn.fromId === req.itemBId &&
        conn.fromKind === req.itemBKind &&
        conn.toId === req.itemAId &&
        conn.toKind === req.itemAKind;
      return matchForward || matchReverse;
    });

    if (!matched) {
      return { satisfied: false, matchingConnectionIds: [] };
    }
    matchingConnectionIds.push(matched.id);
  }

  // If testing a specific connection, it must be part of this contradiction
  if (specificConnection && !matchingConnectionIds.includes(specificConnection.id)) {
    return { satisfied: false, matchingConnectionIds: [] };
  }

  return { satisfied: true, matchingConnectionIds };
}

export type DeductionValidationResult = {
  success: boolean;
  discoveredContradiction?: Contradiction;
  alreadyDiscovered?: boolean;
  message: string;
  newState: InvestigationState;
};

/**
 * Player-initiated deduction validation ("استنتاج تعارض").
 * Tests either a specific hypothesis or all hypotheses against case contradiction rules.
 * Never leaks the correct solution on failure.
 */
export function attemptDeriveContradiction(
  caseFile: CaseFile,
  state: InvestigationState,
  connectionId?: string,
): DeductionValidationResult {
  const specificConn = connectionId
    ? state.connections.find((c) => c.id === connectionId)
    : undefined;

  if (connectionId && !specificConn) {
    return {
      success: false,
      message: 'الفرضية المحددة غير موجودة في لوحة التحقيق.',
      newState: state,
    };
  }

  if (specificConn && specificConn.status === 'rejected') {
    return {
      success: false,
      message: 'هذه الفرضية تم فحصها سابقاً وتبين عدم كفاية القرائن لإثباتها.',
      newState: state,
    };
  }

  // Scan case contradictions
  for (const contradiction of caseFile.contradictions) {
    const { satisfied, matchingConnectionIds } = checkContradictionRequirements(
      contradiction,
      caseFile,
      state,
      specificConn,
    );

    if (satisfied) {
      const alreadyDiscovered = (state.discoveredContradictionIds || []).includes(
        contradiction.id,
      );

      if (alreadyDiscovered) {
        return {
          success: true,
          discoveredContradiction: contradiction,
          alreadyDiscovered: true,
          message: `تم إثبات هذا التناقض مسبقاً: ${contradiction.title}`,
          newState: state,
        };
      }

      // Mark matched connections as validated
      const updatedConnections = state.connections.map((conn) =>
        matchingConnectionIds.includes(conn.id)
          ? { ...conn, status: 'validated' as ConnectionStatus }
          : conn,
      );

      const nextDiscovered = [...(state.discoveredContradictionIds || []), contradiction.id];
      const nextValidated = Array.from(
        new Set([...(state.validatedDeductionIds || []), contradiction.id, ...matchingConnectionIds]),
      );

      const updatedNotebook = {
        ...state.notebook,
        contradictionIds: state.notebook.contradictionIds.includes(contradiction.id)
          ? state.notebook.contradictionIds
          : [...state.notebook.contradictionIds, contradiction.id],
      };

      const newState: InvestigationState = {
        ...state,
        connections: updatedConnections,
        discoveredContradictionIds: nextDiscovered,
        validatedDeductionIds: nextValidated,
        notebook: updatedNotebook,
      };

      return {
        success: true,
        discoveredContradiction: contradiction,
        alreadyDiscovered: false,
        message: `تم إثبات التناقض بنجاح: ${contradiction.title}`,
        newState,
      };
    }
  }

  // Targeted hypothesis failed: mark connection as rejected so player sees the outcome
  if (specificConn) {
    const updatedConnections = state.connections.map((c) =>
      c.id === specificConn.id ? { ...c, status: 'rejected' as ConnectionStatus } : c,
    );
    return {
      success: false,
      message: 'القرائن المتاحة غير كافية لإثبات هذا الاستنتاج. يلزم مزيد من التدقيق والربط المنطقي بين الأدلة.',
      newState: { ...state, connections: updatedConnections },
    };
  }

  // Restrained failure feedback without leaking answers
  return {
    success: false,
    message: 'القرائن المتاحة غير كافية لإثبات هذا الاستنتاج. يلزم مزيد من التدقيق والربط المنطقي بين الأدلة.',
    newState: state,
  };
}

export function discoverHotspot(state: InvestigationState, hotspotId: string): InvestigationState {
  const currentHotspots = state.discoveredHotspotIds || [];
  if (currentHotspots.includes(hotspotId)) return state;
  return {
    ...state,
    discoveredHotspotIds: [...currentHotspots, hotspotId],
  };
}

export function deductCredibility(state: InvestigationState): InvestigationState {
  return {
    ...state,
    credibilityPoints: Math.max(0, (state.credibilityPoints ?? 3) - 1),
  };
}

export function breakSuspect(state: InvestigationState, suspectId: string): InvestigationState {
  const currentBroken = state.brokenSuspectIds || [];
  if (currentBroken.includes(suspectId)) return state;
  return {
    ...state,
    brokenSuspectIds: [...currentBroken, suspectId],
  };
}

export function resetCredibility(state: InvestigationState): InvestigationState {
  return {
    ...state,
    credibilityPoints: 3,
  };
}

export function getRevealedRelations(
  item: Inspectable,
  caseFile: CaseFile,
  state: InvestigationState,
) {
  if ('discoveredText' in item) {
    return item.relatedSuspectIds
      .filter((id) => caseFile.suspects.some((suspect) => suspect.id === id))
      .map((id) => caseFile.suspects.find((suspect) => suspect.id === id)!);
  }

  if ('time' in item) {
    return item.relatedEvidenceIds
      .filter((id) => state.inspectedEvidenceIds.includes(id))
      .map((id) => caseFile.evidence.find((evidence) => evidence.id === id)!)
      .filter(Boolean);
  }

  return [];
}

export function addToNotebook(
  state: InvestigationState,
  kind: ConnectionKind | 'clue' | 'contradiction',
  id: string,
): InvestigationState {
  if (kind === 'clue') {
    return {
      ...state,
      notebook: {
        ...state.notebook,
        clueIds: state.notebook.clueIds.includes(id)
          ? state.notebook.clueIds
          : [...state.notebook.clueIds, id],
      },
    };
  }

  if (kind === 'contradiction') {
    return {
      ...state,
      notebook: {
        ...state.notebook,
        contradictionIds: state.notebook.contradictionIds.includes(id)
          ? state.notebook.contradictionIds
          : [...state.notebook.contradictionIds, id],
      },
    };
  }

  const key = `${kind}Ids` as 'evidenceIds' | 'suspectIds' | 'timelineIds';
  if (kind === 'location') return state;
  return {
    ...state,
    notebook: {
      ...state.notebook,
      [key]: state.notebook[key].includes(id)
        ? state.notebook[key]
        : [...state.notebook[key], id],
    },
  };
}

export function inspectEvidence(state: InvestigationState, evidenceId: string) {
  return {
    ...state,
    inspectedEvidenceIds: state.inspectedEvidenceIds.includes(evidenceId)
      ? state.inspectedEvidenceIds
      : [...state.inspectedEvidenceIds, evidenceId],
  };
}

export function reviewTimeline(state: InvestigationState, timelineId: string) {
  return {
    ...state,
    reviewedTimelineIds: state.reviewedTimelineIds.includes(timelineId)
      ? state.reviewedTimelineIds
      : [...state.reviewedTimelineIds, timelineId],
  };
}

export function inspectSuspect(state: InvestigationState, suspectId: string) {
  return {
    ...state,
    inspectedSuspectIds: state.inspectedSuspectIds.includes(suspectId)
      ? state.inspectedSuspectIds
      : [...state.inspectedSuspectIds, suspectId],
  };
}

export function inspectLocation(state: InvestigationState, locationId: string) {
  return {
    ...state,
    inspectedLocationIds: state.inspectedLocationIds.includes(locationId)
      ? state.inspectedLocationIds
      : [...state.inspectedLocationIds, locationId],
  };
}

export function addConnection(
  state: InvestigationState,
  fromKind: ConnectionKind,
  fromId: string,
  toKind: ConnectionKind,
  toId: string,
): InvestigationState {
  if (fromId === toId && fromKind === toKind) return state;

  const exists = state.connections.some(
    (conn) =>
      (conn.fromKind === fromKind &&
        conn.fromId === fromId &&
        conn.toKind === toKind &&
        conn.toId === toId) ||
      (conn.fromKind === toKind &&
        conn.fromId === toId &&
        conn.toKind === fromKind &&
        conn.toId === fromId),
  );
  if (exists) return state;

  const newConnection: InvestigationConnection = {
    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromKind,
    fromId,
    toKind,
    toId,
    status: 'hypothesis',
    createdAt: Date.now(),
  };

  return {
    ...state,
    connections: [...state.connections, newConnection],
  };
}

export function removeConnection(
  state: InvestigationState,
  connectionId: string,
): InvestigationState {
  return {
    ...state,
    connections: state.connections.filter((conn) => conn.id !== connectionId),
  };
}

/**
 * Decodes a base64-encoded solution object using atob and UTF-8 decoding.
 */
export function decodeSolution(encoded: string): CaseSolution {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function checkAccusation(
  caseFile: CaseFile,
  state: InvestigationState,
  accusation: PlayerAccusation,
): AccusationResult {
  const solution = caseFile._encodedSolution
    ? decodeSolution(caseFile._encodedSolution)
    : caseFile.solution;
  const criticalEvidenceFound = solution.criticalEvidenceIds.filter((id) =>
    state.inspectedEvidenceIds.includes(id),
  ).length;
  const criticalTimelineFound = solution.criticalTimelineEventIds.filter((id) =>
    state.reviewedTimelineIds.includes(id),
  ).length;
  const contradictionsFound = getDiscoveredContradictions(caseFile, state).length;
  const correctCulprit = accusation.culpritId === solution.culpritId;
  const correctMotive = accusation.motive === solution.motive;
  const correctMethod = accusation.method === solution.method;
  const enoughCriticalFindings =
    criticalEvidenceFound >= Math.ceil(solution.criticalEvidenceIds.length * 0.75) &&
    criticalTimelineFound >= Math.ceil(solution.criticalTimelineEventIds.length * 0.5);
  const outcome: AccusationOutcome = !correctCulprit
    ? 'wrong'
    : correctMotive && correctMethod && enoughCriticalFindings
      ? 'excellent'
      : 'partial';

  return {
    outcome,
    correctCulprit,
    correctMotive,
    correctMethod,
    criticalEvidenceFound,
    criticalEvidenceTotal: solution.criticalEvidenceIds.length,
    criticalTimelineFound,
    criticalTimelineTotal: solution.criticalTimelineEventIds.length,
    contradictionsFound,
    contradictionsTotal: caseFile.contradictions.length,
  };
}

export function getAccusationOutcomeLabel(outcome: AccusationOutcome) {
  if (outcome === 'excellent') return 'حل ممتاز';
  if (outcome === 'partial') return 'حل جزئي';
  return 'اتهام خاطئ';
}

export function getInspectableTitle(
  caseFile: CaseFile,
  kind: ConnectionKind,
  id: string,
) {
  if (kind === 'evidence') return caseFile.evidence.find((item) => item.id === id)?.label ?? id;
  if (kind === 'suspect') return caseFile.suspects.find((item) => item.id === id)?.name ?? id;
  if (kind === 'timeline') return caseFile.timeline.find((item) => item.id === id)?.title ?? id;
  return caseFile.locations.find((item) => item.id === id)?.name ?? id;
}

export type EarnedDeduction = {
  id: string;
  title: string;
  description: string;
};

/**
 * Returns only the deductions the player has actually earned and validated.
 * Undiscovered contradictions are strictly excluded.
 */
export function getEarnedDeductions(caseFile: CaseFile, state: InvestigationState): EarnedDeduction[] {
  const discovered = getDiscoveredContradictions(caseFile, state);
  return discovered.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
  }));
}

/**
 * Returns the statements currently available to be cross-examined for a suspect.
 * Statements with initial !== false are always visible.
 * Locked statements require their ID to be present in state.unlockedStatementIds.
 */
export function getAvailableStatements(suspect: Suspect, state: InvestigationState): InterrogationStatement[] {
  const allStatements = suspect.testimony || [];
  return allStatements.filter((stmt) => {
    if (stmt.initial === false) {
      return (state.unlockedStatementIds || []).includes(stmt.statementId);
    }
    return true;
  });
}

export type ConfrontationOutcome = {
  success: boolean;
  title: string;
  dialogueText: string;
  effectiveness?: ChallengeEffectiveness;
  unlockedClue?: string;
  unlocksStatementIds?: string[];
  breaksSuspect?: boolean;
  credibilityDeducted: boolean;
  newState: InvestigationState;
};

/**
 * Executes a detective cross-examination confrontation.
 * The player presents a VALIDATED DEDUCTION against a suspect's statement.
 * Rule: Player must have earned the deduction.
 * Rule: Case data defines whether the deduction challenges this statement.
 * Rule: Failure must NOT reveal the correct deduction.
 */
export function executeInterrogationChallenge(
  caseFile: CaseFile,
  suspect: Suspect,
  state: InvestigationState,
  statementId: string,
  presentedDeductionId: string,
): ConfrontationOutcome {
  // 1. Guard: Check if player actually owns this deduction
  const hasEarned =
    (state.discoveredContradictionIds || []).includes(presentedDeductionId) ||
    (state.validatedDeductionIds || []).includes(presentedDeductionId);

  if (!hasEarned) {
    return {
      success: false,
      title: 'استنتاج غير مكتسب',
      dialogueText: 'لا يمكنك الاستناد إلى فرضية لم تثبت صحتها بعد في مسرح الجريمة أو لوحة التحقيق.',
      credibilityDeducted: false,
      newState: state,
    };
  }

  // 2. Look for matching challenge in suspect's challenge definition
  const challenges = suspect.challenges || [];
  const matchedChallenge = challenges.find(
    (c) => c.statementId === statementId && c.requiredDeductionId === presentedDeductionId,
  );

  if (matchedChallenge) {
    // SUCCESS
    let nextState = { ...state };

    // Record challenged statement
    const currentChallenged = nextState.challengedStatementIds || [];
    if (!currentChallenged.includes(statementId)) {
      nextState.challengedStatementIds = [...currentChallenged, statementId];
    }

    // Unlock any new statement branches
    if (matchedChallenge.unlocksStatementIds && matchedChallenge.unlocksStatementIds.length > 0) {
      const currentUnlocked = nextState.unlockedStatementIds || [];
      const newlyUnlocked = matchedChallenge.unlocksStatementIds.filter(
        (id) => !currentUnlocked.includes(id),
      );
      if (newlyUnlocked.length > 0) {
        nextState.unlockedStatementIds = [...currentUnlocked, ...newlyUnlocked];
      }
    }

    // Record clue in notebook if provided
    if (matchedChallenge.unlockedClue) {
      nextState = addToNotebook(nextState, 'clue', `interrogation:${suspect.id}:${statementId}`);
    }

    // Break suspect if challenge is decisive or breaksSuspect is set
    if (matchedChallenge.breaksSuspect || matchedChallenge.effectiveness === 'decisive') {
      nextState = breakSuspect(nextState, suspect.id);
    }

    return {
      success: true,
      title:
        matchedChallenge.effectiveness === 'decisive'
          ? 'انهيار المشتبه به // اعتراف حاسم'
          : 'مواجهة ناجحة // تصدع رواية المشتبه به',
      dialogueText: matchedChallenge.successDialogue,
      effectiveness: matchedChallenge.effectiveness,
      unlockedClue: matchedChallenge.unlockedClue,
      unlocksStatementIds: matchedChallenge.unlocksStatementIds,
      breaksSuspect: matchedChallenge.breaksSuspect || matchedChallenge.effectiveness === 'decisive',
      credibilityDeducted: false,
      newState: nextState,
    };
  }

  // FAILURE: Incompatible or wrong deduction presented
  const nextState = deductCredibility(state);
  const genericFail =
    suspect.challenges?.find((c) => c.statementId === statementId)?.failDialogue ||
    `ينظر ${suspect.name} ببرود وازدراء: «هذا الاستنتاج لا علاقة له بما قلته على الإطلاق. توقف عن إلقاء التهم والافتراضات دون برهان!»`;

  return {
    success: false,
    title: 'طعن غير صائب // اهتزاز مصداقية المحقق',
    dialogueText: genericFail,
    credibilityDeducted: true,
    newState: nextState,
  };
}

/**
 * Handles presentation of raw evidence.
 * Enforces the core rule: RAW EVIDENCE CANNOT SUBSTITUTE FOR A VALIDATED DEDUCTION.
 */
export function executeRawEvidenceConfrontation(
  caseFile: CaseFile,
  suspect: Suspect,
  state: InvestigationState,
  statementId: string,
  evidenceId: string,
): ConfrontationOutcome {
  const nextState = deductCredibility(state);
  const ev = caseFile.evidence.find((e) => e.id === evidenceId);
  const evidenceName = ev ? ev.label : 'هذا الدليل';

  return {
    success: false,
    title: 'حجة مادية غير مكتملة',
    dialogueText: `ينظر ${suspect.name} إلى ${evidenceName} دون اكتراث: «مجرد إبراز هذا الدليل لا يثبت شيئاً ضدي! أين الاستنتاج المنطقي أو التناقض الذي يربطه بكلامي؟»`,
    credibilityDeducted: true,
    newState: nextState,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1D — EVIDENCE-BASED INDICTMENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the accusation configuration for a case file.
 * If accusationConfig is not defined, returns a stub that always yields incomplete.
 */
export function getAccusationConfig(caseFile: CaseFile): CaseAccusationConfig {
  return caseFile.accusationConfig ?? { culpritId: '', requirements: [] };
}

/**
 * Pure validation of a player's indictment draft against case accusation requirements.
 *
 * Rules enforced (engine-authoritative, not UI-only):
 * 1. culpritId must not be null.
 * 2. Every required claim must have an attached deduction.
 * 3. That deduction must be in the player's discoveredContradictionIds (earned).
 * 4. That deduction must be in the claim's requiredDeductionIds (semantically relevant).
 * 5. If culpritId does not match config.culpritId → wrongCulprit = true.
 *    wrongCulprit alone does NOT apply penalty here — only submitFinalIndictment does.
 */
export function validateIndictment(
  caseFile: CaseFile,
  state: InvestigationState,
  draft: IndictmentDraft,
): IndictmentValidationResult {
  const config = getAccusationConfig(caseFile);
  const earned = state.discoveredContradictionIds || [];

  if (!draft.culpritId) {
    return {
      status: 'incomplete',
      missingClaims: config.requirements.map((r) => r.claimType),
      unsupportedClaims: [],
      wrongCulprit: false,
    };
  }

  const missingClaims: IndictmentClaimType[] = [];
  const unsupportedClaims: IndictmentClaimType[] = [];

  for (const req of config.requirements) {
    const entry = draft.claims.find((c) => c.claimType === req.claimType);
    if (!entry || entry.attachedDeductionId === null) {
      missingClaims.push(req.claimType);
      continue;
    }
    const deductionId = entry.attachedDeductionId;
    if (!earned.includes(deductionId)) {
      unsupportedClaims.push(req.claimType);
      continue;
    }
    if (!req.requiredDeductionIds.includes(deductionId)) {
      unsupportedClaims.push(req.claimType);
    }
  }

  const wrongCulprit = config.culpritId !== '' && draft.culpritId !== config.culpritId;

  if (missingClaims.length > 0 || unsupportedClaims.length > 0) {
    return { status: 'incomplete', missingClaims, unsupportedClaims, wrongCulprit };
  }
  if (wrongCulprit) {
    return { status: 'false', missingClaims: [], unsupportedClaims, wrongCulprit: true };
  }
  return { status: 'valid', missingClaims: [], unsupportedClaims, wrongCulprit: false };
}

export type FinalSubmissionOutcome = {
  result: FinalAccusationResult;
  newState: InvestigationState;
  /** When true the player must be returned to the investigation board. */
  returnToInvestigation: boolean;
};

/**
 * Authoritative final indictment submission.
 * The ONLY function that produces a FinalAccusationResult.
 *
 * State transitions:
 *   SOLVED:  accusationPhase → 'submitted_solved'
 *   FAILED:  credibilityPoints -= 2 (clamped); if 0 → 'lockout'; else draft cleared
 *   INCOMPLETE: returns guard result without penalty (UI must not call this — engine rejects)
 *   ALREADY TERMINAL: no-op, returns existing state
 */
export function submitFinalIndictment(
  caseFile: CaseFile,
  state: InvestigationState,
  draft: IndictmentDraft,
): FinalSubmissionOutcome {
  // Guard: already in terminal phase — no-op
  if (state.accusationPhase === 'submitted_solved' || state.accusationPhase === 'lockout') {
    const existingResult: FinalAccusationResult = state.finalResult ?? {
      outcome: 'failed',
      correctCulprit: false,
      validatedClaims: [],
      missingClaims: [],
      unsupportedClaims: [],
      submittedCulpritId: null,
      submittedDeductionMap: {},
      earnedContradictionIds: state.discoveredContradictionIds || [],
      criticalEvidenceFound: 0,
      criticalEvidenceTotal: 0,
      contradictionsFound: 0,
      contradictionsTotal: 0,
    };
    return { result: existingResult, newState: state, returnToInvestigation: false };
  }

  const config = getAccusationConfig(caseFile);
  const validation = validateIndictment(caseFile, state, draft);

  // Build the submission deduction map
  const submittedDeductionMap: Partial<Record<IndictmentClaimType, string | null>> =
    Object.fromEntries(
      draft.claims.map((c) => [c.claimType, c.attachedDeductionId]),
    ) as Partial<Record<IndictmentClaimType, string | null>>;

  // Guard: engine rejects incomplete — no penalty applied
  if (!draft.culpritId || validation.missingClaims.length > 0) {
    return {
      result: {
        outcome: 'failed',
        correctCulprit: false,
        validatedClaims: [],
        missingClaims: validation.missingClaims,
        unsupportedClaims: validation.unsupportedClaims,
        submittedCulpritId: draft.culpritId,
        submittedDeductionMap,
        earnedContradictionIds: state.discoveredContradictionIds || [],
        criticalEvidenceFound: state.inspectedEvidenceIds.length,
        criticalEvidenceTotal: caseFile.evidence.length,
        contradictionsFound: (state.discoveredContradictionIds || []).length,
        contradictionsTotal: caseFile.contradictions.length,
      },
      newState: state,
      returnToInvestigation: true,
    };
  }

  const correctCulprit = draft.culpritId === config.culpritId;
  const isFullyValid = validation.status === 'valid';

  const validatedClaims: IndictmentClaimType[] = correctCulprit
    ? config.requirements
        .filter((r) => !validation.unsupportedClaims.includes(r.claimType))
        .map((r) => r.claimType)
    : [];

  const result: FinalAccusationResult = {
    outcome: isFullyValid ? 'solved' : 'failed',
    correctCulprit,
    validatedClaims,
    missingClaims: validation.missingClaims,
    unsupportedClaims: validation.unsupportedClaims,
    submittedCulpritId: draft.culpritId,
    submittedDeductionMap,
    earnedContradictionIds: [...(state.discoveredContradictionIds || [])],
    criticalEvidenceFound: state.inspectedEvidenceIds.length,
    criticalEvidenceTotal: caseFile.evidence.length,
    contradictionsFound: (state.discoveredContradictionIds || []).length,
    contradictionsTotal: caseFile.contradictions.length,
  };

  // ── SOLVED PATH ──────────────────────────────────────────────────────────
  if (isFullyValid) {
    const newState: InvestigationState = {
      ...state,
      accusationPhase: 'submitted_solved',
      finalResult: result,
    };
    return { result, newState, returnToInvestigation: false };
  }

  // ── FAILED PATH: wrong culprit ───────────────────────────────────────────
  // Apply -2 credibility penalty (clamped). ALL investigation progress preserved.
  const newCredibility = Math.max(0, (state.credibilityPoints ?? 3) - 2);
  const hitLockout = newCredibility === 0;

  const newState: InvestigationState = {
    ...state,
    credibilityPoints: newCredibility,
    finalResult: result,
    accusationPhase: hitLockout ? 'lockout' : undefined,
    // Clear the draft so the player can reconsider (unless locked out)
    indictmentDraft: hitLockout ? state.indictmentDraft : undefined,
    // Investigation progress is FULLY preserved below (implicit via spread):
    // inspectedEvidenceIds, discoveredHotspotIds, reviewedTimelineIds,
    // discoveredContradictionIds, validatedDeductionIds, brokenSuspectIds,
    // challengedStatementIds, unlockedStatementIds, connections, notebook
  };

  return { result, newState, returnToInvestigation: true };
}