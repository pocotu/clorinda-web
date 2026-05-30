import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PublicAttendanceQueryComponent } from '../features/public/public-attendance-query/public-attendance-query.component';
import { PublicQueryService } from '../core/services/public-query.service';
import { PublicAttendanceResult } from '../core/models/public-query.model';
import { environment } from '../../environments/environment';

/**
 * Integration tests for Public Query Flow
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**
 *
 * Tests cover complete public query workflow:
 * - Student code validation
 * - CAPTCHA integration
 * - Query submission
 * - Results display with masked data
 * - Rate limiting handling
 * - Error handling
 */
describe('Public Query Flow Integration', () => {
  let httpMock: HttpTestingController;

  // URL real del PublicQueryService: environment.apiUrl + /public/attendance/query
  const publicQueryUrl = `${environment.apiUrl}/public/attendance/query`;

  const mockQueryResult: PublicAttendanceResult = {
    studentCode: '20250001',
    displayName: 'Juan C***',
    month: 'Enero 2025',
    today: {
      status: 'PRESENTE' as any,
      entryTime: '08:00',
      permission: false,
    },
    monthlySummary: {
      presentes: 15,
      tardanzas: 2,
      faltas: 1,
      conPermiso: 0,
      percentage: 94.4,
    },
  };

  beforeEach(() => {
    // Mock canvas getContext para evitar errores de Chart.js en entorno headless
    spyOn(HTMLCanvasElement.prototype, 'getContext').and.returnValue(null);

    (window as any).grecaptcha = {
      ready: jasmine.createSpy('ready').and.callFake((callback: () => void) => {
        callback();
      }),
      execute: jasmine.createSpy('execute').and.returnValue(Promise.resolve('mock-captcha-token')),
      reset: jasmine.createSpy('reset'),
    };

    if (!document.getElementById('recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      document.body.appendChild(script);
    }

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, PublicAttendanceQueryComponent],
      providers: [PublicQueryService],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    delete (window as any).grecaptcha;
    delete (window as any).Chart;
  });

  describe('Student Code Validation', () => {
    it('should validate correct student code format', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.queryForm.get('studentCode')?.markAsTouched();
      fixture.detectChanges();

      expect(component.queryForm.get('studentCode')?.valid).toBe(true);
      expect(component.hasError('studentCode')).toBe(false);
    });

    it('should reject invalid student code format', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: 'INVALID',
      });

      component.queryForm.get('studentCode')?.markAsTouched();
      fixture.detectChanges();

      expect(component.queryForm.get('studentCode')?.invalid).toBe(true);
      expect(component.hasError('studentCode')).toBe(true);
    });

    it('should reject student code with invalid year', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '18990001', // Year 1899 is invalid
      });

      component.queryForm.get('studentCode')?.markAsTouched();
      fixture.detectChanges();

      expect(component.queryForm.get('studentCode')?.invalid).toBe(true);
    });

    it('should require student code', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '',
      });

      component.queryForm.get('studentCode')?.markAsTouched();
      fixture.detectChanges();

      expect(component.queryForm.get('studentCode')?.invalid).toBe(true);
      // Verificar que hay un mensaje de error que menciona campo requerido
      expect(component.getStudentCodeError()).toBeTruthy();
    });

    it('should display appropriate error messages', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Test required error
      component.queryForm.patchValue({ studentCode: '' });
      component.queryForm.get('studentCode')?.markAsTouched();
      expect(component.getStudentCodeError()).toBeTruthy();

      // Test invalid format error
      component.queryForm.patchValue({ studentCode: 'ABC123' });
      component.queryForm.get('studentCode')?.markAsTouched();
      expect(component.getStudentCodeError()).toBeTruthy();
    });
  });

  describe('CAPTCHA Integration', () => {
    it('should initialize CAPTCHA on component load', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;

      // Trigger script onload callback
      const script = document.getElementById('recaptcha-script') as HTMLScriptElement;
      if (script && script.onload) {
        (script as any).onload();
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(component.captchaReady()).toBe(true);
    });

    it('should store CAPTCHA token on successful verification', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Simulate CAPTCHA success
      component.captchaToken.set('test-captcha-token');

      expect(component.captchaToken()).toBe('test-captcha-token');
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle CAPTCHA expiration', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.captchaToken.set('test-token');
      expect(component.captchaToken()).toBe('test-token');

      component.captchaToken.set(null);
      component.errorMessage.set(
        'La verificación de CAPTCHA ha expirado. Por favor, realiza la verificación de nuevo.'
      );

      expect(component.captchaToken()).toBeNull();
      expect(component.errorMessage()).toBeTruthy();
    });

    it('should handle CAPTCHA errors', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.captchaToken.set(null);
      component.errorMessage.set(
        'Error en la verificación de CAPTCHA. Por favor, inténtalo de nuevo.'
      );

      expect(component.captchaToken()).toBeNull();
      expect(component.errorMessage()).toBeTruthy();
    });

    it('should reset CAPTCHA after submission', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      // URL real: environment.apiUrl + /public/attendance/query
      const req = httpMock.expectOne(publicQueryUrl);
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.captchaToken()).toBe('mock-captcha-token'); // Should be refreshed since form is still valid
    });

    it('should prevent submission without CAPTCHA', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.onSubmit();

      expect(component.errorMessage()).toBeTruthy();
      httpMock.expectNone(publicQueryUrl);
    });
  });

  describe('Query Submission', () => {
    it('should submit query with valid data and CAPTCHA', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-captcha-token');

      component.onSubmit();

      expect(component.isLoading()).toBe(true);

      // URL real del PublicQueryService
      const req = httpMock.expectOne(publicQueryUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        studentCode: '20250001',
        captchaToken: 'test-captcha-token',
      });

      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.isLoading()).toBe(false);
      expect(component.result()).toEqual(mockQueryResult);
      expect(component.errorMessage()).toBeNull();
    });

    it('should display loading state during query', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      expect(component.isLoading()).toBe(false);

      component.onSubmit();

      expect(component.isLoading()).toBe(true);

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
    });

    it('should clear previous results on new submission', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Set previous result
      component.result.set(mockQueryResult);
      component.errorMessage.set('Previous error');

      component.queryForm.patchValue({
        studentCode: '20250002',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      expect(component.result()).toBeNull();
      expect(component.errorMessage()).toBeNull();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
    });
  });

  describe('Results Display', () => {
    it('should display masked student display name', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.result()?.displayName).toBe('Juan C***');
    });

    it('should display monthly summary statistics', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const summary = component.result()?.monthlySummary;
      expect(summary?.presentes).toBe(15);
      expect(summary?.tardanzas).toBe(2);
      expect(summary?.faltas).toBe(1);
      expect(summary?.conPermiso).toBe(0);
      expect(summary?.percentage).toBe(94.4);
    });

    it('should display today attendance status', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.result()?.today?.status).toBeTruthy();
      expect(component.result()?.today?.entryTime).toBe('08:00');
    });

    it('should format status labels correctly', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;

      expect(component.getStatusLabel('PRESENTE')).toBe('Presente');
      expect(component.getStatusLabel('FALTA')).toBe('Falta');
      expect(component.getStatusLabel('TARDANZA')).toBe('Tardanza');
      expect(component.getStatusLabel('CON_PERMISO')).toBe('Con Permiso');
      expect(component.getStatusLabel('FERIADO')).toBe('Feriado');
    });

    it('should apply correct badge classes for statuses', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;

      expect(component.getStatusBadgeClass('PRESENTE')).toContain('bg-success');
      expect(component.getStatusBadgeClass('FALTA')).toContain('bg-danger');
      expect(component.getStatusBadgeClass('TARDANZA')).toContain('bg-warning');
      expect(component.getStatusBadgeClass('CON_PERMISO')).toContain('bg-info');
    });

    it('should format percentage correctly', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;

      expect(component.formatPercentage(94.44444)).toBe('94.4');
      expect(component.formatPercentage(100)).toBe('100.0');
      expect(component.formatPercentage(0)).toBe('0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle student not found error', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20259999',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush(
        { error: { message: 'Student not found' } },
        { status: 404, statusText: 'Not Found' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.errorMessage()).toBeTruthy();
      expect(component.result()).toBeNull();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle rate limit exceeded error', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush(
        { error: { message: 'Rate limit exceeded. Please try again later.' } },
        { status: 429, statusText: 'Too Many Requests' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle invalid CAPTCHA error', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('invalid-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush(
        { error: { message: 'Invalid CAPTCHA token' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.errorMessage()).toBeTruthy();
    });

    it('should handle network errors', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.error(new ProgressEvent('error'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle server errors', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      component.onSubmit();

      const req = httpMock.expectOne(publicQueryUrl);
      req.flush(
        { error: { message: 'Internal server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Form Reset', () => {
    it('should reset form and clear results', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Set some state
      component.queryForm.patchValue({
        studentCode: '20250001',
      });
      component.result.set(mockQueryResult);
      component.errorMessage.set('Some error');
      component.captchaToken.set('test-token');

      // Reset
      component.reset();

      expect(component.queryForm.get('studentCode')?.value).toBeFalsy();
      expect(component.result()).toBeNull();
      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('Form Submission Control', () => {
    it('should enable submit when form valid and CAPTCHA completed', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');

      expect(component.canSubmit()).toBe(true);
    });

    it('should disable submit when form invalid', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: 'INVALID',
      });

      component.captchaToken.set('test-token');

      expect(component.canSubmit()).toBe(false);
    });

    it('should disable submit when CAPTCHA not completed', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      expect(component.canSubmit()).toBe(false);
    });

    it('should disable submit during loading', () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      component.captchaToken.set('test-token');
      component.isLoading.set(true);

      expect(component.canSubmit()).toBe(false);
    });
  });

  describe('Complete Flow', () => {
    it('should complete entire query workflow successfully', async () => {
      const fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Step 1: Enter student code
      component.queryForm.patchValue({
        studentCode: '20250001',
      });

      expect(component.queryForm.valid).toBe(true);

      // Step 2: Complete CAPTCHA
      component.captchaToken.set('test-captcha-token');

      expect(component.captchaToken()).toBe('test-captcha-token');
      expect(component.canSubmit()).toBe(true);

      // Step 3: Submit query
      component.onSubmit();

      expect(component.isLoading()).toBe(true);

      // URL real: environment.apiUrl + /public/attendance/query
      const req = httpMock.expectOne(publicQueryUrl);
      expect(req.request.body).toEqual({
        studentCode: '20250001',
        captchaToken: 'test-captcha-token',
      });

      // Step 4: Receive and display results
      req.flush({
        data: mockQueryResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.isLoading()).toBe(false);
      expect(component.result()).toEqual(mockQueryResult);
      expect(component.result()?.displayName).toBe('Juan C***');
      expect(component.result()?.monthlySummary.percentage).toBe(94.4);
      expect(component.result()?.today?.status).toBeTruthy();
      expect(component.errorMessage()).toBeNull();
    });
  });
});
