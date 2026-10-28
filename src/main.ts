import Phaser from 'phaser';
import { GAME_TITLE } from './data/game';
import { ArenaScene } from './render/ArenaScene';
import { BootScene } from './render/BootScene';
import { PALETTE } from './render/palette';
import { HudScene } from './ui/HudScene';

document.title = GAME_TITLE;

function boot(parent: HTMLElement): void {
  new Phaser.Game({
    type: Phaser.AUTO, // WebGL with Canvas fallback
    parent,
    backgroundColor: PALETTE.background,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: [BootScene, ArenaScene, HudScene],
    banner: false,
  });
}

/** WebGL framebuffers fail with a 0x0 canvas (e.g. page opened in a hidden tab), so wait for a real size. */
function whenSized(el: HTMLElement, cb: () => void): void {
  if (el.clientWidth > 0 && el.clientHeight > 0) cb();
  else requestAnimationFrame(() => whenSized(el, cb));
}

const parent = document.getElementById('game')!;
whenSized(parent, () => boot(parent));
