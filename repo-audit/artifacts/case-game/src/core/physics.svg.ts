import type { ConnectionKind } from '@/core/engine.logic';

export interface ActiveStringRenderData {
  id: string;
  fromKind: ConnectionKind;
  fromId: string;
  toKind: ConnectionKind;
  toId: string;
  type: 'validated' | 'hypothesis' | 'tentative';
  label?: string;
}

export interface BezierStringCalculation {
  path: string;
  shadowPath: string;
  midX: number;
  midY: number;
  sag: number;
  length: number;
}

/**
 * Calculates Quadratic Bezier catenary sag physics for dynamic strings on the Murder Board.
 * Connects two thumbtack anchor points with realistic gravity deflection and tension states.
 */
export function calculateStringPhysics(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  type: 'validated' | 'hypothesis' | 'tentative'
): BezierStringCalculation {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Natural catenary gravitational sag based on distance and string tension
  let sagFactor: number;
  let minSag: number;
  let maxSag: number;

  switch (type) {
    case 'validated':
      // Taut crimson thread: high tension, modest sag, authoritative pull
      sagFactor = 0.07;
      minSag = 14;
      maxSag = 52;
      break;
    case 'hypothesis':
      // Tentative yellow thread: looser, deeper sag
      sagFactor = 0.15;
      minSag = 24;
      maxSag = 100;
      break;
    case 'tentative':
      // Interactive selection thread: responsive drape
      sagFactor = 0.11;
      minSag = 18;
      maxSag = 75;
      break;
  }

  // Calculate gravitational sag (pixels downward)
  const sag = Math.min(maxSag, Math.max(minSag, dist * sagFactor));

  // Midpoint coordinates
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Control point pulled strictly downward along the gravitational vector (+Y)
  const cx = mx;
  const cy = my + sag;

  // SVG Quadratic Bezier path: M x1 y1 Q cx cy x2 y2
  const path = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  // Ground shadow path with realistic directional light offset (dx: +2, dy: +4)
  const shadowPath = `M ${(p1.x + 2).toFixed(1)} ${(p1.y + 4).toFixed(1)} Q ${(cx + 2).toFixed(1)} ${(cy + 4).toFixed(1)} ${(p2.x + 2).toFixed(1)} ${(p2.y + 4).toFixed(1)}`;

  return {
    path,
    shadowPath,
    midX: cx,
    midY: cy,
    sag,
    length: dist,
  };
}

export const BOARD_CARD_WIDTH = 256;
export const PIN_OFFSET_X = BOARD_CARD_WIDTH / 2; // 128
export const PIN_OFFSET_Y = -2; // Centered on 3D thumbtack head

/**
 * Calculates the exact (x, y) anchor point of the 3D thumbtack on top-center of a card.
 * Incorporates active real-time drag offsets from Framer Motion.
 */
export function calculatePinAnchor(
  cardX: number,
  cardY: number,
  dragOffset?: { dx: number; dy: number } | null,
  cardWidth: number = BOARD_CARD_WIDTH
): { x: number; y: number } {
  const currentX = cardX + (dragOffset?.dx ?? 0);
  const currentY = cardY + (dragOffset?.dy ?? 0);
  return {
    x: currentX + cardWidth / 2,
    y: currentY + PIN_OFFSET_Y,
  };
}
