import antidotePotionIconUrl from './potion-antidote.png';
import briarWardPotionIconUrl from './potion-briar-ward.png';
import calmingDraughtPotionIconUrl from './potion-calming-draught.png';
import deepDreamVisionPotionIconUrl from './potion-deep-dream-vision.png';
import dragonCouragePotionIconUrl from './potion-dragon-courage.png';
import elixirPotionIconUrl from './potion-elixir.png';
import frostmossCleansePotionIconUrl from './potion-frost-cleanse.png';
import genericPotionIconUrl from './potion-generic.png';
import healingPotionIconUrl from './potion-healing.png';
import lanternTonicPotionIconUrl from './potion-lantern-tonic.png';
import manaTonicPotionIconUrl from './potion-mana-tonic.png';
import minorHealingPotionIconUrl from './potion-minor-healing.png';
import moonFocusPotionIconUrl from './potion-moon-focus.png';
import nettleVigorPotionIconUrl from './potion-nettle-vigor.png';
import pactWardPotionIconUrl from './potion-pact-ward.png';
import sleepDraughtPotionIconUrl from './potion-sleep-draught.png';
import staminaPotionIconUrl from './potion-stamina.png';
import starLuckPotionIconUrl from './potion-star-luck.png';
import venomDraughtPotionIconUrl from './potion-venom-draught.png';

export const potionIconUrlsByKey = Object.freeze({
  manaTonic: manaTonicPotionIconUrl,
  minorHealingPotion: minorHealingPotionIconUrl,
  nettleVigor: nettleVigorPotionIconUrl,
  calmingDraught: calmingDraughtPotionIconUrl,
  simpleAntidote: antidotePotionIconUrl,
  venomDraught: venomDraughtPotionIconUrl,
  briarWard: briarWardPotionIconUrl,
  lanternTonic: lanternTonicPotionIconUrl,
  healingPotion: healingPotionIconUrl,
  moonlitFocus: moonFocusPotionIconUrl,
  sunrootStamina: staminaPotionIconUrl,
  frostmossCleanse: frostmossCleansePotionIconUrl,
  sleepDraught: sleepDraughtPotionIconUrl,
  elixirOfLife: elixirPotionIconUrl,
  starLuckPhiltre: starLuckPotionIconUrl,
  dragonCourage: dragonCouragePotionIconUrl,
  deepDreamVision: deepDreamVisionPotionIconUrl,
  pactWard: pactWardPotionIconUrl,
});

const potionIconKeysByLabel = Object.freeze({
  'mana tonic': 'manaTonic',
  'minor healing potion': 'minorHealingPotion',
  'nettle vigor': 'nettleVigor',
  'calming draught': 'calmingDraught',
  'simple antidote': 'simpleAntidote',
  'venom draught': 'venomDraught',
  'briar ward': 'briarWard',
  'lantern tonic': 'lanternTonic',
  'healing potion': 'healingPotion',
  'moonlit focus': 'moonlitFocus',
  'sunroot stamina': 'sunrootStamina',
  'frostmoss cleanse': 'frostmossCleanse',
  'sleep draught': 'sleepDraught',
  'elixir of life': 'elixirOfLife',
  'star-luck philtre': 'starLuckPhiltre',
  'dragon courage': 'dragonCourage',
  'deep dream vision': 'deepDreamVision',
  'pact ward': 'pactWard',
  'ashen memory': 'ashenMemory',
  'silverleaf quiet': 'silverleafQuiet',
  'ember sight': 'emberSight',
  'thorn sleep': 'thornSleep',
  'glass moon elixir': 'glassMoonElixir',
  'rootbound resolve': 'rootboundResolve',
  'night orchard tonic': 'nightOrchardTonic',
  'starless courage': 'starlessCourage',
  'frostvein draught': 'frostveinDraught',
  'bloodlight ward': 'bloodlightWard',
  'wasted potion': 'wastedPotion',
  'unknown potion': 'unknownPotion',
});

const potionIconLabelEntries = Object.freeze(
  Object.entries(potionIconKeysByLabel)
    .map(([label, key]) => Object.freeze({ label, key }))
    .sort((first, second) => second.label.length - first.label.length),
);

export function getPotionIconUrl(itemKey) {
  return potionIconUrlsByKey[itemKey] ?? genericPotionIconUrl;
}

export function getPotionIconKeyByLabel(label) {
  return potionIconKeysByLabel[String(label ?? '').trim().toLowerCase()] ?? null;
}

export function getPotionIconLabelEntries() {
  return potionIconLabelEntries.map((entry) => ({ ...entry }));
}
