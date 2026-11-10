import type { TipoKey } from '../types';
import { TOPIC_LEVELS_DATA } from './topicLevels.data';

export type LevelInfo = { name: string; desc: string; img: string };

/** Etichette inglesi delle schede. */
export const TOPIC_LABELS: Record<TipoKey, string> = {
  personaggio: 'Characters', luogo: 'Locations', fazione: 'Factions', creatura: 'Creatures', arma: 'Weapons', armatura: 'Armor',
  oggetto: 'Items', missione: 'Quests', evento: 'Events', meccanica: 'Mechanics', lore: 'Lore', canzone: 'Songs',
  cucina: 'Cooking', bevande: 'Drinks', chem: 'Chems & medicine', combattimento: 'Combat',
};

/** Cinque livelli per topic, dal piu basso al piu alto. Generati da scripts/build-topic-levels.mjs (vedi topicLevels.data.ts). */
export const TOPIC_LEVELS = TOPIC_LEVELS_DATA as Record<TipoKey, LevelInfo[]>;
