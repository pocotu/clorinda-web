import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logros.component.html',
  styleUrl: './logros.component.css',
})
export class LogrosComponent {
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
