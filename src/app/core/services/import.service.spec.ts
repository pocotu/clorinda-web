import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImportService } from './import.service';
import {
  UploadResult,
  ValidationResult,
  ImportResult,
  ImportReport,
  ApiResponse,
  ImportJobStatus,
  IssueSeverity,
  FileValidationResult,
} from '../models/import.model';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for ImportService
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.7, 4.8**
 *
 * Tests cover:
 * - File upload
 * - Validation
 * - Import confirmation
 * - Report generation
 */
describe('ImportService', () => {
  let service: ImportService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/internal/students/import`;

  const mockUploadResult: UploadResult = {
    jobId: 'job-123',
    fileCount: 2,
    status: ImportJobStatus.PENDING,
  };

  const mockValidationResult: ValidationResult = {
    jobId: 'job-123',
    status: ImportJobStatus.VALIDATED,
    canConfirm: true,
    summary: {
      totalFiles: 1,
      totalRows: 100,
      validRows: 100,
      warnings: 5,
      errors: 0,
    },
    files: [],
  };

  const mockImportResult: ImportResult = {
    jobId: 'job-123',
    status: ImportJobStatus.COMPLETED,
    summary: {
      totalRows: 100,
      inserted: 95,
      rejected: 0,
      durationMs: 1500,
    },
  };

  const mockImportReport: ImportReport = {
    jobId: 'job-123',
    status: ImportJobStatus.COMPLETED,
    summary: {
      totalFiles: 1,
      totalRows: 100,
      validRows: 95,
      warnings: 0,
      errors: 0,
      inserted: 95,
      rejected: 0,
      durationMs: 1500,
    },
    files: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ImportService],
    });

    service = TestBed.inject(ImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('uploadFiles', () => {
    it('should upload files successfully', async () => {
      const file1 = new File(['content1'], 'students1.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const file2 = new File(['content2'], 'students2.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const files = [file1, file2];
      const mockResponse: ApiResponse<UploadResult> = {
        data: mockUploadResult,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.uploadFiles(files).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/upload`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.jobId).toBe('job-123');
      expect(response.data.fileCount).toBe(2);
      expect(response.data.status).toBe(ImportJobStatus.PENDING);
    });

    it('should upload single file', async () => {
      const file = new File(['content'], 'students.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const mockResponse: ApiResponse<UploadResult> = {
        data: { ...mockUploadResult, fileCount: 1 },
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.uploadFiles([file]).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/upload`);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.fileCount).toBe(1);
    });

    it('should handle upload error', async () => {
      const file = new File(['content'], 'students.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const promise = new Promise((resolve, reject) => {
        service.uploadFiles([file]).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/upload`);
      req.flush(
        { error: { message: 'Invalid file format' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle file size limit error', async () => {
      const file = new File(['content'], 'students.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const promise = new Promise((resolve, reject) => {
        service.uploadFiles([file]).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/upload`);
      req.flush(
        { error: { message: 'File size exceeds limit' } },
        { status: 413, statusText: 'Payload Too Large' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('validateJob', () => {
    it('should validate job successfully with no errors', async () => {
      const mockResponse: ApiResponse<ValidationResult> = {
        data: mockValidationResult,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.validateJob('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.status).toBe('VALIDATED');
      expect(response.data.summary.errors).toBe(0);
      expect(response.data.canConfirm).toBe(true);
    });

    it('should validate job with errors', async () => {
      const validationWithErrors: ValidationResult = {
        ...mockValidationResult,
        summary: { ...mockValidationResult.summary, errors: 10 },
        canConfirm: false,
        files: [
          {
            fileId: 'f1',
            fileName: 'students.xlsx',
            status: 'VALIDATED',
            rowTotal: 100,
            rowValid: 99,
            rowError: 1,
            issues: [
              {
                id: 'i1',
                sheetName: 'Sheet1',
                rowNumber: 5,
                severity: IssueSeverity.ERROR,
                code: 'IMPORT_IDENTITY_CONFLICT',
                message: 'DNI matches one student but name matches another',
              },
            ],
          },
        ],
      };
      const mockResponse: ApiResponse<ValidationResult> = {
        data: validationWithErrors,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.validateJob('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/validate`);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.summary.errors).toBe(10);
      expect(response.data.canConfirm).toBe(false);
      expect(response.data.files[0].issues.length).toBe(1);
    });

    it('should handle validation job not found', async () => {
      const promise = new Promise((resolve, reject) => {
        service.validateJob('invalid-job').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/invalid-job/validate`);
      req.flush({ error: { message: 'Job not found' } }, { status: 404, statusText: 'Not Found' });

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('confirmImport', () => {
    it('should confirm import successfully', async () => {
      const mockResponse: ApiResponse<ImportResult> = {
        data: mockImportResult,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.confirmImport('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/confirm`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.status).toBe('COMPLETED');
      expect(response.data.inserted).toBe(95);
      expect(response.data.updated).toBe(5);
      expect(response.data.rejected).toBe(0);
    });

    it('should handle import with rejections', async () => {
      const resultWithRejections: ImportResult = {
        ...mockImportResult,
        summary: { ...mockImportResult.summary, inserted: 90, rejected: 10 },
      };
      const mockResponse: ApiResponse<ImportResult> = {
        data: resultWithRejections,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.confirmImport('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/confirm`);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.summary.inserted).toBe(90);
      expect(response.data.summary.rejected).toBe(10);
    });

    it('should handle confirm before validation error', async () => {
      const promise = new Promise((resolve, reject) => {
        service.confirmImport('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/confirm`);
      req.flush(
        { error: { message: 'Job must be validated before confirmation' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle confirm with validation errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service.confirmImport('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/confirm`);
      req.flush(
        { error: { message: 'Cannot confirm job with validation errors' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getReport', () => {
    it('should get report successfully', async () => {
      const mockResponse: ApiResponse<ImportReport> = {
        data: mockImportReport,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.getReport('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/report`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.jobId).toBe('job-123');
      expect(response.data.status).toBe('COMPLETED');
      expect(response.data.summary.inserted).toBe(95);
    });

    it('should get report with issues', async () => {
      const reportWithIssues: ImportReport = {
        ...mockImportReport,
        files: [
          {
            fileId: 'f1',
            fileName: 'students.xlsx',
            status: 'VALIDATED',
            rowTotal: 100,
            rowValid: 100,
            rowError: 0,
            issues: [
              {
                id: 'i1',
                sheetName: 'Sheet1',
                rowNumber: 5,
                severity: IssueSeverity.WARNING,
                code: 'DUPLICATE_DNI',
                message: 'Duplicate DNI found',
              },
            ],
          },
        ],
      };
      const mockResponse: ApiResponse<ImportReport> = {
        data: reportWithIssues,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      };

      const promise = new Promise((resolve, reject) => {
        service.getReport('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/report`);
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response.data.files[0].issues.length).toBe(1);
      expect(response.data.files[0].issues[0].severity).toBe('WARNING');
    });

    it('should handle report not found', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getReport('invalid-job').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/invalid-job/report`);
      req.flush(
        { error: { message: 'Report not found' } },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('import workflow', () => {
    it('should complete full import workflow', async () => {
      const file = new File(['content'], 'students.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Step 1: Upload
      const uploadPromise = new Promise((resolve, reject) => {
        service.uploadFiles([file]).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const uploadReq = httpMock.expectOne(`${apiUrl}/upload`);
      uploadReq.flush({
        data: mockUploadResult,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      });

      const uploadResponse: any = await uploadPromise;
      const jobId = uploadResponse.data.jobId;
      expect(jobId).toBeTruthy();

      // Step 2: Validate
      const validatePromise = new Promise((resolve, reject) => {
        service.validateJob(jobId).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const validateReq = httpMock.expectOne(`${apiUrl}/${jobId}/validate`);
      validateReq.flush({
        data: mockValidationResult,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      });

      const validationResponse: any = await validatePromise;
      expect(validationResponse.data.canConfirm).toBe(true);

      // Step 3: Confirm
      const confirmPromise = new Promise((resolve, reject) => {
        service.confirmImport(jobId).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const confirmReq = httpMock.expectOne(`${apiUrl}/${jobId}/confirm`);
      confirmReq.flush({
        data: mockImportResult,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      });

      const importResponse: any = await confirmPromise;
      expect(importResponse.data.status).toBe('COMPLETED');

      // Step 4: Get Report
      const reportPromise = new Promise((resolve, reject) => {
        service.getReport(jobId).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const reportReq = httpMock.expectOne(`${apiUrl}/${jobId}/report`);
      reportReq.flush({
        data: mockImportReport,
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      });

      const reportResponse: any = await reportPromise;
      expect(reportResponse.data.jobId).toBe(jobId);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const file = new File(['content'], 'students.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const promise = new Promise((resolve, reject) => {
        service.uploadFiles([file]).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/upload`);
      req.error(new ProgressEvent('error'));

      await expectAsync(promise).toBeRejected();
    });

    it('should handle server errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service.validateJob('job-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/job-123/validate`);
      req.flush(
        { error: { message: 'Internal server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });
});
