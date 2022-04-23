import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { ApplicationContext } from './blitzknight/application-context';
import { LoggerUtils } from './misc/logger-utils';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  title = 'app';

  static readonly LOG = LoggerUtils.getLogger('AppService');

  @ViewChild('pixiContainer') pixiContainer?: ElementRef;

  public app?: PIXI.Application;

  pureRenderer = new PIXI.Renderer({ width: 1280, height: 720, backgroundColor: 0x000000 });
  renderer?: PIXI.Renderer | PIXI.AbstractRenderer;

  stage = new PIXI.Container(); // Everything ends up here.
  spriteLayer = new PIXI.Container();
  debugLayer = new PIXI.Container();
  uiLayer = new PIXI.Container(); // Text UI on top
  boundaryGraphics = new PIXI.Graphics(); // our stage boundaries are on their own graphics object we handle
  infoText = new PIXI.Text('', new PIXI.TextStyle({ fill: '#ffffff' }));
  topText = new PIXI.Text('', new PIXI.TextStyle({ fontSize: '11pt', fill: '#ffffff' }));
  bottomText = new PIXI.Text('', new PIXI.TextStyle({ fontSize: '11pt', fill: '#ffffff' }));

  world?: planck.World;
  gameObjects: GameObject[] = []; // Our list of GameObject instances.

  readonly pixelsPerMeter = 50.0; // How many pixels represent 1 meter.
  readonly metersPerPixel = 1.0 / this.pixelsPerMeter; // And the reverse.

  // タイミング
  gameTime = 0; // Elapsed time since updating began.
  lastTime = 0;
  frameTime = 0;
  accumulator = 0;
  physicsSteps = 60; // How many physics steps per second.  : 1秒あたりの物理演算ステップ数 (大きいほど物理演算が細かくなるが、パフォーマンスに影響)
  timestep = 1000 / this.physicsSteps; //
  deltaTime = this.timestep / 1000; // Since we're fixed, we don't need to divide constantly during simulation.

  // パラメータ
  forceStrength = 50; // How much power our bunnies posses. : オブジェクトが持つ力の大きさ(「0」の場合、一切力を持たないためオブジェクトは動かない)
  deleteQueued = false; // Destroying stuff during a physics step would be crashy. : 次の物理演算ステップでオブジェクトを破棄します
  deleteAll = false; // Flag to remove all objects next cycle (again, input polling it outside main loop, so we have to handle this cleanly) : 次のサイクルですべてのオブジェクトを削除するためのフラグを立てます（ここでも、メインループの外側で入力ポーリングを行うため、これをクリーンに処理する必要があります）
  interpolation = true; // Draw PIXI objects between physics states for smoother animation. : よりスムーズなアニメーションのために、物理状態の間にPIXIオブジェクトを描画します
  drawLines = true; // Draw Debug lines : デバッグライン表示
  bulletMode = true; // Flag new objects as bullets (prevents tunneling, but is harsh on performance) : 新しいオブジェクトに箇条書きのフラグを立てます（トンネリングを防ぎますが、パフォーマンスに厳しいです）

  constructor(protected context: ApplicationContext) {}

  /** @override */
  ngAfterViewInit() {
    console.debug('[ngAfterViewInit]' + this.pixiContainer);
    AppComponent.LOG.debug('[ngAfterViewInit] aaa');
    if (this.pixiContainer) {
      console.debug('[ngAfterViewInit] PIXI初期化');

      PIXI.utils.sayHello('type');

      this.app = this.context.getApplication();
      this.stage = this.app.stage;
      // this.app = new PIXI.Application({
      //   // this creates our pixi application
      //   width: 1280,
      //   height: 720,
      //   backgroundColor: 0x1099bb,
      // });

      // PlankJSのサンプルではPureRendererを使用していたが、PIXI.Application内のレンダラでも可能。
      this.renderer = this.app?.renderer;
      //this.renderer = this.pureRenderer; //this.app?.renderer;

      // 物理演算のステージ構成
      this.stage.addChild(this.spriteLayer);
      this.stage.addChild(this.debugLayer);
      this.stage.addChild(this.uiLayer);

      this.debugLayer.addChild(this.boundaryGraphics);

      this.infoText.x = 30;
      this.infoText.y = 25;
      this.uiLayer.addChild(this.infoText);

      this.topText.x = 20;
      this.topText.y = 0;
      this.uiLayer.addChild(this.topText);

      if (this.renderer) {
        this.bottomText.x = 20;
        this.bottomText.y = this.renderer.screen.height - 40;
        this.uiLayer.addChild(this.bottomText);
      }

      const text = new PIXI.Text('Hello PixiJS', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0x101010,
        align: 'center',
      });
      text.anchor.set(0.5);
      text.x = 140;
      text.y = 300;

      // this.app.stage.addChild(text);
      this.stage.addChild(text);

      const container = this.example_Container();
      // Move container to the center
      container.x = this.renderer.screen.width / 2;
      container.y = this.renderer.screen.height / 2;

      // Center bunny sprite in local container coordinates
      container.pivot.x = container.width / 2;
      container.pivot.y = container.height / 2;

      // We stop Pixi ticker using stop() function because autoStart = false does NOT stop the shared ticker:
      // doc: http://pixijs.download/release/docs/PIXI.Application.html
      this.app.ticker.stop();

      // Listen for animate update
      this.app.ticker.add((delta) => {
        // rotate the container!
        // use delta to create frame-independent transform
        container.rotation -= 0.01 * delta;
      });

      // this.app.stage.addChild(container);
      this.stage.addChild(container);

      this.pixiContainer.nativeElement.appendChild(this.renderer.view);

      this.generateWorld();

      requestAnimationFrame((prop) => this.step(prop));
    }
  }

  /**
   * 「シェイプ追加」ボタン押下時のイベントハンドラ.
   */
  onClickAddShape() {
    console.log('[onClickAddShape] in');
    if (this.world) {
      console.log('[onClickAddShape] シェイプを追加');
      var size = this.randrange(25, 70);
      var o = new GameObject(this.spriteLayer, this.debugLayer, {
        world: this.world,
        position: { x: 200, y: 200 },
        angle: Math.random(),
        angularVelocity: 0,
        radius: size,
        // type: 'dynamic',
        // shape: 'circle',
        color: this.randcolor(),
        restitution: (100 - size) / 100,
        friction: size / 100,
        density: (size * 2) / 100,
        // texture: 'bunny',
        bulletMode: this.bulletMode,
        metersPerPixel: this.metersPerPixel,
        pixelsPerMeter: this.pixelsPerMeter,
      });

      var force = planck.Vec2(this.forceStrength, this.forceStrength).mul(this.deltaTime * this.pixelsPerMeter);
      o.body.applyLinearImpulse(force, o.body.getWorldCenter());

      this.gameObjects.push(o);
    }
  }

  onClickAddShape2() {
    console.log('[onClickAddShape] in');
    if (this.world) {
      console.log('[onClickAddShape] シェイプを追加');
      var size = this.randrange(25, 70);
      var o = new GameObject(this.spriteLayer, this.debugLayer, {
        world: this.world,
        position: { x: 200, y: 200 },
        angle: 0,
        angularVelocity: 0,
        radius: size,
        // type: 'dynamic',
        // shape: 'circle',
        color: this.randcolor(),
        restitution: 0,
        friction: 10000,
        density: 10000,
        // texture: 'bunny',
        bulletMode: this.bulletMode,
        metersPerPixel: this.metersPerPixel,
        pixelsPerMeter: this.pixelsPerMeter,
      });

      // var force = planck.Vec2(this.forceStrength, this.forceStrength).mul(this.deltaTime * this.pixelsPerMeter);
      // o.body.applyLinearImpulse(force, o.body.getWorldCenter());

      this.gameObjects.push(o);
    }
  }

  /**
   * 「削除」ボタン押下時のイベントハンドラ.
   */
  onClickDelete() {
    this.deleteQueued = true;
  }

  /**
   * 「全削除」ボタン押下時のイベントハンドラ.
   */
  onClickDeleteAll() {
    this.deleteAll = true;
  }

  onClickTimestepAdd() {
    this.physicsSteps += 5;
    if (this.physicsSteps > 200) this.physicsSteps = 200;
    this.timestep = 1000 / this.physicsSteps;
    this.deltaTime = this.timestep / 1000;
  }

  onClickTimestepDel() {
    this.physicsSteps -= 5;
    if (this.physicsSteps < 5) this.physicsSteps = 5;
    this.timestep = 1000 / this.physicsSteps;
    this.deltaTime = this.timestep / 1000;
  }

  onClickShowSprite() {
    AppComponent.LOG.debug('[onClickShowSprite] in');
    this.app?.loader.add('gripe_run_right', 'assets/image/sprite/gripe_run_right.png');
    this.app?.loader.load(() => {
      const baseTexture = this.app?.loader.resources['gripe_run_right'].texture?.baseTexture;
      if (baseTexture) {
        let position = 2;
        const textture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(64 * (position - 1), 0, 64, 64));
        const sprite = new PIXI.Sprite(textture);
        sprite.x = 140;
        sprite.y = 180;
        this.stage.addChild(sprite);

        position = 3;
        const textture2 = new PIXI.Texture(baseTexture, new PIXI.Rectangle(64 * (position - 1), 0, 64, 64));
        const sprite2 = new PIXI.Sprite(textture2);
        sprite2.x = 240;
        sprite2.y = 180;
        this.stage.addChild(sprite2);
      }
    });
  }

  private randrange(min: number, max: number) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
  }

  private randcolor() {
    return Math.floor(Math.random() * 16777215);
  }

  private example_Container(): PIXI.Container {
    const container = new PIXI.Container();

    const texture = PIXI.Texture.from('assets/bunny.png');

    // Create a 5x5 grid of bunnies
    for (let i = 0; i < 25; i++) {
      const bunny = new PIXI.Sprite(texture);
      bunny.anchor.set(0.5);
      bunny.x = (i % 5) * 40;
      bunny.y = Math.floor(i / 5) * 40;
      container.addChild(bunny);
    }

    return container;
  }

  step(timestamp: number) {
    // console.log('[step] in' + timestamp);
    requestAnimationFrame((prop) => this.step(prop));

    if (this.deleteQueued) {
      if (this.gameObjects.length) {
        this.gameObjects[0].destroy();
        this.gameObjects.splice(0, 1);
      }
      this.deleteQueued = false; // dequeue if nothing is available
    }

    if (this.deleteAll) {
      for (let o = 0; o < this.gameObjects.length; o++) {
        this.gameObjects[o].destroy();
      }
      this.gameObjects = [];
      this.deleteAll = false;
    }

    if (this.lastTime) {
      this.frameTime = timestamp - this.lastTime;
      if (this.frameTime > 100) {
        // Panic! In this state, we need to start removing objects!
        this.frameTime = 100;
        if (this.gameObjects.length) {
          this.gameObjects[0].destroy();
          this.gameObjects.splice(0, 1);
          if (this.gameObjects.length > 10) {
            // Be more aggressive.
            for (let d = 0; d < 10; d++) {
              this.gameObjects[0].destroy();
              this.gameObjects.splice(0, 1);
            }
          }
        }
      }

      this.accumulator += this.frameTime;

      while (this.accumulator >= this.timestep) {
        // walk in reverse since we could be splicing.
        for (let o = this.gameObjects.length - 1; o >= 0; o--) {
          // delete objects flagged out of bounds
          if (this.gameObjects[o].dirty) {
            this.gameObjects[o].destroy();
            this.gameObjects.splice(o, 1);
            continue;
          }
          if (!this.gameObjects[o].body.isStatic()) this.gameObjects[o].update(this.deltaTime);
        }

        if (this.world) {
          this.world.step(this.deltaTime); // step box2d
        }

        this.gameTime += this.timestep;
        this.accumulator -= this.timestep;
      }

      this.app?.ticker.update();
      this.render(this.accumulator / this.timestep); // PIXI time.
    }

    this.lastTime = timestamp;
  }

  render(alpha: number) {
    if (this.renderer) {
      for (let o = 0; o < this.gameObjects.length; o++) {
        this.gameObjects[o].integrate(this.renderer, alpha, this.interpolation, this.drawLines);
      }

      if (this.world) {
        // Planck.js maintained box2d quite enthusiastically, including not-very-js ways of doing things.
        // Being a C++ library written in ~2007, it iterates strangely for javascript programmers =)
        // Also note, that most getters in planck.js are by reference, so that's fun!
        // I did the level boundaries in a more vanilla way here, so we could see an example of that in action.

        this.boundaryGraphics.clear();
        for (var body = this.world.getBodyList(); body; body = body.getNext()) {
          var userData = body.getUserData() as any;
          if ('gameObject' in userData) continue; // we skip to the next object if this is a gameObject (handled these above already)
          for (var fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            var shape = fixture.getShape() as any;
            if (shape.getType() == 'edge' && userData.myType == 'boundary') {
              this.boundaryGraphics.lineStyle(3, 0xfeeb77, 1);
              this.boundaryGraphics.moveTo(
                shape.m_vertex1.x * this.pixelsPerMeter,
                shape.m_vertex1.y * this.pixelsPerMeter
              );
              this.boundaryGraphics.lineTo(
                shape.m_vertex2.x * this.pixelsPerMeter,
                shape.m_vertex2.y * this.pixelsPerMeter
              );
            }
          }
        }
        this.boundaryGraphics.endFill();

        // Set our text for rendering.
        const bulletMode = false;
        const worldAny = this.world as any;
        this.infoText.text =
          'Steps: ' +
          worldAny.getProxyCount() +
          ' (' +
          this.physicsSteps +
          '/sec @ ' +
          this.frameTime.toFixed(2) +
          'ms)';
        this.infoText.text += '\n#: ' + this.gameObjects.length;
        this.topText.text =
          'SPACE: bunnies!    ENTER: random geometry    DEL: remove object    NumPad +/-: gravity (' +
          this.world.getGravity().y.toFixed(2) +
          ')';
        this.topText.text +=
          '    up / down : impulse (' +
          this.forceStrength.toFixed(2) +
          ')    ' +
          '[ ] = timestep (' +
          this.timestep.toFixed(2) +
          ')';
        this.bottomText.text =
          '(L)ines: are ' +
          (this.drawLines ? 'On' : 'Off') +
          '  (I)nterpolation: is ' +
          (this.interpolation ? 'On' : 'Off') +
          '  (B)ulletMode: is ' +
          (bulletMode ? 'On' : 'Off') +
          '';
        this.bottomText.text +=
          '        (C)ircle  (S)quare  (T)riangle         (R)eset Scene      Click an object to apply random force';
      }

      this.renderer.render(this.stage);
    }
  }

  private generateWorld() {
    // Our main Box2D world.
    this.world = planck.World({
      gravity: planck.Vec2(0, 100), // approximate normal earth gravity
    });

    var ground = this.world.createBody({
      // The confinement area for our sandbox (サンドボックスの閉じ込めエリア)
      userData: {
        myType: 'boundary',
        label: 'ground',
      },
    });
    var ground2 = this.world.createBody({
      // The confinement area for our sandbox (サンドボックスの閉じ込めエリア)
      userData: {
        myType: 'boundary',
        label: 'ground',
      },
    });

    const renderer = this.renderer;

    // 1
    if (renderer) {
      const padding = 20;
      const padding_bottom = padding * 2;
      const width_meters = (renderer.screen.width - padding) * this.metersPerPixel;
      // Shortcuts because lazy
      const topLeft = planck.Vec2(padding * this.metersPerPixel, padding * this.metersPerPixel);
      const topRight = planck.Vec2(width_meters, padding * this.metersPerPixel);
      const bottomLeft = planck.Vec2(
        padding * this.metersPerPixel,
        (renderer.screen.height - padding_bottom) * this.metersPerPixel
      );
      const bottomRight = planck.Vec2(width_meters, (renderer.screen.height - padding_bottom) * this.metersPerPixel);

      console.log(`Render Screen Size: ${renderer.screen.width}, ${renderer.screen.height}`);
      console.log(`TopLeft,TopRight,BottomLeft,BottomRight : ${topLeft}, ${topRight}, ${bottomLeft}, ${bottomRight}`);

      // generate the fixtures on our ground body, one for each side of the room.
      ground.createFixture(planck.Edge(topLeft, topRight));
      ground.createFixture(planck.Edge(topRight, bottomRight));
      ground.createFixture(planck.Edge(bottomRight, bottomLeft));
      ground.createFixture(planck.Edge(bottomLeft, topLeft));
    }

    // 2
    if (renderer) {
      const padding = 250.0; // 20
      const padding_bottom = padding * 2;
      const width_meters = 12.0; //(renderer.screen.width - padding) * this.metersPerPixel;
      // Shortcuts because lazy
      const topLeft = planck.Vec2(padding * this.metersPerPixel, padding * this.metersPerPixel);
      const topRight = planck.Vec2(width_meters, padding * this.metersPerPixel);
      const bottomLeft = planck.Vec2(
        padding * this.metersPerPixel,
        (renderer.screen.height - padding_bottom) * this.metersPerPixel
      );
      const bottomRight = planck.Vec2(width_meters, (renderer.screen.height - padding_bottom) * this.metersPerPixel);

      console.log(`Render Screen Size: ${renderer.screen.width}, ${renderer.screen.height}`);
      console.log(`TopLeft,TopRight,BottomLeft,BottomRight : ${topLeft}, ${topRight}, ${bottomLeft}, ${bottomRight}`);

      // generate the fixtures on our ground body, one for each side of the room.
      ground2.createFixture(planck.Edge(topLeft, topRight));
      ground2.createFixture(planck.Edge(topRight, bottomRight));
      ground2.createFixture(planck.Edge(bottomRight, bottomLeft));
      ground2.createFixture(planck.Edge(bottomLeft, topLeft));
    }
  }
}

class PhysicsState {
  position: planck.Vec2;
  angle: number;

  constructor() {
    this.position = planck.Vec2(0, 0);
    this.angle = 0;
  }
  assign(position: planck.Vec2, a: number) {
    this.position = planck.Vec2.clone(position); // avoid the reference boogie-man
    this.angle = a;
  }
}

class GameObject {
  spriteDraw: PIXI.Graphics;
  debugDraw: PIXI.Graphics;
  container: PIXI.Container;
  world: planck.World;
  body: planck.Body;

  dirty = false;

  shapeType = 'box';

  previousState: PhysicsState;

  pixelsPerMeter: number;
  metersPerPixel: number;

  private bulletCounter = 0; // Expire our bullet flag after a short time; it's only needed for launching really.

  constructor(spriteLayer: PIXI.Container, debugLayer: PIXI.Container, opts: GameObjectParameter) {
    this.world = opts.world;
    this.spriteDraw = new PIXI.Graphics();
    this.debugDraw = new PIXI.Graphics();
    this.container = new PIXI.Container();
    this.pixelsPerMeter = opts.pixelsPerMeter;
    this.metersPerPixel = opts.metersPerPixel;

    this.body = this.world.createBody({
      type: 'dynamic',
      bullet: opts.bulletMode,
      angle: opts.angle,
      angularVelocity: opts.angularVelocity,
      position: new planck.Vec2({ x: opts.position.x * opts.metersPerPixel, y: opts.position.y * opts.metersPerPixel }),
      userData: {
        // 将来の処理のために、このボディにuserDataを割り当てます
        gameObject: true,
      },
    });

    if (this.shapeType == 'box') {
      this.body.createFixture(
        planck.Box((opts.radius / 2) * opts.metersPerPixel, (opts.radius / 2) * opts.metersPerPixel),
        {
          friction: opts.friction,
          restitution: opts.restitution,
          density: opts.density,
        }
      );

      if (this.spriteDraw instanceof PIXI.Sprite == false) {
        this.spriteDraw.beginFill(opts.color, 1);
        this.spriteDraw.drawRect(0, 0, opts.radius, opts.radius);
        this.spriteDraw.endFill();
        // Boxes need their origin centralized, because box2d uses center of mass (this keeps our "sprite" within our body.
        // Circles do this naturally
        this.spriteDraw.pivot.x = this.spriteDraw.width / 2;
        this.spriteDraw.pivot.y = this.spriteDraw.height / 2;
      }
    }

    // For interpolation, we need to know our Body's previous physics state.
    this.previousState = new PhysicsState();
    this.previousState.assign(this.body.getPosition(), this.body.getAngle());

    // If a texture is present, we need to center our origin
    if (this.spriteDraw instanceof PIXI.Sprite) {
      const spriteon = this.spriteDraw as PIXI.Sprite;
      spriteon.pivot.x = spriteon.width / 2;
      spriteon.pivot.y = spriteon.height / 2;
      spriteon.scale.set(
        opts.radius * opts.metersPerPixel * (opts.pixelsPerMeter / 12),
        opts.radius * opts.metersPerPixel * (opts.pixelsPerMeter / 12)
      );
    }

    // Container is our main interface to PIXI. (コンテナは、PIXIへのメインインターフェイスです。)
    this.container.pivot.x = this.container.width / 2;
    this.container.pivot.y = this.container.height / 2;
    this.container.x = opts.position.x * opts.pixelsPerMeter;
    this.container.y = opts.position.y * opts.pixelsPerMeter;
    this.container.addChild(this.spriteDraw); // Add the sprite after you setup the container, lest it gets goofy.
    spriteLayer.addChild(this.container);

    //this.container.interactive = true;
    //this.container.buttonMode = true;
    //this.container.on('pointerdown', this.click.bind(this));

    // Debug lines
    this.debugDraw.x = this.container.x = opts.position.x;
    this.debugDraw.y = this.container.y = opts.position.y;
    debugLayer.addChild(this.debugDraw);
  }

  integrate(
    renderer: PIXI.Renderer | PIXI.AbstractRenderer,
    alpha: number,
    interpolation: boolean,
    drawLines: boolean
  ) {
    // Interpolate or snap?
    this.container.x = interpolation
      ? this.body.getPosition().x * alpha * this.pixelsPerMeter +
        this.previousState.position.x * (1 - alpha) * this.pixelsPerMeter
      : this.body.getPosition().x * this.pixelsPerMeter;
    this.container.y = this.pixelsPerMeter
      ? this.body.getPosition().y * alpha * this.pixelsPerMeter +
        this.previousState.position.y * (1 - alpha) * this.pixelsPerMeter
      : this.body.getPosition().y * this.pixelsPerMeter;
    this.container.rotation = interpolation
      ? this.body.getAngle() * alpha + this.previousState.angle * (1 - alpha)
      : this.body.getAngle(); // we don't convert rotations

    // If something is off the screen, we should get rid of it.
    var p = this.body.getWorldCenter();
    if (
      p.x > renderer.screen.width * this.metersPerPixel ||
      p.x < 0 ||
      p.y > renderer.screen.height * this.metersPerPixel ||
      p.y < 0
    )
      this.dirty = true;
    else this.dirty = false;

    // Debug lines -- Yeah, these are not very fast, but useful for a testbed.
    this.debugDraw.clear();

    if (drawLines) {
      this.debugDraw.x = this.container.x;
      this.debugDraw.y = this.container.y;
      this.debugDraw.rotation = interpolation
        ? this.body.getAngle() * alpha + this.previousState.angle * (1 - alpha)
        : this.body.getAngle();
      this.debugDraw.lineStyle(1, 0x00ff2a, 1);

      if (this.body) {
        if (this.shapeType != 'circle') {
          // width and height don't seem to be a concept to boxes in box2d, so we go by their vertices.
          for (var fixture = this.body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            var shape = fixture.getShape() as any; // we do make an assumption that there's just one fixture; keep this in mind if you add more.
            const a1 = shape as planck.Shape;
            // console.log('vertex:' + shape.getVertex(0).x);
            this.debugDraw.moveTo(
              shape.getVertex(0).x * this.pixelsPerMeter,
              shape.getVertex(0).y * this.pixelsPerMeter
            );
            for (var v = 1; v < shape.m_count; v++) {
              this.debugDraw.lineTo(
                shape.getVertex(v).x * this.pixelsPerMeter,
                shape.getVertex(v).y * this.pixelsPerMeter
              );
            }
            this.debugDraw.lineTo(
              shape.getVertex(0).x * this.pixelsPerMeter,
              shape.getVertex(0).y * this.pixelsPerMeter
            );
          }
        } else if (this.shapeType == 'circle') {
          var r = this.body.getFixtureList()?.getShape().m_radius;
          if (r) {
            this.debugDraw.drawCircle(0, 0, r * this.pixelsPerMeter);
          }
        }
      }
      this.debugDraw.endFill();
    }
  }

  update(dt: number) {
    // turn off bullet mode after launch
    if (this.body.isBullet()) this.bulletCounter += dt;
    if (this.bulletCounter > 1) {
      this.bulletCounter = 0;
      this.body.setBullet(false);
    }
    // Store previous state
    this.previousState.assign(this.body.getPosition(), this.body.getAngle());
  }

  destroy() {
    // box2d cleanup
    this.world.destroyBody(this.body);
    // pixi cleanup
    this.container.destroy({ children: true });
    this.debugDraw.destroy();
  }
}

interface GameObjectParameter {
  bulletMode: boolean;
  world: planck.World;
  angle: number;
  position: { x: number; y: number };
  metersPerPixel: number;
  pixelsPerMeter: number;
  angularVelocity: number;
  color: number;
  radius: number;
  friction: number;
  density: number;
  restitution: number;
}
