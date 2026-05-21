import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Exalumna {
  id: string;
  nombre: string;
  promocion: string;
  profesion: string;
  logro: string;
  frase: string;
  imagen?: string;
}

@Component({
  selector: 'app-exalumnas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exalumnas.component.html',
  styleUrl: './exalumnas.component.css',
})
export class ExalumnasComponent {
  exalumnas: Exalumna[] = [
    {
      id: '1',
      nombre: 'María Fernanda Quispe',
      promocion: 'Promoción 2015',
      profesion: 'Médica Cirujana',
      logro: 'Especialista en Cardiología - Hospital Regional del Cusco',
      frase:
        'El colegio me enseñó la disciplina y los valores que me llevaron al éxito profesional.',
      imagen: 'assets/images/exalumnas/img_ex_alum.png',
    },
    {
      id: '2',
      nombre: 'Ana Lucía Huamán',
      promocion: 'Promoción 2012',
      profesion: 'Ingeniera de Sistemas',
      logro: 'Líder de Proyectos en Google - Silicon Valley',
      frase: 'Gracias al colegio descubrí mi pasión por la tecnología y la innovación.',
      imagen: 'assets/images/exalumnas/img_exalum1.png',
    },
    {
      id: '3',
      nombre: 'Carmen Rosa Vargas',
      promocion: 'Promoción 2010',
      profesion: 'Abogada',
      logro: 'Defensora de Derechos Humanos - ONU',
      frase: 'Los valores de justicia y equidad que aprendí aquí guían mi trabajo.',
      imagen: 'assets/images/exalumnas/img_ex_alum.png',
    },
    {
      id: '4',
      nombre: 'Patricia Mendoza',
      promocion: 'Promoción 2018',
      profesion: 'Arquitecta',
      logro: 'Ganadora del Premio Nacional de Arquitectura Sostenible',
      frase:
        'El colegio me inspiró a soñar en grande y trabajar por el desarrollo de nuestra región.',
      imagen: 'assets/images/exalumnas/img_exalum1.png',
    },
  ];

  currentIndex = 0;

  get exalumnasVisibles() {
    return this.exalumnas.slice(this.currentIndex, this.currentIndex + 3);
  }

  anterior() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  siguiente() {
    if (this.currentIndex < this.exalumnas.length - 3) {
      this.currentIndex++;
    }
  }

  get mostrarAnterior(): boolean {
    return this.currentIndex > 0;
  }

  get mostrarSiguiente(): boolean {
    return this.currentIndex < this.exalumnas.length - 3;
  }
}
