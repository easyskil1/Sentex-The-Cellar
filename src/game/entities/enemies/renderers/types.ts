import type { EnemyKind } from '../enemyTypes';

/**
 * Az ellenségek kinézetének önálló renderelője — leválasztva az Enemy
 * logikájáról (ahogy a PlayerRenderer is a Player-ről).
 *
 * Minden típusnak saját, kidolgozott formája van (gradiens test, körvonal,
 * szemek, animált végtagok), de mind a típus-színeit (`col`/`col2`) használja,
 * így a stat-tábla átszínezésével a kinézet is követi.
 */
export interface EnemyVisual {
  kind: EnemyKind;
  x: number;
  y: number;
  r: number;
  col: string;
  col2: string;
  flash: boolean;
  bob: number; // lassú lélegző/lépő fázis
  wob: number; // gyors libegő/csapkodó fázis
  face: number; // szög a játékos felé (radián)
  moving: boolean;
  aiming?: boolean; // shooter: mindjárt lő
  windup?: boolean; // charger: nekifutás-töltés
  dashing?: boolean; // charger: épp ráront
  breathing?: boolean; // pyro: épp lángot okád
  active?: boolean; // általános „épp dolgozik" jelző (köpés/akna/köd/fagy)
  laserState?: 'idle' | 'aim' | 'fire'; // lancer
  laserAng?: number;
  laserLen?: number;
  buried?: boolean; // worm: föld alatt lapul (csak földkupac látszik)
  hidden?: boolean; // blinker: épp (újra)materializálódik
  lift?: number; // leaper: ugrás-ív magasság (0..1)
  charge?: 'idle' | 'wind' | 'dash'; // Wave 6: nyers roham-fázis (minotaurusz/vámpír/hárpia/vérfarkas)
  petrified?: boolean; // Wave 6: vízköpő kő-fázisa (szobor)
  hpFrac?: number; // Wave 6: HP-arány (a hidra fejszámához)
}
