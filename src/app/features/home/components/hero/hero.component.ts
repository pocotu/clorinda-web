import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @ViewChild('bgImg') bgImgRef!: ElementRef<HTMLImageElement>;

  // UI state
  contentVisible = false;
  currentSlide = 0;
  readonly totalSlides = 2;

  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private animFrameId: number | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

  // Parallax state
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoplay();
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Fade-in on mount
    requestAnimationFrame(() => {
      this.contentVisible = true;
      this.cdr.detectChanges();
    });

    // Mouse parallax — runs outside Angular to avoid unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      this.mouseMoveHandler = (e: MouseEvent) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.targetX = ((e.clientX - cx) / cx) * 18;
        this.targetY = ((e.clientY - cy) / cy) * 10;
      };
      document.addEventListener('mousemove', this.mouseMoveHandler);
      this.runParallaxLoop();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.mouseMoveHandler) document.removeEventListener('mousemove', this.mouseMoveHandler);
  }

  // ── Parallax ─────────────────────────────────────────────────────
  private runParallaxLoop(): void {
    const tick = () => {
      this.currentX += (this.targetX - this.currentX) * 0.06;
      this.currentY += (this.targetY - this.currentY) * 0.06;
      const img = this.bgImgRef?.nativeElement;
      if (img) {
        img.style.transform = `translate(${this.currentX}px, ${this.currentY}px) scale(1.08)`;
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  // ── Slider ────────────────────────────────────────────────────────
  private startAutoplay(): void {
    this.stopAutoplay();
    this.ngZone.runOutsideAngular(() => {
      this.autoplayInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
          this.cdr.detectChanges();
        });
      }, 7000);
    });
  }

  private stopAutoplay(): void {
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.stopAutoplay();
    this.startAutoplay();
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
    this.stopAutoplay();
    this.startAutoplay();
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.totalSlides) {
      this.currentSlide = index;
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  goToAsistencia(): void {
    window.location.href = '/consulta-asistencia';
  }
}
