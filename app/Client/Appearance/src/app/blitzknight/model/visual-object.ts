import * as PIXI from 'pixi.js';
import { LoggerUtils } from '../../misc/logger-utils';
import { ApplicationContext } from '../application-context';

export class VisualObject {
  static readonly LOG = LoggerUtils.getLogger('VisualObject');

  sprite: PIXI.Container;

  constructor() {
    this.sprite = new PIXI.Container();
  }

  onCreate(context: ApplicationContext) {
    VisualObject.LOG.debug('[onCreate] in');
    const resource = context.getResource('gripe_run_right');
    if (resource) {
      const baseTexture = resource.texture?.baseTexture;
      if (baseTexture) {
        VisualObject.LOG.debug('[onCreate] テクスチャ貼り付け');
        let position = 2;
        const textture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(64 * (position - 1), 0, 64, 64));
        const sprite = new PIXI.Sprite(textture);
        sprite.x = 140;
        sprite.y = 180;

        this.sprite.addChild(sprite);
      }
    }
  }
}
