import type { World } from '../World';
import { clamp } from '../../engine/math';
import { HP } from '../config';

/**
 * Aktív képesség (Isaac „active item" mintára). Space/E gombbal sül el, és
 * szobánként töltődik (`chargeMax` szoba kell egy használathoz).
 *
 * Új skill: adj egy bejegyzést ide, és tedd elérhetővé tárgyként (items.ts)
 * vagy kezdő-skillként (Player.reset / World.newGame).
 */
export interface Skill {
  id: string;
  name: string;
  desc: string;
  col: string;
  /** Hány szoba kipucolása tölti fel egy használatra. */
  chargeMax: number;
  activate: (world: World) => void;
}

export const SKILLS: readonly Skill[] = [
  {
    id: 'nova', name: 'Shockwave', desc: 'pushes nearby enemies (small damage)', col: '#7fc4ff', chargeMax: 1,
    activate: (w) => { w.pushEnemiesFrom(w.player.x, w.player.y, 230, 320, 4); w.addShake(8); },
  },
  {
    id: 'slow', name: 'Time Slow', desc: 'slows enemies', col: '#9b8cff', chargeMax: 2,
    activate: (w) => { w.slowEnemies(5); },
  },
  {
    id: 'shield', name: 'Shield', desc: '5s invincibility', col: '#3df0ff', chargeMax: 2,
    activate: (w) => { w.player.invuln = Math.max(w.player.invuln, 5); },
  },
  {
    id: 'heal', name: 'Heal', desc: '+1 heart', col: '#5cff8f', chargeMax: 3,
    activate: (w) => { const p = w.player; p.hp = clamp(p.hp + HP.heart, 0, p.maxHp); },
  },
  {
    id: 'blink', name: 'Teleport', desc: 'dashes toward aim', col: '#ffd36a', chargeMax: 1,
    activate: (w) => {
      const p = w.player;
      const rc = w.room;
      p.x = clamp(p.x + p.lastShotDir.x * 400, rc.x + p.r, rc.x + rc.w - p.r);
      p.y = clamp(p.y + p.lastShotDir.y * 400, rc.y + p.r, rc.y + rc.h - p.r);
      p.invuln = Math.max(p.invuln, 0.6);
      w.particles.spawn(p.x, p.y, '#ffd36a', 16, 220, 0.5);
    },
  },
];

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
