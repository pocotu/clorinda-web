import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ImportWizardComponent } from './import-wizard.component';
import { ImportService } from '../../../core/services/import.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  UploadResult,
  ValidationResult,
  ImportResult,
  ImportJobStatus,
  IssueSeverity,
} from '../../../core/models/import.model';

describe('ImportWizardComponent', () => {
  let component: ImportWizardComponent;
  let fixture: ComponentFixture<ImportWizardComponent>;
  let mockImportService: jasmine.SpyObj<ImportService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockImportService = jasmine.createSpyObj('ImportService', [
      'uploadFiles',
      'validateJob',
      'confirmImport',
      'getReport',
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockImportService.validateJob.and.returnValue(
      of({
        data: { files: [], canConfirm: true },
        meta: { traceId: 'seed', timestamp: 'seed' },
      } as any)
    );
    mockImportService.confirmImport.and.returnValue(
      of({
        data: { summary: { totalRows: 0, inserted: 0, rejected: 0, durationMs: 0 } },
        meta: {},
      } as any)
    );

    await TestBed.configureTestingModule({
      imports: [ImportWizardComponent, FormsModule],
      providers: [
        { provide: ImportService, useValue: mockImportService },
        { provide: Router, useValue: mockRouter },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with step 1', () => {
    expect(component.currentStep).toBe(1);
    expect(component.selectedFiles).toEqual([]);
  });

  describe('File Upload', () => {
    it('should validate file extension', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      component['addFiles']([invalidFile]);

      expect(component.uploadError).toContain('extensión inválida');
      expect(component.selectedFiles.length).toBe(0);
    });

    it('should validate file size', () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      component['addFiles']([largeFile]);

      expect(component.uploadError).toContain('excede el tamaño máximo');
      expect(component.selectedFiles.length).toBe(0);
    });

    it('should add valid file', () => {
      const validFile = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      component['addFiles']([validFile]);

      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0].name).toBe('test.xlsx');
    });

    it('should remove file', () => {
      const validFile = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      component['addFiles']([validFile]);
      const fileId = component.selectedFiles[0].id;

      component.removeFile(fileId);

      expect(component.selectedFiles.length).toBe(0);
    });

    it('should upload files successfully', () => {
      const mockResponse: UploadResult = {
        jobId: 'job-123',
        fileCount: 1,
        status: ImportJobStatus.PENDING,
      };
      mockImportService.uploadFiles.and.returnValue(
        of({ data: mockResponse, meta: { traceId: '123', timestamp: '2024-01-01' } })
      );

      const validFile = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      component['addFiles']([validFile]);
      component.selectedShift = 'MANANA';
      component.uploadFiles();

      expect(mockImportService.uploadFiles).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate job successfully', () => {
      const mockValidation: ValidationResult = {
        jobId: 'job-123',
        status: ImportJobStatus.VALIDATED,
        canConfirm: true,
        summary: {
          totalFiles: 1,
          totalRows: 10,
          validRows: 10,
          warnings: 0,
          errors: 0,
        },
        files: [],
      };
      mockImportService.validateJob.and.returnValue(
        of({ data: mockValidation, meta: { traceId: '123', timestamp: '2024-01-01' } })
      );

      component.jobId = 'job-123';
      component['startValidation']();

      expect(mockImportService.validateJob).toHaveBeenCalledWith('job-123');
    });

    it('should handle validation error', () => {
      mockImportService.validateJob.and.returnValue(
        throwError(() => ({ error: { error: { message: 'Validation failed' } } }))
      );

      component.jobId = 'job-123';
      component['startValidation']();

      expect(component.validationError).toBe('Validation failed');
    });
  });

  describe('Import Confirmation', () => {
    it('should confirm import successfully', () => {
      const mockResult: ImportResult = {
        jobId: 'job-123',
        status: ImportJobStatus.COMPLETED,
        summary: {
          totalRows: 10,
          inserted: 10,
          rejected: 0,
          durationMs: 1000,
        },
      };
      mockImportService.confirmImport.and.returnValue(
        of({ data: mockResult, meta: { traceId: '123', timestamp: '2024-01-01' } })
      );

      component.jobId = 'job-123';
      component['startImport']();

      expect(mockImportService.confirmImport).toHaveBeenCalledWith('job-123');
    });
  });

  describe('Navigation', () => {
    it('should navigate to student list', () => {
      component.goToStudentList();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudiantes']);
    });

    it('should reset state on new import', () => {
      component.currentStep = 4;
      component.jobId = 'job-123';
      component.selectedFiles = [
        {
          file: new File([], 'test.xlsx'),
          id: '1',
          name: 'test.xlsx',
          size: 100,
          type: 'xlsx',
        },
      ];

      component.startNewImport();

      expect(component.currentStep).toBe(1);
      expect(component.jobId).toBeNull();
      expect(component.selectedFiles).toEqual([]);
    });
  });

  describe('Stepper Navigation (Task 17.4.3)', () => {
    describe('canGoNext', () => {
      it('should return false on step 1 if no files selected', () => {
        component.currentStep = 1;
        component.selectedFiles = [];

        expect(component.canGoNext()).toBe(false);
      });

      it('should return true on step 1 if files selected and not uploading', () => {
        component.currentStep = 1;
        component.selectedFiles = [
          {
            file: new File([], 'test.xlsx'),
            id: '1',
            name: 'test.xlsx',
            size: 100,
            type: 'xlsx',
          },
        ];
        component.uploading = false;
        component.selectedShift = 'MANANA';

        expect(component.canGoNext()).toBe(true);
      });

      it('should return false on step 1 if uploading', () => {
        component.currentStep = 1;
        component.selectedFiles = [
          {
            file: new File([], 'test.xlsx'),
            id: '1',
            name: 'test.xlsx',
            size: 100,
            type: 'xlsx',
          },
        ];
        component.uploading = true;
        component.selectedShift = 'MANANA';

        expect(component.canGoNext()).toBe(false);
      });

      it('should return true on step 2 if validation complete', () => {
        component.currentStep = 2;
        component.validationResult = {
          jobId: 'job-123',
          status: ImportJobStatus.VALIDATED,
          canConfirm: true,
          summary: {
            totalFiles: 1,
            totalRows: 10,
            validRows: 10,
            warnings: 0,
            errors: 0,
          },
          files: [],
        };
        component.validating = false;

        expect(component.canGoNext()).toBe(true);
      });

      it('should return false on step 2 if validating', () => {
        component.currentStep = 2;
        component.validating = true;

        expect(component.canGoNext()).toBe(false);
      });

      it('should return true on step 3 if canConfirm is true', () => {
        component.currentStep = 3;
        component.validationResult = {
          jobId: 'job-123',
          status: ImportJobStatus.VALIDATED,
          canConfirm: true,
          summary: {
            totalFiles: 1,
            totalRows: 10,
            validRows: 10,
            warnings: 0,
            errors: 0,
          },
          files: [],
        };

        expect(component.canGoNext()).toBe(true);
      });

      it('should return false on step 3 if canConfirm is false', () => {
        component.currentStep = 3;
        component.validationResult = {
          jobId: 'job-123',
          status: ImportJobStatus.VALIDATED,
          canConfirm: false,
          summary: {
            totalFiles: 1,
            totalRows: 10,
            validRows: 5,
            warnings: 0,
            errors: 5,
          },
          files: [],
        };

        expect(component.canGoNext()).toBe(false);
      });

      it('should return false on step 4 (final step)', () => {
        component.currentStep = 4;

        expect(component.canGoNext()).toBe(false);
      });
    });

    describe('canGoPrevious', () => {
      it('should return false on step 1', () => {
        component.currentStep = 1;

        expect(component.canGoPrevious()).toBe(false);
      });

      it('should return true on step 2 if not validating', () => {
        component.currentStep = 2;
        component.validating = false;

        expect(component.canGoPrevious()).toBe(true);
      });

      it('should return false on step 2 if validating', () => {
        component.currentStep = 2;
        component.validating = true;

        expect(component.canGoPrevious()).toBe(false);
      });

      it('should return true on step 3 if not confirming', () => {
        component.currentStep = 3;
        component.confirming = false;

        expect(component.canGoPrevious()).toBe(true);
      });

      it('should return false if uploading', () => {
        component.currentStep = 2;
        component.uploading = true;

        expect(component.canGoPrevious()).toBe(false);
      });

      it('should return false if confirming', () => {
        component.currentStep = 4;
        component.confirming = true;

        expect(component.canGoPrevious()).toBe(false);
      });
    });

    describe('goNext', () => {
      it('should call uploadFiles on step 1', () => {
        component.currentStep = 1;
        component.selectedFiles = [
          {
            file: new File([], 'test.xlsx'),
            id: '1',
            name: 'test.xlsx',
            size: 100,
            type: 'xlsx',
          },
        ];
        component.selectedShift = 'MANANA';
        spyOn(component, 'uploadFiles');

        component.goNext();

        expect(component.uploadFiles).toHaveBeenCalled();
      });

      it('should call goToPreview on step 2', () => {
        component.currentStep = 2;
        component.validationResult = {
          jobId: 'job-123',
          status: ImportJobStatus.VALIDATED,
          canConfirm: true,
          summary: {
            totalFiles: 1,
            totalRows: 10,
            validRows: 10,
            warnings: 0,
            errors: 0,
          },
          files: [],
        };
        spyOn(component, 'goToPreview');

        component.goNext();

        expect(component.goToPreview).toHaveBeenCalled();
      });

      it('should call goToConfirm on step 3', () => {
        component.currentStep = 3;
        component.validationResult = {
          jobId: 'job-123',
          status: ImportJobStatus.VALIDATED,
          canConfirm: true,
          summary: {
            totalFiles: 1,
            totalRows: 10,
            validRows: 10,
            warnings: 0,
            errors: 0,
          },
          files: [],
        };
        spyOn(component, 'goToConfirm');

        component.goNext();

        expect(component.goToConfirm).toHaveBeenCalled();
      });

      it('should not proceed if canGoNext is false', () => {
        component.currentStep = 1;
        component.selectedFiles = [];
        spyOn(component, 'uploadFiles');

        component.goNext();

        expect(component.uploadFiles).not.toHaveBeenCalled();
      });
    });

    describe('goPrevious', () => {
      it('should go back to step 1 from step 2', () => {
        component.currentStep = 2;
        component.validationResult = {} as ValidationResult;

        component.goPrevious();

        expect(component.currentStep).toBe(1);
        expect(component.validationResult).toBeNull();
      });

      it('should go back to step 2 from step 3', () => {
        component.currentStep = 3;

        component.goPrevious();

        expect(component.currentStep).toBe(2);
      });

      it('should not go back if canGoPrevious is false', () => {
        component.currentStep = 1;

        component.goPrevious();

        expect(component.currentStep).toBe(1);
      });
    });

    describe('cancelWizard', () => {
      it('should navigate directly if on final step with successful import', async () => {
        component.currentStep = 4;
        component.importResult = {
          jobId: 'job-123',
          status: ImportJobStatus.COMPLETED,
          summary: {
            totalRows: 10,
            inserted: 10,
            rejected: 0,
            durationMs: 1000,
          },
        };

        await component.cancelWizard();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudiantes']);
      });

      it('should navigate directly if on step 1 with no files', async () => {
        component.currentStep = 1;
        component.selectedFiles = [];

        await component.cancelWizard();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudiantes']);
      });

      it('should show confirmation if work in progress', async () => {
        component.currentStep = 2;
        component.jobId = 'job-123';
        spyOn(window, 'confirm').and.returnValue(true);

        await component.cancelWizard();

        expect(window.confirm).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/estudiantes']);
      });

      it('should not navigate if user cancels confirmation', async () => {
        component.currentStep = 2;
        component.jobId = 'job-123';
        spyOn(window, 'confirm').and.returnValue(false);

        await component.cancelWizard();

        expect(window.confirm).toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      });
    });

    describe('Button Labels and Icons', () => {
      it('should return correct next button label for step 1', () => {
        component.currentStep = 1;
        component.uploading = false;

        expect(component.getNextButtonLabel()).toBe('Siguiente');
      });

      it('should return "Subiendo..." when uploading', () => {
        component.currentStep = 1;
        component.uploading = true;

        expect(component.getNextButtonLabel()).toBe('Subiendo...');
      });

      it('should return correct label for step 3', () => {
        component.currentStep = 3;

        expect(component.getNextButtonLabel()).toBe('Confirmar Importación');
      });

      it('should return correct icon for step 1', () => {
        component.currentStep = 1;
        component.uploading = false;

        expect(component.getNextButtonIcon()).toBe('bi-arrow-right');
      });

      it('should return correct icon for step 3', () => {
        component.currentStep = 3;

        expect(component.getNextButtonIcon()).toBe('bi-check-circle');
      });
    });
  });

  describe('Utilities', () => {
    it('should format file size correctly', () => {
      expect(component.formatFileSize(0)).toBe('0 Bytes');
      expect(component.formatFileSize(1024)).toBe('1 KB');
      expect(component.formatFileSize(1048576)).toBe('1 MB');
    });

    it('should get step title', () => {
      expect(component.getStepTitle(1)).toBe('Subir Archivos');
      expect(component.getStepTitle(2)).toBe('Validar');
      expect(component.getStepTitle(3)).toBe('Previsualizar');
      expect(component.getStepTitle(4)).toBe('Confirmar');
    });

    it('should check if step is active', () => {
      component.currentStep = 2;
      expect(component.isStepActive(2)).toBe(true);
      expect(component.isStepActive(1)).toBe(false);
    });

    it('should check if step is completed', () => {
      component.currentStep = 3;
      expect(component.isStepCompleted(1)).toBe(true);
      expect(component.isStepCompleted(2)).toBe(true);
      expect(component.isStepCompleted(3)).toBe(false);
    });
  });
});
