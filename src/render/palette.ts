/**
 * Visual palette. Readability first: dark desaturated floor, cool/bright player,
 * hot magenta/red enemies, gold for holy effects, cyan for runes.
 */
export const PALETTE = {
  background: 0x07060b,
  floor: 0x16131e,
  floorSlab: 0x1c1927,
  floorGrout: 0x0d0b13,
  floorCrack: 0x0a0810,
  floorSpeck: 0x2a2638,
  wall: 0x05040a,
  wallEdge: 0x7a3cff,
  pillar: 0x2b2735,
  pillarTop: 0x3a3548,
  rune: 0x48e0ff,
  runeCorrupt: 0xc03cff,

  cloak: 0x24366b,
  cloakDark: 0x1a274f,
  steel: 0xa9b3c4,
  steelDark: 0x5c6578,
  steelLight: 0xd5dbe6,
  visor: 0x10131c,
  gold: 0xf2c14e,
  leather: 0x5a3a22,
  blade: 0xcfd8e6,
  bladeEdge: 0xffffff,
  playerRim: 0x8fe9ff,

  huskBody: 0x3b1648,
  huskCrack: 0xff3fa4,
  huskRim: 0xb84dff,
  huskEye: 0xff4060,

  slash: 0xe8f6ff,
  slam: 0xffa94a,
  wrath: 0xffd76a,
  dodge: 0x7fe7ff,
  death: 0xc04dff,
  hurt: 0xff3040,
  telegraph: 0xff3b3b,
} as const;

export const CSS = {
  text: '#e9e4f5',
  dim: '#8f88a6',
  gold: '#f2c14e',
  red: '#ff4a5a',
  crit: '#ffd34a',
} as const;

export const FONT_TITLE = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
export const FONT_UI = '"Segoe UI", "Trebuchet MS", Roboto, Arial, sans-serif';
