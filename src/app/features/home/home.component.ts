import { Component, OnInit, inject } from '@angular/core';
import { HeroComponent } from './components/hero/hero.component';
import { ComunicadosComponent } from './components/comunicados/comunicados.component';
import { ExalumnasComponent } from './components/exalumnas/exalumnas.component';
import { SeoService } from '../../core/services';

/** Structured data for Google's Knowledge Graph — EducationalOrganization schema */
const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Institución Educativa Emblemática Clorinda Matto de Turner',
  alternateName: 'IE Clorinda Matto de Turner',
  url: 'https://clorindamattodeturner.edu.pe',
  logo: 'https://clorindamattodeturner.edu.pe/assets/images/logo.png',
  description:
    'Institución Educativa Emblemática pública de Cusco, Perú, con más de 50 años de trayectoria educativa. Brinda educación de calidad en niveles primaria y secundaria para niñas y adolescentes.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Cusco',
    addressLocality: 'Cusco',
    addressRegion: 'Cusco',
    addressCountry: 'PE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: '-13.5319',
    longitude: '-71.9675',
  },
  areaServed: 'Cusco, Perú',
  knowsLanguage: 'es',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, ComunicadosComponent, ExalumnasComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'IE Emblemática Clorinda Matto de Turner | Inicio | Cusco, Perú',
      description:
        'Bienvenidos a la Institución Educativa Emblemática Clorinda Matto de Turner en Cusco, Perú. Más de 50 años formando a las mejores estudiantes del sur del país con excelencia académica, arte y deporte.',
      keywords:
        'Clorinda Matto de Turner, colegio emblemático Cusco, IE Clorinda, educación secundaria Cusco, colegio femenino Cusco, noticias colegio Cusco, asistencia escolar Cusco',
      canonicalPath: '/',
      jsonLd: HOME_JSON_LD,
    });
  }
}
