import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StudentsService } from './students.service';
import {
  Student,
  StudentFilters,
  CreateStudentDto,
  UpdateStudentDto,
  ApiResponse,
  EnrollmentStatus,
} from '../models/student.model';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for StudentsService
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.6**
 *
 * Tests cover:
 * - Student CRUD operations
 * - Filtering and pagination
 * - Validation
 * - Status toggling
 */
describe('StudentsService', () => {
  let service: StudentsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/internal/students`;

  const mockStudent: Student = {
    id: 'student-123',
    studentCode: '20240001',
    dni: '12345678',
    firstName: 'JUAN',
    middleName: 'CARLOS',
    lastName: 'PÉREZ',
    secondLastName: 'GARCÍA',
    thirdName: undefined,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StudentsService],
    });

    service = TestBed.inject(StudentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getStudents', () => {
    it('should get students with default pagination', async () => {
      const mockResponse: ApiResponse<Student[]> = {
        data: [mockStudent],
        meta: {
          traceId: 'test',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: {
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getStudents().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('page') === '1' &&
          request.params.get('pageSize') === '20'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.length).toBe(1);
      expect(response.data[0]).toEqual(mockStudent);
    });

    it('should get students with custom pagination', async () => {
      const mockResponse: ApiResponse<Student[]> = {
        data: [mockStudent],
        meta: {
          traceId: 'test',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: {
            total: 50,
            page: 2,
            pageSize: 10,
            totalPages: 5,
          },
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getStudents({}, 2, 10).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('page') === '2' &&
          request.params.get('pageSize') === '10'
        );
      });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.meta.pagination?.page).toBe(2);
      expect(response.meta.pagination?.pageSize).toBe(10);
    });

    it('should get students with filters', async () => {
      const filters: StudentFilters = {
        studentCode: '20240001',
        dni: '12345678',
        firstName: 'JUAN',
        lastName: 'PÉREZ',
        isActive: true,
        schoolYear: 2024,
        grade: 1,
        section: 'A',
        enrollmentStatus: EnrollmentStatus.ACTIVE,
      };
      const mockResponse: ApiResponse<Student[]> = {
        data: [mockStudent],
        meta: {
          traceId: 'test',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: {
            total: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getStudents(filters).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('studentCode') === '20240001' &&
          request.params.get('dni') === '12345678' &&
          request.params.get('firstName') === 'JUAN' &&
          request.params.get('lastName') === 'PÉREZ' &&
          request.params.get('isActive') === 'true' &&
          request.params.get('schoolYear') === '2024' &&
          request.params.get('grade') === '1' &&
          request.params.get('section') === 'A' &&
          request.params.get('enrollmentStatus') === 'ACTIVE'
        );
      });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
    });

    it('should handle empty results', async () => {
      const mockResponse: ApiResponse<Student[]> = {
        data: [],
        meta: {
          traceId: 'test',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: {
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
          },
        },
      };

      const promise = new Promise((resolve, reject) => {
        service.getStudents({ studentCode: 'NONEXISTENT' }).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => request.url === apiUrl);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.length).toBe(0);
      expect(response.meta.pagination?.total).toBe(0);
    });
  });

  describe('createStudent', () => {
    it('should create student successfully', async () => {
      const createDto: CreateStudentDto = {
        studentCode: '20240001',
        dni: '12345678',
        firstName: 'JUAN',
        middleName: 'CARLOS',
        lastName: 'PÉREZ',
        secondLastName: 'GARCÍA',
        thirdName: undefined,
      };
      const mockResponse: ApiResponse<Student> = {
        data: mockStudent,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.createStudent(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.studentCode).toBe(createDto.studentCode);
      expect(response.data.dni).toBe(createDto.dni);
    });

    it('should handle duplicate student code error', async () => {
      const createDto: CreateStudentDto = {
        studentCode: '20240001',
        firstName: 'JUAN',
        lastName: 'PÉREZ',
        secondLastName: 'GARCÍA',
      };

      const promise = new Promise((resolve, reject) => {
        service.createStudent(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: { message: 'Student code already exists' } },
        { status: 409, statusText: 'Conflict' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle validation errors', async () => {
      const createDto: CreateStudentDto = {
        studentCode: 'INVALID',
        firstName: 'JUAN',
        lastName: 'PÉREZ',
        secondLastName: 'GARCÍA',
      };

      const promise = new Promise((resolve, reject) => {
        service.createStudent(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: { message: 'Invalid student code format' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('updateStudent', () => {
    it('should update student successfully', async () => {
      const updateDto: UpdateStudentDto = {
        dni: '87654321',
        firstName: 'JUAN CARLOS',
      };
      const updatedStudent = { ...mockStudent, ...updateDto };
      const mockResponse: ApiResponse<Student> = {
        data: updatedStudent,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.updateStudent('student-123', updateDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/student-123`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updateDto);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.dni).toBe(updateDto.dni);
      expect(response.data.firstName).toBe(updateDto.firstName);
    });

    it('should handle student not found', async () => {
      const updateDto: UpdateStudentDto = {
        firstName: 'JUAN',
      };

      const promise = new Promise((resolve, reject) => {
        service.updateStudent('invalid-id', updateDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/invalid-id`);
      req.flush(
        { error: { message: 'Student not found' } },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('deleteStudent', () => {
    it('should delete student successfully', async () => {
      const deletedStudent = { ...mockStudent, isActive: false };
      const mockResponse: ApiResponse<Student> = {
        data: deletedStudent,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.deleteStudent('student-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/student-123`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.isActive).toBe(false);
    });

    it('should handle delete error', async () => {
      const promise = new Promise((resolve, reject) => {
        service.deleteStudent('invalid-id').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/invalid-id`);
      req.flush(
        { error: { message: 'Student not found' } },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('toggleStudentStatus', () => {
    it('should activate student', async () => {
      const activatedStudent = { ...mockStudent, isActive: true };
      const mockResponse: ApiResponse<Student> = {
        data: activatedStudent,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.toggleStudentStatus('student-123', true).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/student-123`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: true });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.isActive).toBe(true);
    });

    it('should deactivate student', async () => {
      const deactivatedStudent = { ...mockStudent, isActive: false };
      const mockResponse: ApiResponse<Student> = {
        data: deactivatedStudent,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.toggleStudentStatus('student-123', false).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/student-123`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.isActive).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getStudents().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => request.url === apiUrl);
      req.error(new ProgressEvent('error'));

      await expectAsync(promise).toBeRejected();
    });

    it('should handle server errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getStudents().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => request.url === apiUrl);
      req.flush(
        { error: { message: 'Internal server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });
});
