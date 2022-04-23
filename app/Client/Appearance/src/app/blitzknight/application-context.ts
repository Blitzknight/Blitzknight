import * as PIXI from 'pixi.js';
import { LoaderResource } from 'pixi.js';
import { LoggerUtils } from '../misc/logger-utils';
import { VisualObject } from './model/visual-object';

export abstract class ApplicationContext {
  static readonly LOG = LoggerUtils.getLogger('ApplicationContext');

  private mPixi: PIXI.Application;

  private mResourceLoaded = false;

  visualObject: VisualObject = new VisualObject();

  constructor() {
    this.mPixi = new PIXI.Application({
      width: 1280,
      height: 720,
      backgroundColor: 0x1099bb,
    });

    this.mPixi.loader.add('gripe_run_right', 'assets/image/sprite/gripe_run_right.png');
    this.mPixi.loader.load(() => {
      ApplicationContext.LOG.debug('[load()] リソースの読み込みが完了しました。');
      this.mResourceLoaded = true;
      this.visualObject.onCreate(this);

      this.mPixi.stage.addChild(this.visualObject.sprite);
    });
  }

  getApplication(): PIXI.Application {
    return this.mPixi;
  }

  getResource(name: string): LoaderResource | null {
    return this.mPixi.loader.resources[name];
  }
}
