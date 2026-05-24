import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AttendanceSessionComponent } from '../features/attendance/attendance-session/attendance-session.component';
import { AttendanceService } from '../core/services/attendance.service';
import { AuthService } from '../core/services/auth.service';
import {
  AttendanceSession,
  AttendanceRecord,
  Student,
  Shift,
  SessionStatus,
  AttendanceStatus,
} from '../core/models/attendance.model';
import { User } from '../core/models/auth.model';
import { environment } from '../../environments/environment';

/**
 * Integration tests for Attendance Flow
 * **Validates: Requirements 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1**
 *
 * Tests cover complete attendance workflow:
 * - Create attendance session
 * - Load students for section
 * - Mark attendance for students
 * - Update attendance records (status, entry time, permission notes, observations)
 * - Close session with reason
 * - Auto-save functionality
 */
describe('Attendance Flow Integration', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;

  // URLs reales del AttendanceService
  const attendanceBaseUrl = `${environment.apiUrl}/internal/attendance`;
  const studentsBaseUrl = `${environment.apiUrl}/internal/students`;

  const mockAuxiliarUser: User = {
    id: 'aux-123',
    username: 'auxiliar1',
    role: 'AUXILIAR',
  };

  const mockSession: AttendanceSession = {
    id: 'session-123',
    sessionDate: '2025-01-15',
    shift: Shift.MANANA,
    grade: 1,
    section: 'A-1',
    status: SessionStatus.OPEN,
    openedByUserId: 'aux-123',
    openedAt: '2025-01-15T08:00:00Z',
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-01-15T08:00:00Z',
  };

  const mockStudents: Student[] = [
    {
      id: 'student-1',
      studentCode: '20250001',
      dni: '12345678',
      firstName: 'Juan',
      middleName: 'Carlos',
      lastName: 'Perez',
      secondLastName: 'Garcia',
      thirdLastName: undefined,
      isActive: true,
    },
    {
      id: 'student-2',
      studentCode: '20250002',
      dni: '87654321',
      firstName: 'Maria',
      middleName: undefined,
      lastName: 'Lopez',
      secondLastName: 'Martinez',
      thirdLastName: undefined,
      isActive: true,
    },
  ];

  const mockRecords: AttendanceRecord[] = [
    {
      id: 'record-1',
      sessionId: 'session-123',
      studentId: 'student-1',
      status: AttendanceStatus.PRESENTE,
      entryTime: '08:00',
      permissionNote: undefined,
      observation: undefined,
      updatedByUserId: 'aux-123',
      createdAt: '2025-01-15T08:05:00Z',
      updatedAt: '2025-01-15T08:05:00Z',
    },
  ];

  beforeEach(() => {
    sessionStorage.clear();

    // Setup authenticated user
    const validPayload = {
      sub: mockAuxiliarUser.id,
      username: mockAuxiliarUser.username,
      role: mockAuxiliarUser.role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;
    sessionStorage.setItem('access_token', validToken);
    sessionStorage.setItem('current_user', JSON.stringify(mockAuxiliarUser));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, AttendanceSessionComponent],
      providers: [AttendanceService, AuthService],
    });

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Create Session Flow', () => {
    it('should create attendance session successfully', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      // Fill session form
      component.sessionForm.patchValue({
        sessionDate: '2025-01-15',
        shift: Shift.MANANA,
        grade: 1,
        section: 'A-1',
      });

      expect(component.sessionForm.valid).toBe(true);

      // Open session
      component.openSession();
      expect(component.loading).toBe(true);

      // Mock create session response — POST /api/internal/attendance/sessions
      const createReq = httpMock.expectOne(`${attendanceBaseUrl}/sessions`);
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body).toEqual({
        sessionDate: '2025-01-15',
        shift: Shift.MANANA,
        grade: 1,
        section: 'A-1',
      });

      createReq.flush({
        data: mockSession,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      // Mock get students response — GET /api/internal/students?section=A-1&schoolYear={currentYear}
      // El componente usa new Date().getFullYear() para el schoolYear
      const currentYear = new Date().getFullYear();
      const studentsReq = httpMock.expectOne(
        `${studentsBaseUrl}?section=A-1&schoolYear=${currentYear}`
      );
      studentsReq.flush({
        data: mockStudents,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      // Mock get session with records — GET /api/internal/attendance/sessions/{id}
      const sessionReq = httpMock.expectOne(`${attendanceBaseUrl}/sessions/${mockSession.id}`);
      sessionReq.flush({
        data: {
          ...mockSession,
          records: [],
        },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.currentSession).toEqual(mockSession);
      expect(component.studentsWithRecords.length).toBe(2);
      expect(component.loading).toBe(false);
    });

    it('should handle duplicate session error', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      // Patch all required fields including grade so the form is valid.
      // The section 'A-1' contains '1', so the component can also derive grade=1 from it.
      component.sessionForm.patchValue({
        sessionDate: '2025-01-15',
        shift: Shift.MANANA,
        grade: 1,
        section: 'A-1',
      });

      component.openSession();

      // Flush the 409 — component will then call getSessions to try to load the existing session.
      const createReq = httpMock.expectOne(`${attendanceBaseUrl}/sessions`);
      createReq.flush(
        { error: { message: 'Session already exists for this date, shift, and section' } },
        { status: 409, statusText: 'Conflict' }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // After 409, the component calls getSessions. Respond with empty list so the error path fires.
      const sessionsReq = httpMock.expectOne(
        (r) => r.url.includes('/sessions') && r.method === 'GET'
      );
      sessionsReq.flush({ data: [] }, { status: 200, statusText: 'OK' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // The component should show an error because getSessions returned an empty list.
      expect(component.error).toBeTruthy();
      expect(component.currentSession).toBeNull();
      expect(component.loading).toBe(false);
    });

    it('should validate session form fields', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.openSession();

      expect(component.sessionForm.invalid).toBe(true);
      httpMock.expectNone(`${attendanceBaseUrl}/sessions`);
    });
  });

  describe('Mark Attendance Flow', () => {
    it('should mark student as present', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      // Setup session state
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: undefined }];

      // Mark as present
      component.onStatusChange(component.studentsWithRecords[0], AttendanceStatus.PRESENTE);

      // Wait for debounce (500ms) + buffer
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Flush the create record request (no existing record, so createRecord is called with recordId=undefined)
      const req = httpMock.expectOne(`${attendanceBaseUrl}/records`);
      req.flush({ data: mockRecords[0] });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // The save completed successfully. Status is 'saved' immediately after;
      // it resets to 'idle' after a 2-second timer which hasn't fired yet in this test window.
      expect(component.saveStatus.status).toBe('saved');
    });

    it('should update existing attendance record', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      // Setup session with existing record
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      // Change status to FALTA
      component.onStatusChange(component.studentsWithRecords[0], AttendanceStatus.FALTA);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 600));

      // PATCH /api/internal/attendance/records/{id}
      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.status).toBe(AttendanceStatus.FALTA);

      const updatedRecord = {
        ...mockRecords[0],
        status: AttendanceStatus.FALTA,
        entryTime: undefined,
      };

      req.flush({
        data: updatedRecord,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.saveStatus.status).toBe('saved');
      expect(component.studentsWithRecords[0].record?.status).toBe(AttendanceStatus.FALTA);
    });

    it('should update entry time for present student', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      component.onEntryTimeChange(component.studentsWithRecords[0], '08:15');

      await new Promise((resolve) => setTimeout(resolve, 600));

      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      expect(req.request.body.entryTime).toBe('08:15');

      req.flush({
        data: { ...mockRecords[0], entryTime: '08:15' },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.saveStatus.status).toBe('saved');
    });

    it('should update permission note for student with permission', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      const recordWithPermission = {
        ...mockRecords[0],
        status: AttendanceStatus.CON_PERMISO,
      };

      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: recordWithPermission }];

      component.onPermissionNoteChange(component.studentsWithRecords[0], 'Cita medica');

      await new Promise((resolve) => setTimeout(resolve, 600));

      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      expect(req.request.body.permissionNote).toBe('Cita medica');

      req.flush({
        data: { ...recordWithPermission, permissionNote: 'Cita medica' },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.saveStatus.status).toBe('saved');
    });

    it('should update observation for student', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      component.onObservationChange(
        component.studentsWithRecords[0],
        'Llego con uniforme incompleto'
      );

      await new Promise((resolve) => setTimeout(resolve, 600));

      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      expect(req.request.body.observation).toBe('Llego con uniforme incompleto');

      req.flush({
        data: { ...mockRecords[0], observation: 'Llego con uniforme incompleto' },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.saveStatus.status).toBe('saved');
    });

    it('should show error on save failure', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      component.onStatusChange(component.studentsWithRecords[0], AttendanceStatus.TARDANZA);

      await new Promise((resolve) => setTimeout(resolve, 600));

      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      req.flush(
        { error: { message: 'Database error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.saveStatus.status).toBe('error');
      // El mensaje debe contener algun texto de error (sin depender de caracteres especiales exactos)
      expect(component.saveStatus.message).toBeTruthy();
    });
  });

  describe('Close Session Flow', () => {
    it('should close session successfully', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;

      // Open close modal
      component.openCloseModal();
      expect(component.showCloseModal).toBe(true);

      // Fill close form — sin caracteres especiales
      component.closeSessionForm.patchValue({
        reason: 'Fin del turno manana',
      });

      expect(component.closeSessionForm.valid).toBe(true);

      // Close session
      component.closeSession();
      expect(component.loading).toBe(true);

      // POST /api/internal/attendance/sessions/{id}/close
      const req = httpMock.expectOne(`${attendanceBaseUrl}/sessions/${mockSession.id}/close`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        reason: 'Fin del turno manana',
      });

      const closedSession = {
        ...mockSession,
        status: SessionStatus.CLOSED,
      };

      req.flush({
        data: closedSession,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.currentSession?.status).toBe(SessionStatus.CLOSED);
      expect(component.showCloseModal).toBe(false);
      expect(component.loading).toBe(false);
    });

    it('should validate close reason is required', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.openCloseModal();

      component.closeSession();

      expect(component.closeSessionForm.invalid).toBe(true);
      httpMock.expectNone(`${attendanceBaseUrl}/sessions/${mockSession.id}/close`);
    });

    it('should handle close session error', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.openCloseModal();

      component.closeSessionForm.patchValue({
        reason: 'Fin del turno',
      });

      component.closeSession();

      const req = httpMock.expectOne(`${attendanceBaseUrl}/sessions/${mockSession.id}/close`);
      req.flush(
        { error: { message: 'Cannot close session with pending records' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // El componente debe mostrar algun error al cerrar sesion
      expect(component.error).toBeTruthy();
      expect(component.loading).toBe(false);
    });

    it('should prevent marking attendance on closed session', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      const closedSession = {
        ...mockSession,
        status: SessionStatus.CLOSED,
      };

      component.currentSession = closedSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      component.onStatusChange(component.studentsWithRecords[0], AttendanceStatus.FALTA);

      // Should not make any HTTP request
      httpMock.expectNone(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
    });
  });

  describe('Auto-save functionality', () => {
    it('should debounce multiple rapid changes', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      // Make multiple rapid changes
      component.onObservationChange(component.studentsWithRecords[0], 'First');
      await new Promise((resolve) => setTimeout(resolve, 100));
      component.onObservationChange(component.studentsWithRecords[0], 'Second');
      await new Promise((resolve) => setTimeout(resolve, 100));
      component.onObservationChange(component.studentsWithRecords[0], 'Third');

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should only make one request with the last value
      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      expect(req.request.body.observation).toBe('Third');

      req.flush({
        data: { ...mockRecords[0], observation: 'Third' },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
    });

    it('should show saving status during save', async () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const metaReq = httpMock.expectOne(`${studentsBaseUrl}/metadata`);
      metaReq.flush({
        data: { grades: [1, 2, 3], sections: ['A', 'B', 'C'] },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });
      component.currentSession = mockSession;
      component.studentsWithRecords = [{ student: mockStudents[0], record: mockRecords[0] }];

      component.onStatusChange(component.studentsWithRecords[0], AttendanceStatus.TARDANZA);

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(component.saveStatus.status).toBe('saving');

      const req = httpMock.expectOne(`${attendanceBaseUrl}/records/${mockRecords[0].id}`);
      req.flush({
        data: { ...mockRecords[0], status: AttendanceStatus.TARDANZA },
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.saveStatus.status).toBe('saved');
    });
  });

  describe('UI Helper Methods', () => {
    it('should format student full name correctly', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;

      const fullName = component.getStudentFullName(mockStudents[0]);
      // Verificar que el nombre completo incluye partes correctas (sin encoding de caracteres especiales)
      expect(fullName).toContain('Juan');
      expect(fullName).toContain('Carlos');
    });

    it('should show entry time field for PRESENTE and TARDANZA', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;

      expect(component.shouldShowEntryTime(AttendanceStatus.PRESENTE)).toBe(true);
      expect(component.shouldShowEntryTime(AttendanceStatus.TARDANZA)).toBe(true);
      expect(component.shouldShowEntryTime(AttendanceStatus.FALTA)).toBe(false);
      expect(component.shouldShowEntryTime(AttendanceStatus.CON_PERMISO)).toBe(false);
    });

    it('should show permission note field only for CON_PERMISO', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;

      expect(component.shouldShowPermissionNote(AttendanceStatus.CON_PERMISO)).toBe(true);
      expect(component.shouldShowPermissionNote(AttendanceStatus.PRESENTE)).toBe(false);
      expect(component.shouldShowPermissionNote(AttendanceStatus.FALTA)).toBe(false);
    });

    it('should correctly identify closed session', () => {
      const fixture = TestBed.createComponent(AttendanceSessionComponent);
      const component = fixture.componentInstance;

      component.currentSession = mockSession;
      expect(component.isSessionClosed()).toBe(false);

      component.currentSession = { ...mockSession, status: SessionStatus.CLOSED };
      expect(component.isSessionClosed()).toBe(true);
    });
  });
});
