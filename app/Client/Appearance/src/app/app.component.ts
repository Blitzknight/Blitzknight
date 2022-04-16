import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  title = 'app';

  public app?: PIXI.Application;

  @ViewChild('pixiContainer') pixiContainer?: ElementRef;

  ngAfterViewInit() {
    console.debug('[ngAfterViewInit]' + this.pixiContainer);
    if (this.pixiContainer) {
      console.debug('[ngAfterViewInit] PIXI初期化');
      this.app = new PIXI.Application({
        // this creates our pixi application
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
      });
      const text = new PIXI.Text('Hello PixiJS', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0x101010,
        align: 'center',
      });
      text.anchor.set(0.5);
      text.x = 140;
      text.y = 300;

      this.app.stage.addChild(text);

      const container = this.example_Container();
      // Move container to the center
      container.x = this.app.screen.width / 2;
      container.y = this.app.screen.height / 2;

      // Center bunny sprite in local container coordinates
      container.pivot.x = container.width / 2;
      container.pivot.y = container.height / 2;

      // Listen for animate update
      this.app.ticker.add((delta) => {
        // rotate the container!
        // use delta to create frame-independent transform
        container.rotation -= 0.01 * delta;
      });

      this.app.stage.addChild(container);

      PIXI.utils.sayHello('type');
      this.pixiContainer.nativeElement.appendChild(this.app.view);
    }
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
}
