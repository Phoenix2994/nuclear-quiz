export type Pose = 'hello' | 'thumbs-up' | 'thumbs-down' | 'think' | 'win';

/** Mascotte originale (un ghoul simpatico), disegnata qui in SVG: tratto verde, colori dal tema. */
const O = '#b6ff9a', SK = '#17441f', CL = '#0f3016', HI = '#2c7a36', EYE = '#e6ffd9';
const arm = (d: string) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${SK}" stroke-width="6" stroke-linecap="round"/>`;
const hand = (x: number, y: number, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK}" stroke="${O}" stroke-width="2"/>`;
const thumb = (x: number, y1: number, y2: number) => `<path d="M${x} ${y1}V${y2}" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M${x} ${y1}V${y2}" stroke="${SK}" stroke-width="5" stroke-linecap="round"/>`;
const sparkle = (x: number, y: number, s = 1) => `<path d="M${x} ${y - 6 * s}l${3 * s} ${6 * s} ${6 * s} ${3 * s}-${6 * s} ${3 * s}-${3 * s} ${6 * s}-${3 * s}-${6 * s}-${6 * s}-${3 * s} ${6 * s}-${3 * s}z" fill="${O}"/>`;

type Face = { brow: 'ok' | 'up' | 'down'; mouth: 'smile' | 'big' | 'flat' | 'sad'; look?: number };
const BROWS = {
  ok: `<path d="M44 36q6-5 12 0M64 36q6-5 12 0" fill="none" stroke="${O}" stroke-width="2.5"/>`,
  up: `<path d="M43 33q7-6 13-1M64 32q6-5 13 1" fill="none" stroke="${O}" stroke-width="2.5"/>`,
  down: `<path d="M43 31l13 4M77 31l-13 4" fill="none" stroke="${O}" stroke-width="2.5"/>`,
};
const MOUTHS = {
  smile: `<path d="M46 56q14 14 28 0z" fill="#06180b" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/><path d="M52 58v4M58 59v5M64 59v5M70 58v4" stroke="${O}" stroke-width="1.6"/>`,
  big: `<path d="M44 54q16 20 32 0z" fill="#06180b" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/><path d="M50 57v5M56 59v7M64 59v7M70 57v5" stroke="${O}" stroke-width="1.6"/>`,
  flat: `<path d="M49 59q11 3 22-1" fill="none" stroke="${O}" stroke-width="2.8" stroke-linecap="round"/>`,
  sad: `<path d="M48 63q12-9 24 0" fill="none" stroke="${O}" stroke-width="2.8" stroke-linecap="round"/>`,
};
const face = (f: Face) => {
  const p = f.look ?? 0;
  return `<ellipse cx="33" cy="44" rx="5" ry="8" fill="${SK}" stroke="${O}" stroke-width="2"/><ellipse cx="87" cy="44" rx="5" ry="8" fill="${SK}" stroke="${O}" stroke-width="2"/>
  <ellipse cx="60" cy="42" rx="27" ry="31" fill="${SK}" stroke="${O}" stroke-width="3"/>
  <path d="M66 14l5 9-6 3 7 9" fill="none" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M63 22l5 2M69 33l6-1" stroke="${O}" stroke-width="1.4"/>
  <path d="M42 22q-6 4-8 12M44 26q-3 3-4 8" fill="none" stroke="${HI}" stroke-width="2"/>
  <path d="M50 10q-3-6-7-6M58 8q0-7 3-8M67 9q3-5 8-4" fill="none" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="50" cy="41" r="7" fill="${EYE}" stroke="${O}" stroke-width="2"/><circle cx="70" cy="41" r="7" fill="${EYE}" stroke="${O}" stroke-width="2"/>
  <circle cx="${50 + p}" cy="42" r="3.4" fill="#06180b"/><circle cx="${70 + p}" cy="42" r="3.4" fill="#06180b"/>
  ${BROWS[f.brow]}
  <path d="M57 50q1 4 3 4M63 50q-1 4-3 4" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
  ${MOUTHS[f.mouth]}`;
};
const BODY = `<rect x="55" y="70" width="10" height="9" fill="${SK}" stroke="${O}" stroke-width="2"/>
  <path d="M42 119 L39 148 L57 148 L59 119 Z M61 119 L63 148 L81 148 L78 119 Z" fill="${CL}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M33 152q4-8 24-4v7H33zM63 148q20-4 24 4v3H63z" fill="${SK}" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M41 80Q60 74 79 80L83 121H37Z" fill="${CL}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M50 78v40M70 78v40M38 112h44" stroke="${O}" stroke-width="2.4"/>
  <circle cx="60" cy="102" r="8.5" fill="${HI}" stroke="${O}" stroke-width="2"/><circle cx="60" cy="102" r="5.2" fill="none" stroke="${O}" stroke-width="1.4" stroke-dasharray="1.6 1.6"/>`;
const LEFT_DOWN = arm('M44 86Q31 100 33 116') + hand(33, 119);

const POSES: Record<Pose, { face: Face; arms: string; extra: string }> = {
  hello: { face: { brow: 'ok', mouth: 'smile' }, arms: LEFT_DOWN + arm('M76 86Q97 82 99 58') + hand(99, 52) + `<path d="M94 46l-2-7M99 44v-8M104 46l2-7" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/>`, extra: '' },
  'thumbs-up': { face: { brow: 'up', mouth: 'big' }, arms: LEFT_DOWN + arm('M76 86Q98 92 92 72') + hand(92, 67, 7.5) + thumb(92, 60, 48), extra: sparkle(24, 24) },
  'thumbs-down': { face: { brow: 'down', mouth: 'sad' }, arms: LEFT_DOWN + arm('M76 86Q98 82 92 98') + hand(92, 103, 7.5) + thumb(92, 108, 121), extra: '' },
  think: { face: { brow: 'up', mouth: 'flat', look: 3 }, arms: LEFT_DOWN + arm('M76 88Q94 84 70 68') + hand(67, 65, 5.5), extra: `<text x="92" y="22" font-size="26" font-weight="700" fill="${O}" font-family="Arial Narrow,Arial,sans-serif">?</text>` },
  win: { face: { brow: 'up', mouth: 'big' }, arms: arm('M44 86Q21 84 24 54') + hand(24, 48, 7) + arm('M76 86Q99 84 96 54') + hand(96, 48, 7), extra: sparkle(12, 24) + sparkle(108, 18, 0.9) },
};

export function Mascot({ pose = 'hello', size = 120 }: { pose?: Pose; size?: number }) {
  const p = POSES[pose];
  return (
    <svg className="mascot" viewBox="-6 -4 132 168" width={size} height={(size * 168) / 132} aria-hidden="true" dangerouslySetInnerHTML={{ __html: BODY + p.arms + face(p.face) + p.extra }} />
  );
}
