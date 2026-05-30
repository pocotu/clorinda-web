import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PublicAttendanceQueryComponent } from './public-attendance-query.component';
import { PublicQueryService } from '../../../core/services';

describe('PublicAttendanceQueryComponent', () => {
  let component: PublicAttendanceQueryComponent;
  let fixture: ComponentFixture<PublicAttendanceQueryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicAttendanceQueryComponent, ReactiveFormsModule, HttpClientTestingModule],
      providers: [PublicQueryService],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicAttendanceQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with student code field', () => {
    expect(component.queryForm.get('studentCode')).toBeTruthy();
  });

  it('should validate student code format', () => {
    const studentCodeControl = component.queryForm.get('studentCode');

    // Invalid format
    studentCodeControl?.setValue('12345678');
    expect(studentCodeControl?.hasError('invalidStudentCode')).toBe(true);

    // Valid format
    studentCodeControl?.setValue('20240001');
    expect(studentCodeControl?.hasError('invalidStudentCode')).toBe(false);
  });

  it('should require student code', () => {
    const studentCodeControl = component.queryForm.get('studentCode');

    studentCodeControl?.setValue('');
    expect(studentCodeControl?.hasError('required')).toBe(true);
  });

  it('should disable submit button when form is invalid', () => {
    component.queryForm.get('studentCode')?.setValue('');
    expect(component.canSubmit()).toBe(false);
  });

  it('should disable submit button when CAPTCHA is not completed', () => {
    component.queryForm.get('studentCode')?.setValue('20240001');
    component.captchaToken.set(null);
    expect(component.canSubmit()).toBe(false);
  });

  it('should enable submit button when form is valid and CAPTCHA is completed', () => {
    component.queryForm.get('studentCode')?.setValue('20240001');
    component.captchaToken.set('test-token');
    expect(component.canSubmit()).toBe(true);
  });

  it('should get correct status label', () => {
    expect(component.getStatusLabel('PRESENTE')).toBe('Presente');
    expect(component.getStatusLabel('FALTA')).toBe('Falta');
    expect(component.getStatusLabel('TARDANZA')).toBe('Tardanza');
    expect(component.getStatusLabel('CON_PERMISO')).toBe('Con Permiso');
    expect(component.getStatusLabel('FERIADO')).toBe('Feriado');
  });

  it('should get correct status badge class', () => {
    expect(component.getStatusBadgeClass('PRESENTE')).toBe('badge bg-success');
    expect(component.getStatusBadgeClass('FALTA')).toBe('badge bg-danger');
    expect(component.getStatusBadgeClass('TARDANZA')).toBe('badge bg-warning text-dark');
    expect(component.getStatusBadgeClass('CON_PERMISO')).toBe('badge bg-info');
    expect(component.getStatusBadgeClass('FERIADO')).toBe('badge bg-secondary');
  });

  it('should format percentage correctly', () => {
    expect(component.formatPercentage(85.5)).toBe('85.5');
    expect(component.formatPercentage(100)).toBe('100.0');
    expect(component.formatPercentage(75.123)).toBe('75.1');
  });

  it('should get correct today status glow class', () => {
    expect(component.getTodayStatusGlowClass('PRESENTE')).toBe('status-presente');
    expect(component.getTodayStatusGlowClass('TARDANZA')).toBe('status-tardanza');
    expect(component.getTodayStatusGlowClass('FALTA')).toBe('status-falta');
    expect(component.getTodayStatusGlowClass('CON_PERMISO')).toBe('status-permiso');
    expect(component.getTodayStatusGlowClass('FERIADO')).toBe('status-feriado');
    expect(component.getTodayStatusGlowClass('UNKNOWN')).toBe('status-feriado');
  });

  it('should get correct today status icon class', () => {
    expect(component.getTodayStatusIconClass('PRESENTE')).toBe('bi bi-check-circle-fill');
    expect(component.getTodayStatusIconClass('TARDANZA')).toBe('bi bi-clock-fill');
    expect(component.getTodayStatusIconClass('FALTA')).toBe('bi bi-x-circle-fill');
    expect(component.getTodayStatusIconClass('CON_PERMISO')).toBe('bi bi-file-earmark-text-fill');
    expect(component.getTodayStatusIconClass('FERIADO')).toBe('bi bi-calendar-event-fill');
    expect(component.getTodayStatusIconClass('UNKNOWN')).toBe('bi bi-calendar-event-fill');
  });
  it('should reset form and results', () => {
    component.queryForm.get('studentCode')?.setValue('20240001');
    component.result.set({
      studentCode: '20240001',
      displayName: 'Juan P. ***',
      month: 'Mayo 2026',
      today: {
        status: 'PRESENTE' as any,
        entryTime: '08:00',
        permission: false,
      },
      monthlySummary: {
        presentes: 20,
        tardanzas: 2,
        faltas: 1,
        conPermiso: 0,
        percentage: 95.6,
      },
    });

    component.reset();

    expect(component.queryForm.get('studentCode')?.value).toBeNull();
    expect(component.result()).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });
});
