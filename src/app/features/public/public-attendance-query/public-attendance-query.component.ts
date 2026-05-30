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
import { PublicQueryService, SeoService } from '../../../core/services';
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
  private readonly seo = inject(SeoService);

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
    this.seo.setPage({
      title: 'Consulta de Asistencia Escolar | IE Emblemática Clorinda Matto de Turner | Cusco',
      description:
        'Consulta en línea la asistencia de tu hija o estudiante en la IE Emblemática Clorinda Matto de Turner, Cusco. Ingresa el código de estudiante para ver el historial mensual.',
      keywords:
        'consulta asistencia escolar Cusco, asistencia estudiante Clorinda Matto, control asistencia colegio Cusco, historial asistencia perú, asistencia online colegio',
      canonicalPath: '/consulta-asistencia',
    });

    if (!this.isBrowser()) {
      return;
    }
    if (!this.captchaSiteKey) {
      this.errorMessage.set('CAPTCHA no configurado. Contacte al administrador.');
      return;
    }
    // Load reCAPTCHA script
    this.loadRecaptchaScript();

    // Listen to form status changes to fetch captcha token for reCAPTCHA v3
    this.queryForm.statusChanges.subscribe((status) => {
      if (status === 'VALID') {
        this.fetchCaptchaToken();
      } else {
        this.captchaToken.set(null);
      }
    });
  }

  ngAfterViewInit(): void {
    // Chart will be created when results are available
  }

  /**
   * Fetch Google reCAPTCHA v3 token programmatically
   */
  private fetchCaptchaToken(): void {
    if (!this.isBrowser()) {
      return;
    }
    const win = this.getWindow();
    const grecaptcha = win ? (win as any).grecaptcha : null;
    if (!grecaptcha) {
      console.warn('reCAPTCHA not loaded yet');
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(this.captchaSiteKey, { action: 'attendance_query' })
        .then((token: string) => {
          this.captchaToken.set(token);
        })
        .catch((error: any) => {
          console.error('Error executing reCAPTCHA v3:', error);
          this.captchaToken.set(null);
        });
    });
  }

  /**
   * Load Google reCAPTCHA v3 script dynamically
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
      this.captchaReady.set(true);
      if (this.queryForm.valid) {
        this.fetchCaptchaToken();
      }
      return;
    }

    const script = this.document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = `https://www.google.com/recaptcha/api.js?render=${this.captchaSiteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      this.captchaReady.set(true);
      if (this.queryForm.valid) {
        this.fetchCaptchaToken();
      }
    };

    this.document.head.appendChild(script);
  }

  /**
   * Reset CAPTCHA token and fetch a new one if needed
   */
  private resetCaptcha(): void {
    this.captchaToken.set(null);
    if (this.isBrowser() && this.queryForm.valid) {
      this.fetchCaptchaToken();
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
   * Get status class for today's attendance glow card
   * @param status - Attendance status
   * @returns string
   */
  getTodayStatusGlowClass(status: string): string {
    const classes: Record<string, string> = {
      PRESENTE: 'status-presente',
      TARDANZA: 'status-tardanza',
      FALTA: 'status-falta',
      CON_PERMISO: 'status-permiso',
      FERIADO: 'status-feriado',
    };
    return classes[status] || 'status-feriado';
  }

  /**
   * Get icon class for today's attendance status
   * @param status - Attendance status
   * @returns string
   */
  getTodayStatusIconClass(status: string): string {
    const icons: Record<string, string> = {
      PRESENTE: 'bi bi-check-circle-fill',
      TARDANZA: 'bi bi-clock-fill',
      FALTA: 'bi bi-x-circle-fill',
      CON_PERMISO: 'bi bi-file-earmark-text-fill',
      FERIADO: 'bi bi-calendar-event-fill',
    };
    return icons[status] || 'bi bi-calendar-event-fill';
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
              'rgba(22, 163, 74, 0.8)', // Success green (#16a34a)
              'rgba(217, 119, 6, 0.8)', // Warning orange (#d97706)
              'rgba(220, 38, 38, 0.8)', // Danger red (#dc2626)
              'rgba(74, 158, 224, 0.8)', // Info secondary/blue (#4a9ee0)
            ],
            borderColor: [
              'rgb(22, 163, 74)',
              'rgb(217, 119, 6)',
              'rgb(220, 38, 38)',
              'rgb(74, 158, 224)',
            ],
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
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
              family: "'Inter', 'Barlow', sans-serif",
              size: 15,
              weight: 'bold',
            },
            color: '#001f3f',
          },
          tooltip: {
            backgroundColor: '#001f3f',
            titleFont: {
              family: "'Inter', 'Barlow', sans-serif",
              weight: 'bold',
            },
            bodyFont: {
              family: "'Inter', 'Barlow', sans-serif",
            },
            padding: 10,
            cornerRadius: 8,
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
            grid: {
              color: 'rgba(226, 232, 240, 0.6)',
            },
            ticks: {
              stepSize: 1,
              precision: 0,
              font: {
                family: "'Inter', 'Barlow', sans-serif",
                size: 11,
              },
              color: '#475569',
            },
            title: {
              display: true,
              text: 'Número de Días',
              font: {
                family: "'Inter', 'Barlow', sans-serif",
                size: 12,
                weight: 'bold',
              },
              color: '#001f3f',
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: "'Inter', 'Barlow', sans-serif",
                size: 11,
                weight: 'bold',
              },
              color: '#475569',
            },
            title: {
              display: true,
              text: 'Estado de Asistencia',
              font: {
                family: "'Inter', 'Barlow', sans-serif",
                size: 12,
                weight: 'bold',
              },
              color: '#001f3f',
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
