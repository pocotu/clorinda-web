import {
  Component,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PublicQueryService } from '../../../core/services';
import { PublicAttendanceResult } from '../../../core/models';
import { studentCodeValidator } from '../../../shared/validators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { environment } from '../../../../environments/environment';

/**
 * Public Attendance Query Component
 * Allows public users to query attendance by student code
 * Includes CAPTCHA integration and rate limiting handling
 */
@Component({
  selector: 'app-public-attendance-query',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './public-attendance-query.component.html',
  styleUrls: ['./public-attendance-query.component.css'],
})
export class PublicAttendanceQueryComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly publicQueryService = inject(PublicQueryService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  // Chart reference
  @ViewChild('attendanceChart') chartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  // Reactive form
  queryForm: FormGroup;

  // State signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  result = signal<PublicAttendanceResult | null>(null);
  captchaToken = signal<string | null>(null);
  captchaReady = signal(false);

  // CAPTCHA configuration
  private readonly captchaSiteKey = environment.recaptchaSiteKey;

  constructor() {
    // Register Chart.js components
    if (this.isBrowser()) {
      Chart.register(...registerables);
    }

    // Initialize form with validators
    // Configure updateOn: 'blur' for real-time validation on blur event
    this.queryForm = this.fb.group(
      {
        studentCode: ['', [Validators.required, studentCodeValidator()]],
      },
      {
        updateOn: 'blur', // Validate on blur instead of on change
      }
    );
  }

  ngOnInit(): void {
    if (!this.isBrowser()) {
      return;
    }
    if (!this.captchaSiteKey) {
      this.errorMessage.set('CAPTCHA no configurado. Contacte al administrador.');
      return;
    }
    // Load reCAPTCHA script
    this.loadRecaptchaScript();
  }

  ngAfterViewInit(): void {
    // Chart will be created when results are available
  }

  /**
   * Load Google reCAPTCHA v2 script dynamically
   */
  private loadRecaptchaScript(): void {
    if (!this.isBrowser()) {
      return;
    }
    const win = this.getWindow();
    if (!win) {
      return;
    }
    // Check if script already loaded
    if (this.document.getElementById('recaptcha-script')) {
      this.initRecaptcha();
      return;
    }

    const script = this.document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;

    // Set up callback for when script loads
    (win as any).onRecaptchaLoad = () => {
      this.initRecaptcha();
    };

    this.document.head.appendChild(script);
  }

  /**
   * Initialize reCAPTCHA widget
   */
  private initRecaptcha(): void {
    if (!this.isBrowser()) {
      return;
    }
    const win = this.getWindow();
    const grecaptcha = win ? (win as any).grecaptcha : null;

    if (!grecaptcha) {
      console.error('reCAPTCHA not loaded');
      return;
    }

    // Wait for DOM to be ready
    setTimeout(() => {
      const container = this.document.getElementById('recaptcha-container');

      if (!container) {
        console.error('reCAPTCHA container not found');
        return;
      }

      try {
        grecaptcha.render('recaptcha-container', {
          sitekey: this.captchaSiteKey,
          callback: (token: string) => this.onCaptchaSuccess(token),
          'expired-callback': () => this.onCaptchaExpired(),
          'error-callback': () => this.onCaptchaError(),
        });

        this.captchaReady.set(true);

        // Add aria-label to the dynamically generated reCAPTCHA textarea for accessibility
        setTimeout(() => {
          const textarea = this.document.getElementById('g-recaptcha-response');
          if (textarea) {
            textarea.setAttribute('aria-label', 'Verificación CAPTCHA');
          }
        }, 150);
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
      }
    }, 100);
  }

  /**
   * Handle successful CAPTCHA verification
   * @param token - CAPTCHA token
   */
  private onCaptchaSuccess(token: string): void {
    this.captchaToken.set(token);
    this.errorMessage.set(null);
  }

  /**
   * Handle CAPTCHA expiration
   */
  private onCaptchaExpired(): void {
    this.captchaToken.set(null);
    this.errorMessage.set('La verificación CAPTCHA ha expirado. Por favor, complétala nuevamente.');
  }

  /**
   * Handle CAPTCHA error
   */
  private onCaptchaError(): void {
    this.captchaToken.set(null);
    this.errorMessage.set('Error al cargar CAPTCHA. Por favor, recarga la página.');
  }

  /**
   * Reset CAPTCHA widget
   */
  private resetCaptcha(): void {
    if (!this.isBrowser()) {
      return;
    }
    const win = this.getWindow();
    const grecaptcha = win ? (win as any).grecaptcha : null;

    if (grecaptcha) {
      try {
        grecaptcha.reset();
        this.captchaToken.set(null);
      } catch (error) {
        console.error('Error resetting reCAPTCHA:', error);
      }
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getWindow(): Window | null {
    return this.document.defaultView ?? null;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Clear previous results and errors
    this.errorMessage.set(null);
    this.result.set(null);
    this.destroyChart();

    // Validate form
    if (this.queryForm.invalid) {
      this.queryForm.markAllAsTouched();
      return;
    }

    // Validate CAPTCHA
    if (!this.captchaToken()) {
      this.errorMessage.set('Por favor, completa la verificación CAPTCHA');
      return;
    }

    // Set loading state
    this.isLoading.set(true);

    const { studentCode } = this.queryForm.value;
    const captchaToken = this.captchaToken()!;

    this.publicQueryService.queryAttendance(studentCode, captchaToken).subscribe({
      next: (result) => {
        this.isLoading.set(false);
        this.result.set(result);
        this.resetCaptcha();
        // Create chart after result is set
        setTimeout(() => this.createChart(), 100);
      },
      error: (error: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message);
        this.resetCaptcha();
      },
    });
  }

  /**
   * Check if form can be submitted
   * @returns boolean
   */
  canSubmit(): boolean {
    return this.queryForm.valid && !!this.captchaToken() && !this.isLoading();
  }

  /**
   * Check if a form field has errors and has been touched
   * @param fieldName - Name of the form field
   * @returns boolean
   */
  hasError(fieldName: string): boolean {
    const field = this.queryForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get error message for student code field
   * @returns string | null
   */
  getStudentCodeError(): string | null {
    const field = this.queryForm.get('studentCode');

    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.errors['required']) {
      return 'El código de estudiante es requerido';
    }

    if (field.errors['invalidStudentCode']) {
      return field.errors['invalidStudentCode'].message;
    }

    return null;
  }

  /**
   * Get status label in Spanish
   * @param status - Attendance status
   * @returns string
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PRESENTE: 'Presente',
      FALTA: 'Falta',
      TARDANZA: 'Tardanza',
      CON_PERMISO: 'Con Permiso',
      FERIADO: 'Feriado',
    };

    return labels[status] || status;
  }

  /**
   * Get status badge class
   * @param status - Attendance status
   * @returns string
   */
  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      PRESENTE: 'badge bg-success',
      FALTA: 'badge bg-danger',
      TARDANZA: 'badge bg-warning text-dark',
      CON_PERMISO: 'badge bg-info',
      FERIADO: 'badge bg-secondary',
    };

    return classes[status] || 'badge bg-secondary';
  }

  /**
   * Format percentage
   * @param percentage - Percentage value
   * @returns string
   */
  formatPercentage(percentage: number): string {
    return percentage.toFixed(1);
  }

  /**
   * Reset form and results
   */
  reset(): void {
    this.queryForm.reset();
    this.result.set(null);
    this.errorMessage.set(null);
    this.resetCaptcha();
    this.destroyChart();
  }

  /**
   * Create attendance chart
   */
  private createChart(): void {
    if (!this.chartCanvas || !this.result()) {
      return;
    }

    const summary = this.result()!.monthlySummary;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');

    if (!ctx) {
      return;
    }

    // Destroy existing chart if any
    this.destroyChart();

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: ['Presentes', 'Tardanzas', 'Faltas', 'Con Permiso'],
        datasets: [
          {
            label: 'Días',
            data: [summary.presentes, summary.tardanzas, summary.faltas, summary.conPermiso],
            backgroundColor: [
              'rgba(25, 135, 84, 0.8)', // Success green
              'rgba(255, 193, 7, 0.8)', // Warning yellow
              'rgba(220, 53, 69, 0.8)', // Danger red
              'rgba(13, 202, 240, 0.8)', // Info cyan
            ],
            borderColor: [
              'rgb(25, 135, 84)',
              'rgb(255, 193, 7)',
              'rgb(220, 53, 69)',
              'rgb(13, 202, 240)',
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Resumen de Asistencia Mensual',
            font: {
              size: 16,
              weight: 'bold',
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed.y || 0;
                const total =
                  summary.presentes + summary.tardanzas + summary.faltas + summary.conPermiso;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${label}: ${value} días (${percentage}%)`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
            },
            title: {
              display: true,
              text: 'Número de Días',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Estado de Asistencia',
            },
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  /**
   * Destroy chart instance
   */
  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }
}
