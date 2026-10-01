export type CaseDifficulty = 'متوسط';

export type EvidenceImportance = 'عادي' | 'مهم' | 'محوري';

export type ChallengeEffectiveness = 'weak' | 'strong' | 'decisive';

// ─── Phase 1D: Evidence-Based Indictment Types ───────────────────────────────

/**
 * The four semantic claim categories a player must prove in an indictment.
 * Each maps to a specific type of evidence in the case.
 */
export type IndictmentClaimType =
  | 'identity'     // The suspect was physically present / committed the act
  | 'motive'       // The reason behind the crime
  | 'method'       // How the crime was executed (mechanism)
  | 'opportunity'; // Timeline placement / when the opportunity existed

/**
 * A single accusation requirement binding a claim type to the validated
 * deduction(s) that semantically support it.
 * The player must attach a deduction from requiredDeductionIds to satisfy this claim.
 */
export type AccusationRequirement = {
  claimType: IndictmentClaimType;
  label: string;                    // Arabic display label in the indictment UI
  requiredDeductionIds: string[];   // At least one must match the player's earned deductions
  description?: string;             // Structural hint (no answer leakage)
};

/**
 * Case-level accusation configuration.
 * Defines who the culprit is and what proof the engine requires for a valid indictment.
 * Lives in case data — NOT in the engine. Never hardcode accusation logic in JSX.
 */
export type CaseAccusationConfig = {
  culpritId: string;
  requirements: AccusationRequirement[];
};

export type InterrogationChallenge = {
  id?: string;
  statementId: string;
  requiredDeductionId: string;
  effectiveness: ChallengeEffectiveness;
  successDialogue: string;
  failDialogue?: string;
  unlockedClue?: string;
  unlocksStatementIds?: string[];
  breaksSuspect?: boolean;
  composureDelta?: number;
};

export type InterrogationStatement = {
  statementId: string;
  text: string;
  initial?: boolean;
  unlockedByChallengeId?: string;
};

export type InterrogationTruth = {
  statementId: string;
  requiredEvidenceId: string;
  successDialogue: string;
  failDialogue: string;
  unlockedClue?: string;
};

export type Suspect = {
  id: string;
  name: string;
  role: string;
  age: number;
  accent: string;
  portrait: string;
  knownInformation: string;
  summary: string;
  alibi: string;
  detail: string;
  lastSeen: string;
  relevantTimelineIds: string[];
  behavioralNotes?: string;
  suspectType?: string;
  testimony?: InterrogationStatement[];
  challenges?: InterrogationChallenge[];
  interrogationTruths?: InterrogationTruth[];
};

export type Location = {
  id: string;
  name: string;
  type: string;
  summary: string;
  detail: string;
  clue: string;
  imageLabel: string;
  environmentalDetails: string[];
  evidenceIds: string[];
};

export type EvidenceHotspot = {
  id: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  radius: number; // 0 to 100 percentage
  clue: string;
  title?: string;
  category?: 'forensic' | 'ballistic' | 'mechanical' | 'biological' | 'document';
};

export type Evidence = {
  id: string;
  label: string;
  type: string;
  foundAt: string;
  locationId: string;
  summary: string;
  detail: string;
  discoveredText: string;
  clues: string[];
  relatedSuspectIds: string[];
  relatedTimelineIds: string[];
  importance: EvidenceImportance;
  imageUrl?: string;
  hotspots?: EvidenceHotspot[];
};

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  location: string;
  locationId: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'important';
  relatedSuspectIds: string[];
  relatedEvidenceIds: string[];
};

export type InvestigationItemType = 'evidence' | 'suspect' | 'timeline' | 'location';

export type ConnectionRequirement = {
  itemAId: string;
  itemAKind: InvestigationItemType;
  itemBId: string;
  itemBKind: InvestigationItemType;
  description?: string;
};

export type Contradiction = {
  id: string;
  title: string;
  description: string;
  suspectId: string;
  relatedEvidenceIds: string[];
  relatedTimelineIds: string[];
  requiredHotspotIds?: string[];
  requiredConnections?: ConnectionRequirement[];
};

export type RevealStep = {
  id: string;
  time: string;
  title: string;
  description: string;
  evidenceIds: string[];
};

export type SolutionChoices = {
  motives: string[];
  methods: string[];
  times: string[];
};

export type CaseSolution = {
  culpritId: string;
  motive: string;
  method: string;
  time: string;
  criticalEvidenceIds: string[];
  criticalTimelineEventIds: string[];
  revealSteps: RevealStep[];
  choices: SolutionChoices;
};

/**
 * Victim profile specifications for the physical murder board
 */
export type VictimProfile = {
  id: string;
  name: string;
  role: string;
  tag: string;
  summary: string;
  knownInformation: string;
  detail: string;
  statusLabel: string;
  portraitUrl: string;
};

/**
 * Initial focal item specifications for board initialization
 */
export type InitialBoardItem = {
  kind: InvestigationItemType;
  id: string;
  x: number;
  y: number;
};

export type CaseFile = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  difficulty: CaseDifficulty;
  status: string;
  intro: string;
  closedTruth: string;
  victim?: VictimProfile;
  initialBoardItems?: InitialBoardItem[];
  suspects: Suspect[];
  locations: Location[];
  evidence: Evidence[];
  timeline: TimelineEvent[];
  contradictions: Contradiction[];
  solution: CaseSolution;
  _encodedSolution?: string;
  initialTimelineId?: string; // semantic featured initial timeline ID
  accusationConfig?: CaseAccusationConfig; // Phase 1D: evidence-based indictment requirements
};
