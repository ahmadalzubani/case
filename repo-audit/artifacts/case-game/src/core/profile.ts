import { useEffect, useState } from 'react';
import { clearInvestigationState } from './engine.logic';

export type DetectiveProfile = {
  name: string;
  email: string;
  badgeNumber: string;
  isGuest: boolean;
  updatedAt: string;
};

const PROFILE_STORAGE_KEY = 'case_detective_profile';
const DEFAULT_PROFILE: DetectiveProfile = {
  name: 'محقق زائر',
  email: '',
  badgeNumber: 'DET-407-K',
  isGuest: true,
  updatedAt: new Date().toISOString(),
};

const listeners = new Set<() => void>();

function notifyProfileChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore errors
    }
  });
}

export function getDetectiveProfile(): DetectiveProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const saved = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) return DEFAULT_PROFILE;
    const parsed = JSON.parse(saved);
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : DEFAULT_PROFILE.name,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      badgeNumber: typeof parsed.badgeNumber === 'string' ? parsed.badgeNumber : DEFAULT_PROFILE.badgeNumber,
      isGuest: typeof parsed.isGuest === 'boolean' ? parsed.isGuest : DEFAULT_PROFILE.isGuest,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : DEFAULT_PROFILE.updatedAt,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveDetectiveProfile(updates: Partial<DetectiveProfile>): DetectiveProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const current = getDetectiveProfile();
    const updated: DetectiveProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    notifyProfileChange();
    return updated;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function resetAllInvestigationProgress(caseId = '001') {
  if (typeof window === 'undefined') return;
  clearInvestigationState(caseId);
  // Dispatch a global event so active investigation pages react immediately
  window.dispatchEvent(new CustomEvent('case:progress-reset', { detail: { caseId } }));
}

export function useDetectiveProfile() {
  const [profile, setProfile] = useState<DetectiveProfile>(() => getDetectiveProfile());

  useEffect(() => {
    const listener = () => {
      setProfile(getDetectiveProfile());
    };
    listeners.add(listener);

    // Also listen to storage events from other tabs
    const storageListener = (e: StorageEvent) => {
      if (e.key === PROFILE_STORAGE_KEY) {
        setProfile(getDetectiveProfile());
      }
    };
    window.addEventListener('storage', storageListener);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', storageListener);
    };
  }, []);

  const update = (updates: Partial<DetectiveProfile>) => {
    return saveDetectiveProfile(updates);
  };

  const resetProgress = (caseId = '001') => {
    resetAllInvestigationProgress(caseId);
  };

  return {
    profile,
    update,
    resetProgress,
    isGuest: profile.isGuest,
  };
}
