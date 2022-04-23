import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicationContext } from './application-context';
import { ApplicationContextImpl } from './application-context-impl';

@NgModule({
  declarations: [],
  imports: [
    // Angular
    CommonModule,
  ],
  exports: [],
  providers: [{ provide: ApplicationContext, useClass: ApplicationContextImpl }],
})
export class BlitzknightModule {}
