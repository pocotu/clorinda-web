import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AttendanceSessionComponent } from './attendance-session.component';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { Shift, AttendanceStatus, SessionStatus } from '../../../core/models/attendance.model';

describe('AttendanceSessionComponent', () => {
  let component: AttendanceSessionComponent;
  let fixture: ComponentFixture<AttendanceSessionComponent>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockSession = {
    id: '1',
    sessionDate: '2026-05-06',
    shift: Shift.MANANA,
    grade: 1,
    section: 'A',
    status: SessionStatus.OPEN,
    openedByUserId: 'user1',
    openedAt: '2026-05-06T08:00:00Z',
    createdAt: '2026-05-06T08:00:00Z',
    updatedAt: '2026-05-06T08:00:00Z',
  };

  const mockStudent = {
    id: 'student1',
    studentCode: '20260001',
    firstName: 'Juan',
    lastName: 'Pérez',
    secondLastName: 'García',
    isActive: true,
  };

  const mockUser = {
    id: 'user1',
    username: 'auxiliar1',
    role: 'AUXILIAR',
  };

  beforeEach(async () => {
    const attendanceServiceSpy = jasmine.createSpyObj('AttendanceService', [
      'createSession',
      'getSessionWithRecords',
      'getStudentsBySection',
      'updateRecord',
      'closeSession',
    ]);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [AttendanceSessionComponent, HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        { provide: AttendanceService, useValue: attendanceServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    attendanceService = TestBed.inject(AttendanceService) as jasmine.SpyObj<AttendanceService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    (attendanceService as any)['http'] = {
      get: jasmine
        .createSpy('get')
        .and.returnValue(of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })),
    };
    (attendanceService as any)['apiUrl'] = 'http://localhost:3000/api/internal/attendance';
    fixture = TestBed.createComponent(AttendanceSessionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize forms on ngOnInit', () => {
    fixture.detectChanges();
    expect(component.sessionForm).toBeDefined();
    expect(component.closeSessionForm).toBeDefined();
  });

  it('should have valid session form with required fields', () => {
    fixture.detectChanges();
    const form = component.sessionForm;

    expect(form.get('sessionDate')).toBeDefined();
    expect(form.get('shift')).toBeDefined();
    expect(form.get('section')).toBeDefined();

    // Form should be invalid with default empty values for grade and section
    expect(form.invalid).toBeTruthy();
  });

  it('should validate section pattern', () => {
    fixture.detectChanges();
    const sectionControl = component.sessionForm.get('section');

    sectionControl?.setValue('a'); // lowercase should be invalid
    expect(sectionControl?.invalid).toBeTruthy();

    sectionControl?.setValue('A'); // uppercase should be valid
    expect(sectionControl?.valid).toBeTruthy();

    sectionControl?.setValue('1-A'); // with hyphen should be valid
    expect(sectionControl?.valid).toBeTruthy();
  });

  it('should create session successfully', () => {
    fixture.detectChanges();
    attendanceService.createSession.and.returnValue(of({ data: mockSession }));
    attendanceService.getStudentsBySection.and.returnValue(of({ data: [mockStudent] }));
    attendanceService.getSessionWithRecords.and.returnValue(
      of({ data: { ...mockSession, records: [] } })
    );

    component.sessionForm.patchValue({
      sessionDate: '2026-05-06',
      shift: Shift.MANANA,
      grade: 1,
      section: 'A',
    });

    component.openSession();

    expect(attendanceService.createSession).toHaveBeenCalled();
  });

  it('should handle session creation error', () => {
    fixture.detectChanges();
    const errorResponse = {
      error: { error: { message: 'Session already exists' } },
    };
    attendanceService.createSession.and.returnValue(throwError(() => errorResponse));

    component.sessionForm.patchValue({
      sessionDate: '2026-05-06',
      shift: Shift.MANANA,
      grade: 1,
      section: 'A',
    });

    component.openSession();

    expect(component.error).toBeTruthy();
    expect(component.loading).toBeFalsy();
  });

  it('should show entry time field for PRESENTE status', () => {
    expect(component.shouldShowEntryTime(AttendanceStatus.PRESENTE)).toBeTruthy();
    expect(component.shouldShowEntryTime(AttendanceStatus.TARDANZA)).toBeTruthy();
    expect(component.shouldShowEntryTime(AttendanceStatus.FALTA)).toBeFalsy();
  });

  it('should show permission note field for CON_PERMISO status', () => {
    expect(component.shouldShowPermissionNote(AttendanceStatus.CON_PERMISO)).toBeTruthy();
    expect(component.shouldShowPermissionNote(AttendanceStatus.PRESENTE)).toBeFalsy();
  });

  it('should validate close session form', () => {
    fixture.detectChanges();
    const form = component.closeSessionForm;

    expect(form.invalid).toBeTruthy(); // Should be invalid without reason

    form.patchValue({ reason: 'Fin de jornada' });
    expect(form.valid).toBeTruthy();
  });

  it('should close session successfully', () => {
    fixture.detectChanges();
    component.currentSession = mockSession;
    attendanceService.closeSession.and.returnValue(
      of({ data: { ...mockSession, status: SessionStatus.CLOSED } })
    );

    component.closeSessionForm.patchValue({ reason: 'Fin de jornada' });
    component.closeSession();

    expect(attendanceService.closeSession).toHaveBeenCalledWith(mockSession.id, {
      reason: 'Fin de jornada',
    });
  });

  it('should get student full name correctly', () => {
    const student = {
      ...mockStudent,
      middleName: 'Carlos',
      thirdLastName: 'López',
    };

    const fullName = component.getStudentFullName(student);
    expect(fullName).toContain('Juan');
    expect(fullName).toContain('Carlos');
    expect(fullName).toContain('Pérez');
    expect(fullName).toContain('García');
    expect(fullName).toContain('López');
  });

  it('should get shift label in Spanish', () => {
    expect(component.getShiftLabel(Shift.MANANA)).toBe('Mañana');
    expect(component.getShiftLabel(Shift.TARDE)).toBe('Tarde');
    expect(component.getShiftLabel(Shift.NOCHE)).toBe('Noche');
  });

  it('should get status label in Spanish', () => {
    expect(component.getStatusLabel(AttendanceStatus.PRESENTE)).toBe('Presente');
    expect(component.getStatusLabel(AttendanceStatus.FALTA)).toBe('Falta');
    expect(component.getStatusLabel(AttendanceStatus.TARDANZA)).toBe('Tardanza');
    expect(component.getStatusLabel(AttendanceStatus.CON_PERMISO)).toBe('Con Permiso');
    expect(component.getStatusLabel(AttendanceStatus.FERIADO)).toBe('Feriado');
  });

  it('should check if session is closed', () => {
    component.currentSession = mockSession;
    expect(component.isSessionClosed()).toBeFalsy();

    component.currentSession = { ...mockSession, status: SessionStatus.CLOSED };
    expect(component.isSessionClosed()).toBeTruthy();
  });

  it('should open and close modal', () => {
    expect(component.showCloseModal).toBeFalsy();

    fixture.detectChanges();
    component.openCloseModal();
    expect(component.showCloseModal).toBeTruthy();

    component.closeModal();
    expect(component.showCloseModal).toBeFalsy();
  });
});
