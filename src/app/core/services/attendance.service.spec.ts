import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AttendanceService } from './attendance.service';
import {
  AttendanceSession,
  CreateSessionDto,
  UpdateRecordDto,
  CloseSessionDto,
  SessionWithRecords,
  AttendanceRecord,
  Student,
  Shift,
  SessionStatus,
  AttendanceStatus,
} from '../models/attendance.model';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for AttendanceService
 * **Validates: Requirements 5.1, 6.1, 7.1, 10.1**
 *
 * Tests cover:
 * - Session creation and retrieval
 * - Attendance record updates
 * - Session closing
 * - History queries
 * - Student retrieval by section
 */
describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/internal/attendance`;
  const studentsApiUrl = `${environment.apiUrl}/internal/students`;

  const mockSession: AttendanceSession = {
    id: 'session-123',
    sessionDate: '2024-01-15',
    shift: Shift.MANANA,
    grade: 1,
    section: '1A',
    status: SessionStatus.OPEN,
    openedByUserId: 'user-123',
    openedAt: '2024-01-15T08:00:00Z',
    closedByUserId: undefined,
    closedAt: undefined,
    closeReason: undefined,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  };

  const mockRecord: AttendanceRecord = {
    id: 'record-123',
    sessionId: 'session-123',
    studentId: 'student-123',
    status: AttendanceStatus.PRESENTE,
    entryTime: '08:15:00',
    permissionNote: undefined,
    observation: undefined,
    updatedByUserId: 'user-123',
    updatedAt: '2024-01-15T08:15:00Z',
    createdAt: '2024-01-15T08:15:00Z',
  };

  const mockStudent: Student = {
    id: 'student-123',
    studentCode: '20240001',
    dni: '12345678',
    firstName: 'Juan',
    middleName: undefined,
    lastName: 'Pérez',
    secondLastName: 'García',
    thirdLastName: undefined,
    isActive: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AttendanceService],
    });

    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getSessions', () => {
    it('should get sessions without filters', async () => {
      const mockResponse = { data: [mockSession] };

      const promise = new Promise((resolve, reject) => {
        service.getSessions().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.length).toBe(1);
      expect(response.data[0]).toEqual(mockSession);
    });

    it('should get sessions with filters', async () => {
      const filters = {
        sessionDate: '2024-01-15',
        shift: Shift.MANANA,
        grade: 1,
        section: '1A',
        status: SessionStatus.OPEN,
      };
      const mockResponse = { data: [mockSession] };

      const promise = new Promise((resolve, reject) => {
        service.getSessions(filters).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/sessions` &&
          request.params.get('sessionDate') === '2024-01-15' &&
          request.params.get('shift') === 'MANANA' &&
          request.params.get('grade') === '1' &&
          request.params.get('section') === '1A' &&
          request.params.get('status') === 'OPEN'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
    });

    it('should handle empty filters', async () => {
      const mockResponse = { data: [] };

      const promise = new Promise((resolve, reject) => {
        service.getSessions({}).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions`);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.length).toBe(0);
    });
  });

  describe('getSessionWithRecords', () => {
    it('should get session with records', async () => {
      const mockSessionWithRecords: SessionWithRecords = {
        ...mockSession,
        records: [mockRecord],
      };
      const mockResponse = { data: mockSessionWithRecords };

      const promise = new Promise((resolve, reject) => {
        service.getSessionWithRecords('session-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions/session-123`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.records.length).toBe(1);
      expect(response.data.records[0]).toEqual(mockRecord);
    });

    it('should handle session not found', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getSessionWithRecords('invalid-id').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions/invalid-id`);
      req.flush(
        { error: { message: 'Session not found' } },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const createDto: CreateSessionDto = {
        sessionDate: '2024-01-15',
        shift: Shift.MANANA,
        grade: 1,
        section: '1A',
      };
      const mockResponse = { data: mockSession };

      const promise = new Promise((resolve, reject) => {
        service.createSession(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.sessionDate).toBe(createDto.sessionDate);
      expect(response.data.shift).toBe(createDto.shift);
      expect(response.data.section).toBe(createDto.section);
    });

    it('should handle duplicate session error', async () => {
      const createDto: CreateSessionDto = {
        sessionDate: '2024-01-15',
        shift: Shift.MANANA,
        grade: 1,
        section: '1A',
      };

      const promise = new Promise((resolve, reject) => {
        service.createSession(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions`);
      req.flush(
        { error: { message: 'Session already exists' } },
        { status: 409, statusText: 'Conflict' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('updateRecord', () => {
    it('should update record successfully', async () => {
      const updateDto: UpdateRecordDto = {
        status: AttendanceStatus.TARDANZA,
        entryTime: '08:30:00',
        observation: 'Llegó tarde',
      };
      const updatedRecord = { ...mockRecord, ...updateDto };
      const mockResponse = { data: updatedRecord };

      const promise = new Promise((resolve, reject) => {
        service.updateRecord('record-123', updateDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/records/record-123`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updateDto);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.status).toBe(updateDto.status);
      expect(response.data.entryTime).toBe(updateDto.entryTime);
      expect(response.data.observation).toBe(updateDto.observation);
    });

    it('should handle validation errors', async () => {
      const updateDto: UpdateRecordDto = {
        status: 'INVALID_STATUS' as any,
      };

      const promise = new Promise((resolve, reject) => {
        service.updateRecord('record-123', updateDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/records/record-123`);
      req.flush(
        { error: { message: 'Invalid status' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('closeSession', () => {
    it('should close session successfully', async () => {
      const closeDto: CloseSessionDto = {
        reason: 'Fin del día',
      };
      const closedSession = {
        ...mockSession,
        status: SessionStatus.CLOSED as const,
        closedByUserId: 'user-123',
        closedAt: '2024-01-15T16:00:00Z',
        closeReason: closeDto.reason,
      };
      const mockResponse = { data: closedSession };

      const promise = new Promise((resolve, reject) => {
        service.closeSession('session-123', closeDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions/session-123/close`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(closeDto);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.status).toBe('CLOSED');
      expect(response.data.closeReason).toBe(closeDto.reason);
    });

    it('should handle already closed session', async () => {
      const closeDto: CloseSessionDto = {
        reason: 'Fin del día',
      };

      const promise = new Promise((resolve, reject) => {
        service.closeSession('session-123', closeDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions/session-123/close`);
      req.flush(
        { error: { message: 'Session already closed' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getStudentsBySection', () => {
    it('should get students by section', async () => {
      const mockResponse = { data: [mockStudent] };

      const promise = new Promise((resolve, reject) => {
        service.getStudentsBySection(1, '1A', 2024).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === studentsApiUrl &&
          request.params.get('grade') === '1' &&
          request.params.get('section') === '1A' &&
          request.params.get('schoolYear') === '2024'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.length).toBe(1);
      expect(response.data[0]).toEqual(mockStudent);
    });

    it('should handle empty student list', async () => {
      const mockResponse = { data: [] };

      const promise = new Promise((resolve, reject) => {
        service.getStudentsBySection(1, '1A', 2024).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return request.url === studentsApiUrl;
      });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.length).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should get history without filters', async () => {
      const mockResponse = {
        data: [mockSession],
        meta: {
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getHistory().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/history`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.length).toBe(1);
      expect(response.meta.total).toBe(1);
    });

    it('should get history with filters', async () => {
      const filters = {
        section: '1A',
        month: 1,
        year: 2024,
        page: 1,
        pageSize: 10,
      };
      const mockResponse = {
        data: [mockSession],
        meta: {
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getHistory(filters).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${apiUrl}/history` &&
          request.params.get('section') === '1A' &&
          request.params.get('month') === '1' &&
          request.params.get('year') === '2024' &&
          request.params.get('page') === '1' &&
          request.params.get('pageSize') === '10'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
    });

    it('should handle pagination correctly', async () => {
      const filters = {
        page: 2,
        pageSize: 5,
      };
      const mockResponse = {
        data: [mockSession],
        meta: {
          total: 10,
          page: 2,
          pageSize: 5,
          totalPages: 2,
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getHistory(filters).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${apiUrl}/history`;
      });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.meta.page).toBe(2);
      expect(response.meta.pageSize).toBe(5);
      expect(response.meta.totalPages).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getSessions().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions`);
      req.error(new ProgressEvent('error'));

      await expectAsync(promise).toBeRejected();
    });

    it('should handle server errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service
          .createSession({
            sessionDate: '2024-01-15',
            shift: Shift.MANANA,
            grade: 1,
            section: '1A',
          })
          .subscribe({
            next: resolve,
            error: reject,
          });
      });

      const req = httpMock.expectOne(`${apiUrl}/sessions`);
      req.flush(
        { error: { message: 'Internal server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });
});
