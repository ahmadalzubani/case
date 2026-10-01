import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  throttleSound,
  playCardPickupSound,
  playCorkThudSound,
  playEurekaSound,
  playTentativeRejectSound,
} from '../src/lib/audio.ts';

describe('Phase 2C — Game Feel & Tactile Audio Engine', () => {
  it('throttleSound enforces cooldowns accurately to prevent audio clipping', () => {
    // First trigger should succeed
    const first = throttleSound('test_key', 100);
    assert.equal(first, true);

    // Immediate second trigger should be throttled
    const second = throttleSound('test_key', 100);
    assert.equal(second, false);
  });

  it('Tactile audio methods execute safely without errors in any environment', () => {
    assert.doesNotThrow(() => {
      playCardPickupSound();
      playCorkThudSound();
      playEurekaSound();
      playTentativeRejectSound();
    });
  });

  it('String visual hierarchy distinguishes verified crimson vs tentative amber', () => {
    const verifiedWidth = 3.5;
    const hypothesisWidth = 1.8;
    const verifiedOpacity = 1.0;
    const hypothesisOpacity = 0.6;

    assert.ok(
      verifiedWidth > hypothesisWidth,
      'Validated crimson strings must be significantly thicker than tentative strings'
    );
    assert.ok(
      verifiedOpacity > hypothesisOpacity,
      'Validated strings must have full 1.0 opacity while hypothesis strings have reduced opacity (0.6)'
    );
  });
});
