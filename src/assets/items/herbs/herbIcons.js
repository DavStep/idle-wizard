import bloodroseHerbIconUrl from './herb-bloodrose.png';
import briarHerbIconUrl from './herb-briar.png';
import dragonpepperHerbIconUrl from './herb-dragonpepper.png';
import dreambellHerbIconUrl from './herb-dreambell.png';
import frostmossHerbIconUrl from './herb-frostmoss.png';
import glowcapHerbIconUrl from './herb-glowcap.png';
import lavenderHerbIconUrl from './herb-lavender.png';
import mandrakeHerbIconUrl from './herb-mandrake.png';
import mintHerbIconUrl from './herb-mint.png';
import moonflowerHerbIconUrl from './herb-moonflower.png';
import nettleHerbIconUrl from './herb-nettle.png';
import sageHerbIconUrl from './herb-sage.png';
import starAniseHerbIconUrl from './herb-star-anise.png';
import sunrootHerbIconUrl from './herb-sunroot.png';

export const herbIconUrlsByKey = Object.freeze({
  bloodroseHerb: bloodroseHerbIconUrl,
  briarHerb: briarHerbIconUrl,
  dragonpepperHerb: dragonpepperHerbIconUrl,
  dreambellHerb: dreambellHerbIconUrl,
  frostmossHerb: frostmossHerbIconUrl,
  glowcapHerb: glowcapHerbIconUrl,
  lavenderHerb: lavenderHerbIconUrl,
  mandrakeHerb: mandrakeHerbIconUrl,
  mintHerb: mintHerbIconUrl,
  moonflowerHerb: moonflowerHerbIconUrl,
  nettleHerb: nettleHerbIconUrl,
  sageHerb: sageHerbIconUrl,
  starAniseHerb: starAniseHerbIconUrl,
  sunrootHerb: sunrootHerbIconUrl,
});

export function getHerbIconUrl(itemKey) {
  return herbIconUrlsByKey[itemKey] ?? null;
}
