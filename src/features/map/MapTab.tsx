import * as React from 'react';
import { useStore } from '../../store';
import { useT } from '../../i18n';
import { play } from '../../sounds';
import { levelFromXp } from '../../game/xp';
import { statValue } from '../../game/special';
import type { Progress, SpecialKey } from '../../types';
import { QuizSession } from '../../ui/QuizSession';
import { createMapTab } from './pipboy-map.js';
import './pipboy-map.css';

// Il modulo e' JavaScript puro (nato come estensione del bundle): riceve React, gli hook dell'app e la sessione di quiz.
export const MapTab = createMapTab({
  React,
  useStore,
  useI18n: useT,
  sound: play,
  Quiz: QuizSession,
  stats: { level: (p: Progress) => levelFromXp(p.xp).level, special: (p: Progress, k: SpecialKey) => statValue(p, k) },
});
