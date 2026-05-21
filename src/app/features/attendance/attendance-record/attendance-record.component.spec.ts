import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AttendanceRecordComponent } from './attendance-record.component';
import { AttendanceService } from '../../../core/services/attendance.service';
import {
  AttendanceStatus,
  SessionStatus,
  AttendanceRecord,
} from '../../../core/models/attendance.model';

describe('AttendanceRecordComponent', () => {
  let component: AttendanceRecordComponent;
  let fixture: ComponentFixture<AttendanceRecordComponent>;
  let mockAttendanceService: jasmine.SpyObj<AttendanceService>;

  const mockRecord: AttendanceRecord = {
    id: 'record-1',
    sessionId: 'session-1',
    studentId: 'student-1',
    status: AttendanceStatus.PRESENTE,
    entryTime: '08:00',
    permissionNote: undefined,
    observation: 'Test observation',
    updatedByUserId: 'user-1',
    updatedAt: '2024-01-15T08:00:00Z',
    createdAt: '2024-01-15T08:00:00Z',
  };

  beforeEach(async () => {
    mockAttendanceService = jasmine.createSpyObj('AttendanceService', ['updateRecord']);

    await TestBed.configureTestingModule({
      imports: [AttendanceRecordComponent, ReactiveFormsModule],
      providers: [{ provide: AttendanceService, useValue: mockAttendanceService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceRecordComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.sessionId = 'session-1';
    component.studentId = 'student-1';
    component.studentName = 'Juan Pérez García';
    component.sessionDate = new Date().toISOString().split('T')[0];
    component.sessionStatus = SessionStatus.OPEN;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values when no currentRecord', () => {
      fixture.detectChanges();

      expect(component.recordForm.get('status')?.value).toBe(AttendanceStatus.FALTA);
      expect(component.recordForm.get('entryTime')?.value).toBe('');
      expect(component.recordForm.get('permissionNote')?.value).toBe('');
      expect(component.recordForm.get('observation')?.value).toBe('');
    });

    it('should initialize form with currentRecord values', () => {
      component.currentRecord = mockRecord;
      fixture.detectChanges();

      expect(component.recordForm.get('status')?.value).toBe(AttendanceStatus.PRESENTE);
      expect(component.recordForm.get('entryTime')?.value).toBe('08:00');
      expect(component.recordForm.get('observation')?.value).toBe('Test observation');
    });

    it('should disable form when canEdit is false', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      component.sessionDate = '2024-01-01'; // Old date, outside justification window
      fixture.detectChanges();

      expect(component.recordForm.disabled).toBe(true);
    });
  });

  describe('Conditional Field Visibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show entry time field for PRESENTE status', () => {
      component.recordForm.patchValue({ status: AttendanceStatus.PRESENTE });
      expect(component.shouldShowEntryTime()).toBe(true);
    });

    it('should show entry time field for TARDANZA status', () => {
      component.recordForm.patchValue({ status: AttendanceStatus.TARDANZA });
      expect(component.shouldShowEntryTime()).toBe(true);
    });

    it('should not show entry time field for FALTA status', () => {
      component.recordForm.patchValue({ status: AttendanceStatus.FALTA });
      expect(component.shouldShowEntryTime()).toBe(false);
    });

    it('should show permission note field for CON_PERMISO status', () => {
      component.recordForm.patchValue({ status: AttendanceStatus.CON_PERMISO });
      expect(component.shouldShowPermissionNote()).toBe(true);
    });

    it('should not show permission note field for PRESENTE status', () => {
      component.recordForm.patchValue({ status: AttendanceStatus.PRESENTE });
      expect(component.shouldShowPermissionNote()).toBe(false);
    });
  });

  describe('Edit Permissions', () => {
    it('should allow editing when session is OPEN', () => {
      component.sessionStatus = SessionStatus.OPEN;
      fixture.detectChanges();

      expect(component.canEdit).toBe(true);
      expect(component.showReasonField).toBe(false);
    });

    it('should allow editing within justification window (48h)', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      component.sessionDate = yesterday.toISOString().split('T')[0];
      fixture.detectChanges();
      component['checkEditPermissions']();

      expect(component.canEdit).toBe(true);
      expect(component.showReasonField).toBe(true);
      expect(component.isWithinJustificationWindow).toBe(true);
    });

    it('should not allow editing outside justification window', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      component.sessionDate = threeDaysAgo.toISOString().split('T')[0];
      fixture.detectChanges();

      expect(component.canEdit).toBe(false);
      expect(component.showReasonField).toBe(false);
      expect(component.isWithinJustificationWindow).toBe(false);
    });

    it('should require reason field for post-closure edits', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      component.sessionDate = yesterday.toISOString().split('T')[0];
      fixture.detectChanges();

      const reasonControl = component.recordForm.get('reason');
      expect(reasonControl?.hasValidator(Validators.required)).toBe(true);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      component.currentRecord = mockRecord;
      fixture.detectChanges();
    });

    it('should validate entry time format', () => {
      component.recordForm.patchValue({
        status: AttendanceStatus.PRESENTE,
        entryTime: 'invalid',
      });

      const entryTimeControl = component.recordForm.get('entryTime');
      expect(entryTimeControl?.hasError('pattern')).toBe(true);
    });

    it('should accept valid entry time format', () => {
      component.recordForm.patchValue({
        status: AttendanceStatus.PRESENTE,
        entryTime: '08:30',
      });

      const entryTimeControl = component.recordForm.get('entryTime');
      expect(entryTimeControl?.valid).toBe(true);
    });

    it('should validate permission note max length (200)', () => {
      const longNote = 'a'.repeat(201);
      component.recordForm.patchValue({
        status: AttendanceStatus.CON_PERMISO,
        permissionNote: longNote,
      });

      const permissionNoteControl = component.recordForm.get('permissionNote');
      expect(permissionNoteControl?.hasError('maxlength')).toBe(true);
    });

    it('should validate observation max length (500)', () => {
      const longObservation = 'a'.repeat(501);
      component.recordForm.patchValue({
        observation: longObservation,
      });

      const observationControl = component.recordForm.get('observation');
      expect(observationControl?.hasError('maxlength')).toBe(true);
    });
  });

  describe('Save Record', () => {
    beforeEach(() => {
      component.currentRecord = mockRecord;
      fixture.detectChanges();
    });

    it('should save record successfully', (done) => {
      const updatedRecord = { ...mockRecord, status: AttendanceStatus.TARDANZA };
      mockAttendanceService.updateRecord.and.returnValue(of({ data: updatedRecord }));

      component.recordForm.patchValue({ status: AttendanceStatus.TARDANZA });

      component.recordUpdated.subscribe((record) => {
        expect(record).toEqual(updatedRecord);
        done();
      });

      component.saveRecord();

      expect(mockAttendanceService.updateRecord).toHaveBeenCalled();
      expect(component.successMessage).toBeTruthy();
    });

    it('should handle save error', () => {
      const error = {
        error: {
          error: {
            code: 'ATTENDANCE_SESSION_CLOSED',
            message: 'Session is closed',
          },
        },
      };
      mockAttendanceService.updateRecord.and.returnValue(throwError(() => error));

      component.saveRecord();

      expect(component.error).toBeTruthy();
      expect(component.loading).toBe(false);
    });

    it('should not save if form is invalid', () => {
      component.recordForm.patchValue({ status: '' });
      component.saveRecord();

      expect(mockAttendanceService.updateRecord).not.toHaveBeenCalled();
      expect(component.error).toBeTruthy();
    });

    it('should not save if currentRecord is undefined', () => {
      component.currentRecord = undefined;
      component.saveRecord();

      expect(mockAttendanceService.updateRecord).not.toHaveBeenCalled();
      expect(component.error).toBe('No se puede actualizar un registro que no existe');
    });

    it('should include reason in payload for post-closure edits', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      component.sessionDate = yesterday.toISOString().split('T')[0];
      fixture.detectChanges();
      component['checkEditPermissions']();

      component.recordForm.patchValue({
        status: AttendanceStatus.PRESENTE,
        reason: 'Error en registro inicial',
      });

      mockAttendanceService.updateRecord.and.returnValue(of({ data: mockRecord }));
      component.saveRecord();

      const callArgs = mockAttendanceService.updateRecord.calls.mostRecent().args;
      expect(callArgs[1]).toEqual(
        jasmine.objectContaining({
          reason: 'Error en registro inicial',
        })
      );
    });
  });

  describe('Error Messages', () => {
    beforeEach(() => {
      component.currentRecord = mockRecord;
      fixture.detectChanges();
    });

    it('should display user-friendly error for ATTENDANCE_SESSION_CLOSED', () => {
      const error = {
        error: {
          error: {
            code: 'ATTENDANCE_SESSION_CLOSED',
            message: 'Session closed',
          },
        },
      };
      mockAttendanceService.updateRecord.and.returnValue(throwError(() => error));

      component.saveRecord();

      expect(component.error).toBe('La sesión está cerrada y no se puede editar');
    });

    it('should display user-friendly error for ATTENDANCE_EDIT_WINDOW_EXPIRED', () => {
      const error = {
        error: {
          error: {
            code: 'ATTENDANCE_EDIT_WINDOW_EXPIRED',
            message: 'Window expired',
          },
        },
      };
      mockAttendanceService.updateRecord.and.returnValue(throwError(() => error));

      component.saveRecord();

      expect(component.error).toContain('período de justificación (48 horas) ha expirado');
    });

    it('should display user-friendly error for ATTENDANCE_REASON_REQUIRED', () => {
      const error = {
        error: {
          error: {
            code: 'ATTENDANCE_REASON_REQUIRED',
            message: 'Reason required',
          },
        },
      };
      mockAttendanceService.updateRecord.and.returnValue(throwError(() => error));

      component.saveRecord();

      expect(component.error).toContain('Debe proporcionar un motivo');
    });
  });

  describe('Reset Form', () => {
    it('should reset form to initial values', () => {
      component.currentRecord = mockRecord;
      fixture.detectChanges();

      component.recordForm.patchValue({
        status: AttendanceStatus.FALTA,
        observation: 'Changed',
      });

      component.resetForm();

      expect(component.recordForm.get('status')?.value).toBe(AttendanceStatus.PRESENTE);
      expect(component.recordForm.get('observation')?.value).toBe('Test observation');
      expect(component.error).toBeNull();
      expect(component.successMessage).toBeNull();
    });
  });

  describe('Warning Messages', () => {
    it('should return empty string when session is open', () => {
      component.sessionStatus = SessionStatus.OPEN;
      fixture.detectChanges();

      expect(component.getWarningMessage()).toBe('');
    });

    it('should return warning for closed session within justification window', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      component.sessionDate = yesterday.toISOString().split('T')[0];
      fixture.detectChanges();

      const message = component.getWarningMessage();
      expect(message).toContain('período de justificación');
      expect(message).toContain('48 horas');
    });

    it('should return warning for closed session outside justification window', () => {
      component.sessionStatus = SessionStatus.CLOSED;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      component.sessionDate = threeDaysAgo.toISOString().split('T')[0];
      fixture.detectChanges();

      const message = component.getWarningMessage();
      expect(message).toContain('período de justificación ha expirado');
    });
  });
});
