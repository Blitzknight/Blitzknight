import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OmoikaneModule } from './omoikane/omoikane.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, OmoikaneModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
