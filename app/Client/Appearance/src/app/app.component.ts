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

      PIXI.utils.sayHello('type');
      this.pixiContainer.nativeElement.appendChild(this.app.view);
    }
  }
}
