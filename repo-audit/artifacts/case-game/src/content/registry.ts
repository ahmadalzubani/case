import type { CaseFile } from '@/types/game.types';
import { CASE_001 } from './cases/case-001';

const casesRegistry: Record<string, CaseFile> = {
  '001': CASE_001,
  'case-001': CASE_001,
};

export function getCaseById(caseId: string): CaseFile | undefined {
  return casesRegistry[caseId] || casesRegistry[caseId.replace(/^case-/, '')];
}

export function getAllAvailableCases(): CaseFile[] {
  return Object.values(casesRegistry);
}
