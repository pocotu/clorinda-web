import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../core/services';

@Component({
  selector: 'app-logros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logros.component.html',
  styleUrl: './logros.component.css',
})
export class LogrosComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Logros y Reconocimientos | IE Emblemática Clorinda Matto de Turner | Cusco',
      description:
        'Descubre los logros académicos, deportivos, culturales e institucionales de la IE Emblemática Clorinda Matto de Turner en Cusco. Primer lugar en olimpiadas, campeonatos regionales y premios del MINEDU.',
      keywords:
        'logros Clorinda Matto de Turner, olimpiadas matemática Cusco, campeón deportivo colegio Cusco, premios educación Cusco, festival danzas Cusco, excelencia educativa Perú',
      canonicalPath: '/logros',
    });
  }

  logros = [
    {
      anio: '2025',
      titulo: 'Primer Lugar Nacional en Olimpiadas de Matemática',
      descripcion:
        'Nuestros estudiantes obtuvieron el primer lugar en las Olimpiadas Nacionales de Matemática.',
      categoria: 'academico',
      imagen: '',
    },
    {
      anio: '2025',
      titulo: 'Campeones Regionales de Fútbol',
      descripcion:
        'El equipo de fútbol del colegio se coronó campeón del torneo regional interescolar.',
      categoria: 'deportivo',
      imagen: '',
    },
    {
      anio: '2024',
      titulo: 'Premio a la Excelencia Educativa',
      descripcion: 'Reconocimiento del MINEDU por los altos estándares de calidad educativa.',
      categoria: 'institucional',
      imagen: '',
    },
    {
      anio: '2024',
      titulo: 'Festival de Danza y Cultura',
      descripcion: 'Primer lugar en el festival regional de danzas típicas del Cusco.',
      categoria: 'cultural',
      imagen: '',
    },
  ];

  estadisticas = [
    { numero: '95%', texto: 'Ingreso a universidades' },
    { numero: '50+', texto: 'Años de trayectoria' },
    { numero: '100+', texto: 'Premios y reconocimientos' },
    { numero: '2000+', texto: 'Estudiantes activos' },
  ];
}
