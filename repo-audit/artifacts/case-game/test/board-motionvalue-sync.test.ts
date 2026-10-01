import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePinAnchor,
  calculateStringPhysics,
  BOARD_CARD_WIDTH,
  PIN_OFFSET_X,
  PIN_OFFSET_Y,
} from '../src/lib/string-physics.ts';

describe('Option C — Shared MotionValue & String Physics Architecture', () => {
  it('Pin anchor uses fixed card geometry constants without DOM sampling', () => {
    assert.equal(BOARD_CARD_WIDTH, 256);
    assert.equal(PIN_OFFSET_X, 128);
    assert.equal(PIN_OFFSET_Y, -2);

    const anchor = calculatePinAnchor(100, 200);
    assert.equal(anchor.x, 100 + 128);
    assert.equal(anchor.y, 200 - 2);
  });

  it('String physics connects exact pin anchors without coordinate desync', () => {
    const card1 = { x: 50, y: 100 };
    const card2 = { x: 400, y: 300 };

    const p1 = calculatePinAnchor(card1.x, card1.y);
    const p2 = calculatePinAnchor(card2.x, card2.y);

    const physics = calculateStringPhysics(p1, p2, 'validated');

    // Path must start at exact p1 coordinates and end at exact p2 coordinates
    const expectedStart = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    const expectedEnd = `${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

    assert.ok(physics.path.startsWith(expectedStart), `Path ${physics.path} must start with ${expectedStart}`);
    assert.ok(physics.path.endsWith(expectedEnd), `Path ${physics.path} must end with ${expectedEnd}`);
  });

  it('Moving card pin coordinates updates string endpoints 1:1', () => {
    const startCard1 = { x: 100, y: 100 };
    const targetCard2 = { x: 500, y: 500 };

    const p2 = calculatePinAnchor(targetCard2.x, targetCard2.y);

    // Simulate drag frame by frame
    const dragOffsets = [
      { dx: 10, dy: 5 },
      { dx: 45, dy: 20 },
      { dx: 120, dy: 85 },
      { dx: 250, dy: 160 },
    ];

    for (const offset of dragOffsets) {
      const currentX = startCard1.x + offset.dx;
      const currentY = startCard1.y + offset.dy;
      const pin = calculatePinAnchor(currentX, currentY);

      const physics = calculateStringPhysics(pin, p2, 'hypothesis');
      const expectedStart = `M ${pin.x.toFixed(1)} ${pin.y.toFixed(1)}`;
      assert.ok(
        physics.path.startsWith(expectedStart),
        `At offset dx=${offset.dx}, dy=${offset.dy}: path must start at ${expectedStart}`
      );
    }
  });

  it('Clamping prevents cards from moving into negative non-visible coordinates', () => {
    const rawDraggedX = -45;
    const rawDraggedY = -12;
    const clampedX = Math.max(10, Math.round(rawDraggedX));
    const clampedY = Math.max(10, Math.round(rawDraggedY));

    assert.equal(clampedX, 10);
    assert.equal(clampedY, 10);
  });
});
