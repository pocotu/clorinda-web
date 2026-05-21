import { Component } from '@angular/core';
import { HeroComponent } from './components/hero/hero.component';
import { ComunicadosComponent } from './components/comunicados/comunicados.component';
import { ExalumnasComponent } from './components/exalumnas/exalumnas.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, ComunicadosComponent, ExalumnasComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
