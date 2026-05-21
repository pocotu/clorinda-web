import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnDestroy, OnInit, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  readonly collegeTitle = 'I.E. Emblemática Clorinda Matto de Turner';
  readonly collegeSubtitle =
    '"Liderando la formación académica y los valores para las futuras generaciones del Cusco. Un espacio digital seguro para nuestra comunidad educativa."';

  // Control del slider
  currentSlide = 0;
  totalSlides = 2;
  autoplayInterval: ReturnType<typeof setInterval> | null = null;

  // Control de audio para video hero principal
  audioActivadoHero = false;
  videoHeroElement: HTMLVideoElement | null = null;

  // Control de audio para video de Bodas de Diamante
  audioActivadoDiamante = false;
  videoDiamanteElement: HTMLVideoElement | null = null;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoplay();
    }
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.videoHeroElement = document.querySelector('#video-hero') as HTMLVideoElement;
    this.videoDiamanteElement = document.querySelector('#video-diamantes') as HTMLVideoElement;

    if (this.videoHeroElement) {
      this.videoHeroElement.muted = true;
    }
    if (this.videoDiamanteElement) {
      this.videoDiamanteElement.muted = true;
    }

    this.audioActivadoHero = false;
    this.audioActivadoDiamante = false;
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  startAutoplay() {
    this.stopAutoplay();
    this.ngZone.runOutsideAngular(() => {
      this.autoplayInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.autoNext();
        });
      }, 5000); // Cambia cada 5 segundos
    });
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  // Método privado para el autoplay automático (sin reiniciar el timer)
  private autoNext() {
    // Solo hay 2 slides: índices 0 y 1
    if (this.currentSlide >= this.totalSlides - 1) {
      this.currentSlide = 0; // Volver al inicio
    } else {
      this.currentSlide++;
    }

    this.cdr.detectChanges();
  }

  // Métodos públicos para navegación manual (reinician el timer)
  nextSlide() {
    // Al hacer click en "siguiente": del último al primero
    if (this.currentSlide >= this.totalSlides - 1) {
      this.currentSlide = 0;
    } else {
      this.currentSlide++;
    }
    this.stopAutoplay();
    this.startAutoplay();
  }

  prevSlide() {
    // Al hacer click en "anterior": del primero al último
    if (this.currentSlide <= 0) {
      this.currentSlide = this.totalSlides - 1;
    } else {
      this.currentSlide--;
    }
    this.stopAutoplay();
    this.startAutoplay();
  }

  goToSlide(index: number) {
    // Validar que el índice esté dentro del rango válido [0, 1]
    if (index >= 0 && index < this.totalSlides) {
      this.currentSlide = index;
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  toggleAudioHero() {
    if (this.videoHeroElement) {
      this.audioActivadoHero = !this.audioActivadoHero;
      this.videoHeroElement.muted = !this.audioActivadoHero;
    }
  }

  toggleAudioDiamante() {
    if (this.videoDiamanteElement) {
      this.audioActivadoDiamante = !this.audioActivadoDiamante;
      this.videoDiamanteElement.muted = !this.audioActivadoDiamante;
    }
  }
}
