export interface Obstacle {
  x: number;
  y: number;
  r: number;
}

export interface ArenaDef {
  id: string;
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  obstacles: Obstacle[];
}

const W = 3200;
const H = 3200;
const C = W / 2;

function ring(count: number, radius: number, r: number, offset = 0): Obstacle[] {
  return Array.from({ length: count }, (_, i) => {
    const a = offset + (i / count) * Math.PI * 2;
    return { x: Math.round(C + Math.cos(a) * radius), y: Math.round(C + Math.sin(a) * radius), r };
  });
}

export const ARENAS = {
  shatteredSanctum: {
    id: 'shatteredSanctum',
    width: W,
    height: H,
    spawnPoint: { x: C, y: C },
    obstacles: [
      ...ring(6, 430, 42, Math.PI / 6),
      ...ring(8, 980, 56, Math.PI / 8),
      { x: 520, y: 560, r: 70 },
      { x: 2700, y: 610, r: 64 },
      { x: 600, y: 2650, r: 66 },
      { x: 2620, y: 2580, r: 74 },
    ],
  },
} as const satisfies Record<string, ArenaDef>;

export type ArenaId = keyof typeof ARENAS;
