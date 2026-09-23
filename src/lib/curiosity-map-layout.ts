// Deterministic bubble-chart layout for a handful to a few dozen motif nodes — no physics
// library needed at this node count (docs/design/curiosity-map.md, bucket 4). Bigger/more-
// explored motifs are placed first, closer to center via a golden-angle spiral, then a few
// relaxation passes push apart any circles that still overlap.

export interface MapNode {
  motif: string;
  count: number;
}

export interface LaidOutNode extends MapNode {
  x: number;
  y: number;
  r: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SPIRAL_SPACING = 45;
const MIN_RADIUS = 24;
const MAX_RADIUS = 90;
const RELAXATION_PASSES = 40;
const PADDING = 6;

function radiusForCount(count: number, maxCount: number): number {
  if (maxCount <= 0) return MIN_RADIUS;
  const t = Math.sqrt(count / maxCount); // area, not diameter, scales with count
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export function layoutNodes(nodes: MapNode[]): LaidOutNode[] {
  if (nodes.length === 0) return [];

  const maxCount = Math.max(...nodes.map((n) => n.count));
  const sorted = [...nodes].sort((a, b) => b.count - a.count);

  const laid: LaidOutNode[] = sorted.map((node, i) => {
    const angle = i * GOLDEN_ANGLE;
    const dist = SPIRAL_SPACING * Math.sqrt(i);
    return {
      ...node,
      x: dist * Math.cos(angle),
      y: dist * Math.sin(angle),
      r: radiusForCount(node.count, maxCount),
    };
  });

  for (let pass = 0; pass < RELAXATION_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const minDist = a.r + b.r + PADDING;
        if (dist < minDist) {
          moved = true;
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }
    if (!moved) break;
  }

  return laid;
}
