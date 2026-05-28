import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImportWizardComponent } from '../features/students/import-wizard/import-wizard.component';
import { ImportService } from '../core/services/import.service';
import {
  UploadResult,
  ValidationResult,
  ImportResult,
  IssueSeverity,
  FileValidationResult,
  ImportIssue,
  ImportJobStatus,
} from '../core/models/import.model';
import { environment } from '../../environments/environment';

const vi = {
  fn: (implementation?: (...args: any[]) => any) => {
    const spy = jasmine.createSpy();
    if (implementation) {
      spy.and.callFake(implementation);
    }
    return spy;
  },
  spyOn: <T, K extends keyof T>(target: T, method: K) => spyOn(target as any, method as any),
};

/**
 * Integration tests for Import Flow
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.7, 4.8**
 *
 * Tests cover complete import workflow:
 * - Upload files with validation
 * - Validate uploaded files
 * - Preview validation errors
 * - Confirm import and process
 * - Download reports
 * - Stepper navigation
 */
describe('Import Flow Integration', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  const mockJobId = 'job-123';
  // Base URL real del ImportService: environment.apiUrl + /internal/students/import
  const importBaseUrl = `${environment.apiUrl}/internal/students/import`;

  const mockUploadResult: UploadResult = {
    jobId: mockJobId,
    fileCount: 2,
    status: ImportJobStatus.PENDING,
  };

  const mockValidationIssues: ImportIssue[] = [
    {
      id: 'issue-1',
      sheetName: 'Hoja1',
      rowNumber: 5,
      severity: IssueSeverity.ERROR,
      code: 'INVALID_DNI',
      message: 'DNI invalido: debe tener 8 digitos',
    },
    {
      id: 'issue-2',
      sheetName: 'Hoja1',
      rowNumber: 10,
      severity: IssueSeverity.WARNING,
      code: 'MISSING_MIDDLE_NAME',
      message: 'Segundo nombre no proporcionado',
    },
  ];

  const mockFileValidation: FileValidationResult = {
    fileId: 'file-1',
    fileName: 'estudiantes.xlsx',
    status: 'VALIDATED',
    rowTotal: 100,
    rowValid: 98,
    rowError: 2,
    issues: mockValidationIssues,
  };

  const mockValidationResult: ValidationResult = {
    jobId: mockJobId,
    status: ImportJobStatus.VALIDATED,
    files: [mockFileValidation],
    canConfirm: true,
    summary: {
      totalFiles: 1,
      totalRows: 100,
      validRows: 98,
      warnings: 1,
      errors: 1,
    },
  };

  const mockValidationResultWithErrors: ValidationResult = {
    jobId: mockJobId,
    status: ImportJobStatus.VALIDATED,
    files: [
      {
        ...mockFileValidation,
        issues: [
          {
            id: 'issue-3',
            sheetName: 'Hoja1',
            rowNumber: 5,
            severity: IssueSeverity.ERROR,
            code: 'IMPORT_IDENTITY_CONFLICT',
            message: 'Conflicto de identidad: DNI coincide con un estudiante pero nombre con otro',
          },
        ],
      },
    ],
    canConfirm: false,
    summary: {
      totalFiles: 1,
      totalRows: 100,
      validRows: 99,
      warnings: 0,
      errors: 1,
    },
  };

  const mockImportResult: ImportResult = {
    jobId: mockJobId,
    status: ImportJobStatus.COMPLETED,
    summary: {
      totalRows: 100,
      inserted: 50,
      rejected: 2,
      durationMs: 1500,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ImportWizardComponent],
      providers: [provideRouter([]), ImportService],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Step 1: Upload Files', () => {
    it('should accept valid XLSX files', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0].name).toBe('estudiantes.xlsx');
      expect(component.uploadError).toBeNull();
    });

    it('should accept valid CSV files', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.csv', {
        type: 'text/csv',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(1);
      expect(component.uploadError).toBeNull();
    });

    it('should reject files with invalid extensions', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.txt', {
        type: 'text/plain',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(0);
      // Verificar que hay algun mensaje de error de extension (sin depender de encoding)
      expect(component.uploadError).toBeTruthy();
    });

    it('should reject files exceeding 10MB', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Create a file larger than 10MB
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(0);
      // Verificar que hay un mensaje de error de tamanio (sin depender de encoding)
      expect(component.uploadError).toBeTruthy();
    });

    it('should prevent duplicate file selection', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);
      component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(1);
      // Verificar que hay un mensaje de error de duplicado (sin depender de encoding exacto)
      expect(component.uploadError).toBeTruthy();
    });

    it('should allow removing selected files', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);
      expect(component.selectedFiles.length).toBe(1);

      const fileId = component.selectedFiles[0].id;
      component.removeFile(fileId);

      expect(component.selectedFiles.length).toBe(0);
    });

    it('should upload files and move to validation step', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);
      component.selectedShift = 'MANANA';
      component.uploadFiles();

      expect(component.uploading).toBe(true);

      // El ImportService llama a: environment.apiUrl + /internal/students/import/upload
      const uploadReq = httpMock.expectOne(`${importBaseUrl}/upload`);
      expect(uploadReq.request.method).toBe('POST');

      uploadReq.flush({
        data: mockUploadResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      // Automaticamente inicia validacion: environment.apiUrl + /internal/students/import/job-123/validate
      const validateReq = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/validate`);
      validateReq.flush({
        data: mockValidationResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.uploading).toBe(false);
      expect(component.currentStep).toBe(2);
      expect(component.jobId).toBe(mockJobId);
      expect(component.validationResult).toEqual(mockValidationResult);
    });

    it('should handle upload errors', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);
      component.selectedShift = 'MANANA';
      component.uploadFiles();

      const req = httpMock.expectOne(`${importBaseUrl}/upload`);
      req.flush(
        { error: { message: 'Server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // El componente debe mostrar algun mensaje de error al subir
      expect(component.uploadError).toBeTruthy();
      expect(component.uploading).toBe(false);
      expect(component.currentStep).toBe(1);
    });
  });

  describe('Step 2: Validation', () => {
    it('should display validation results', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.jobId = mockJobId;
      component.currentStep = 2;

      // Manually trigger validation
      component['startValidation']();

      const req = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/validate`);
      req.flush({
        data: mockValidationResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.validationResult).toEqual(mockValidationResult);
      expect(component.validating).toBe(false);
      expect(component.canContinueToPreview()).toBe(true);
    });

    it('should handle validation errors', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.jobId = mockJobId;
      component.currentStep = 2;

      component['startValidation']();

      const req = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/validate`);
      req.flush(
        { error: { message: 'Validation failed' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.validationError).toBeTruthy();
      expect(component.validating).toBe(false);
    });

    it('should allow moving to preview when validation passes', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.validationResult = mockValidationResult;
      component.currentStep = 2;

      expect(component.canContinueToPreview()).toBe(true);

      component.goToPreview();

      expect(component.currentStep).toBe(3);
    });
  });

  describe('Step 3: Preview', () => {
    beforeEach(() => {
      // Setup component with validation results
    });

    it('should display all validation issues', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.validationResult = mockValidationResult;
      component.currentStep = 3;
      component['prepareIssuesForPreview']();

      expect(component.filteredIssues.length).toBe(2);
    });

    it('should filter issues by severity', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.validationResult = mockValidationResult;
      component['prepareIssuesForPreview']();

      component.selectedSeverityFilter = IssueSeverity.ERROR;
      component.applyFilters();

      expect(component.filteredIssues.length).toBe(1);
      expect(component.filteredIssues[0].severity).toBe(IssueSeverity.ERROR);
    });

    it('should filter issues by file', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const multiFileValidation: ValidationResult = {
        ...mockValidationResult,
        files: [
          mockFileValidation,
          {
            fileId: 'file-2',
            fileName: 'otros.xlsx',
            status: 'VALIDATED',
            rowTotal: 50,
            rowValid: 50,
            rowError: 0,
            issues: [],
          },
        ],
      };

      component.validationResult = multiFileValidation;
      component['prepareIssuesForPreview']();

      component.selectedFileFilter = 'file-1';
      component.applyFilters();

      expect(component.filteredIssues.length).toBe(2);
    });

    it('should paginate issues correctly', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Create many issues for pagination
      const manyIssues: ImportIssue[] = Array.from({ length: 25 }, (_, i) => ({
        id: `issue-${i}`,
        sheetName: 'Hoja1',
        rowNumber: i + 1,
        severity: IssueSeverity.ERROR,
        code: 'TEST_ERROR',
        message: `Error ${i + 1}`,
      }));

      component.validationResult = {
        ...mockValidationResult,
        files: [
          {
            ...mockFileValidation,
            issues: manyIssues,
          },
        ],
      };

      component['prepareIssuesForPreview']();
      component.pageSize = 10;

      expect(component.getTotalPages()).toBe(3);
      expect(component.getPaginatedIssues().length).toBe(10);

      component.nextPage();
      expect(component.currentPage).toBe(2);
      expect(component.getPaginatedIssues().length).toBe(10);

      component.nextPage();
      expect(component.currentPage).toBe(3);
      expect(component.getPaginatedIssues().length).toBe(5);
    });

    it('should download error report as CSV', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.validationResult = mockValidationResult;
      component.jobId = mockJobId;

      // Mock document methods usando Jasmine spyOn
      const mockLink = {
        setAttribute: jasmine.createSpy('setAttribute'),
        click: jasmine.createSpy('click'),
        style: { visibility: '' },
        href: '',
      };

      const createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink as any);
      spyOn(document.body, 'appendChild').and.callFake(() => null as any);
      spyOn(document.body, 'removeChild').and.callFake(() => null as any);

      component.downloadErrorReport();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        `errores_importacion_${mockJobId}.csv`
      );
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should allow confirming import when validation passes', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.validationResult = mockValidationResult;
      component.currentStep = 3;

      expect(component.canConfirmImport()).toBe(true);
    });

    it('should prevent confirming import when validation fails', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.validationResult = mockValidationResultWithErrors;
      component.currentStep = 3;

      expect(component.canConfirmImport()).toBe(false);
    });
  });

  describe('Step 4: Confirm Import', () => {
    it('should confirm import and display results', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.jobId = mockJobId;
      component.validationResult = mockValidationResult;
      component.currentStep = 3;

      component.goToConfirm();

      expect(component.currentStep).toBe(4);
      expect(component.confirming).toBe(true);

      const req = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/confirm`);
      expect(req.request.method).toBe('POST');

      req.flush({
        data: mockImportResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.importResult).toEqual(mockImportResult);
      expect(component.confirming).toBe(false);
    });

    it('should handle import errors', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.jobId = mockJobId;
      component.validationResult = mockValidationResult;
      component.currentStep = 3;

      component.goToConfirm();

      const req = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/confirm`);
      req.flush(
        { error: { message: 'Import failed' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // El componente debe mostrar algun error de confirmacion
      expect(component.confirmError).toBeTruthy();
      expect(component.confirming).toBe(false);
    });

    it('should download final report', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.importResult = mockImportResult;
      component.validationResult = mockValidationResult;
      component.jobId = mockJobId;

      // Mock document methods usando Jasmine spyOn
      const mockLink = {
        setAttribute: jasmine.createSpy('setAttribute'),
        click: jasmine.createSpy('click'),
        style: { visibility: '' },
        href: '',
      };

      const createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink as any);
      spyOn(document.body, 'appendChild').and.callFake(() => null as any);
      spyOn(document.body, 'removeChild').and.callFake(() => null as any);

      component.downloadFinalReport();

      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        `reporte_final_${mockJobId}.csv`
      );
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should allow starting new import', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.currentStep = 4;
      component.importResult = mockImportResult;
      component.validationResult = mockValidationResult;
      component.jobId = mockJobId;

      component.startNewImport();

      expect(component.currentStep).toBe(1);
      expect(component.selectedFiles.length).toBe(0);
      expect(component.importResult).toBeNull();
      expect(component.validationResult).toBeNull();
      expect(component.jobId).toBeNull();
    });
  });

  describe('Stepper Navigation', () => {
    it('should navigate forward through all steps', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Step 1: Upload
      expect(component.currentStep).toBe(1);

      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);
      component.selectedShift = 'MANANA';
      component.goNext();

      const uploadReq = httpMock.expectOne(`${importBaseUrl}/upload`);
      uploadReq.flush({
        data: mockUploadResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      const validateReq = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/validate`);
      validateReq.flush({
        data: mockValidationResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 2: Validation
      expect(component.currentStep).toBe(2);

      component.goNext();
      expect(component.currentStep).toBe(3);

      // Step 3: Preview
      component.goNext();
      expect(component.currentStep).toBe(4);

      const confirmReq = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/confirm`);
      confirmReq.flush({
        data: mockImportResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 4: Confirm
      expect(component.currentStep).toBe(4);
    });

    it('should navigate backward correctly', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.currentStep = 3;
      component.validationResult = mockValidationResult;

      component.goPrevious();
      expect(component.currentStep).toBe(2);

      component.goPrevious();
      expect(component.currentStep).toBe(1);
      expect(component.validationResult).toBeNull();
    });

    it('should disable forward navigation when step incomplete', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Step 1 without files
      expect(component.canGoNext()).toBe(false);

      // Step 1 with files but without shift
      component.selectedFiles = [
        {
          file: new File([], 'test.xlsx'),
          id: '1',
          name: 'test.xlsx',
          size: 100,
          type: 'xlsx',
        },
      ];
      expect(component.canGoNext()).toBe(false);

      // Step 1 with files and shift
      component.selectedShift = 'MANANA';
      expect(component.canGoNext()).toBe(true);

      // Step 2 without validation
      component.currentStep = 2;
      expect(component.canGoNext()).toBe(false);

      // Step 3 with validation errors
      component.currentStep = 3;
      component.validationResult = mockValidationResultWithErrors;
      expect(component.canGoNext()).toBe(false);
    });

    it('should disable backward navigation during async operations', () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.currentStep = 2;
      component.uploading = true;

      expect(component.canGoPrevious()).toBe(false);

      component.uploading = false;
      component.validating = true;

      expect(component.canGoPrevious()).toBe(false);
    });
  });

  describe('Complete Flow', () => {
    it('should complete entire import workflow successfully', async () => {
      const fixture = TestBed.createComponent(ImportWizardComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Step 1: Upload files
      const file = new File(['content'], 'estudiantes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [file] },
      } as any;

      component.onFileSelected(event);
      expect(component.selectedFiles.length).toBe(1);
      component.selectedShift = 'MANANA';
      component.uploadFiles();

      const uploadReq = httpMock.expectOne(`${importBaseUrl}/upload`);
      uploadReq.flush({
        data: mockUploadResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      // Step 2: Validation (automatic)
      const validateReq = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/validate`);
      validateReq.flush({
        data: mockValidationResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.currentStep).toBe(2);
      expect(component.validationResult).toBeTruthy();

      // Step 3: Preview
      component.goToPreview();
      expect(component.currentStep).toBe(3);
      expect(component.filteredIssues.length).toBeGreaterThan(0);

      // Step 4: Confirm
      component.goToConfirm();
      expect(component.currentStep).toBe(4);

      const confirmReq = httpMock.expectOne(`${importBaseUrl}/${mockJobId}/confirm`);
      confirmReq.flush({
        data: mockImportResult,
        meta: { traceId: 'test', timestamp: new Date().toISOString() },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(component.importResult).toEqual(mockImportResult);
      expect(component.importResult?.summary.inserted).toBe(50);
      expect(component.importResult?.summary.rejected).toBe(2);
    });
  });
});
