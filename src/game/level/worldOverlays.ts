// A világ-entitások fölé/alá rajzolt kiegészítő rétegek: a lövedék-izzás (finom
// additív glow) és a teszt-aréna sebzés-feliratai. Tiszta függvények - a World
// adja át az entitás-listákat és a szintet.
import { drawGlow, withGlow } from './lightRender';
import { Enemy, type IEnemy } from '../entities/enemies/Enemy';
import { scaleIncomingDamage } from '../balance/difficulty';
import { HP } from '../config';
import type { Tear } from '../entities/Tear';
import type { Bomb } from '../entities/Bomb';
import type { EnemyBullet } from '../types';

/** Finom additív izzás a lövedékekre, ellenfél-golyókra és bombákra (lüktet). */
export function drawProjectileGlow(
  ctx: CanvasRenderingContext2D,
  tears: Tear[],
  ebullets: EnemyBullet[],
  bombs: Bomb[],
): void {
  if (tears.length === 0 && ebullets.length === 0 && bombs.length === 0) return;
  const pulse = 0.82 + 0.18 * Math.sin(performance.now() / 110);
  withGlow(ctx, () => {
    for (const t of tears) drawGlow(ctx, t.x, t.y, t.r * 3.4, t.color, 0.5 * pulse);
    for (const b of ebullets) {
      const col = b.poison || b.slime ? '#bfff6a' : b.slow ? '#9fdf4a' : '#ff8a5a';
      drawGlow(ctx, b.x, b.y, (b.r + 4) * 2.6, col, 0.42 * pulse);
    }
    for (const bomb of bombs) drawGlow(ctx, bomb.x, bomb.y, 30, '#ff7b3a', 0.32 * pulse);
  });
}

/**
 * Teszt-aréna: a nem-boss ellenfelek bal felső sarkába a mélységgel skálázott
 * TÉNYLEGES érintés-sebzés (pontban) - így az admin-kártya bázisához képest
 * azonnal látszik, mennyit üt valójában az aktuális szinten. A bossok fix
 * sebzésűek (nem skálázódnak), ezért rájuk nem írunk.
 */
export function drawDamageLabels(ctx: CanvasRenderingContext2D, enemies: IEnemy[], floor: number): void {
  ctx.save();
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#ff9a7a';
  for (const e of enemies) {
    if (!(e instanceof Enemy) || e.dmg <= 0) continue;
    const actual = scaleIncomingDamage(e.dmg * HP.half, floor);
    ctx.fillText(`${actual}`, e.x - e.r, e.y - e.r - 2);
  }
  ctx.restore();
}
