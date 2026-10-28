import Phaser from 'phaser';
import { ARENA_SCENE } from './ArenaScene';
import { HUD_SCENE } from '../ui/HudScene';
import { generateTextures } from './textures';

/** Generates placeholder textures, then starts the arena with the HUD on top. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    generateTextures(this);
    this.scene.start(ARENA_SCENE, {});
    this.scene.launch(HUD_SCENE);
  }
}
