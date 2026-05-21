import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportPreviewComponent } from './import-preview.component';
import {
  ImportIssue,
  IssueSeverity,
  FileValidationResult,
} from '../../../core/models/import.model';

describe('ImportPreviewComponent', () => {
  let component: ImportPreviewComponent;
  let fixture: ComponentFixture<ImportPreviewComponent>;

  const mockIssues: ImportIssue[] = [
    {
      id: '1',
      sheetName: 'Hoja1',
      rowNumber: 5,
      severity: IssueSeverity.ERROR,
      code: 'IMPORT_MISSING_NAME',
      message: 'Fila sin nombre completo',
      payload: { row: 5, field: 'nombre' },
    },
    {
      id: '2',
      sheetName: 'Hoja1',
      rowNumber: 10,
      severity: IssueSeverity.WARNING,
      code: 'IMPORT_MISSING_DNI',
      message: 'DNI vacío',
      payload: { row: 10, field: 'dni' },
    },
    {
      id: '3',
      sheetName: 'Hoja2',
      rowNumber: 3,
      severity: IssueSeverity.ERROR,
      code: 'IMPORT_DUPLICATE_DNI',
      message: 'DNI duplicado en el lote',
      payload: { row: 3, dni: '12345678' },
    },
  ];

  const mockFiles: FileValidationResult[] = [
    {
      fileId: 'file1',
      fileName: 'estudiantes_2024.xlsx',
      gradeDetected: '1',
      status: 'VALIDATED',
      rowTotal: 100,
      rowValid: 95,
      rowError: 5,
      issues: mockIssues,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportPreviewComponent);
    component = fixture.componentInstance;
    component.jobId = 'test-job-123';
    component.issues = mockIssues;
    component.files = mockFiles;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Filtering', () => {
    it('should filter issues by severity', () => {
      component.selectedSeverityFilter = IssueSeverity.ERROR;
      component.applyFilters();

      expect(component.filteredIssues.length).toBe(2);
      expect(component.filteredIssues.every((i) => i.severity === IssueSeverity.ERROR)).toBe(true);
    });

    it('should filter issues by search term', () => {
      component.searchTerm = 'DNI';
      component.applyFilters();

      expect(component.filteredIssues.length).toBe(2);
      expect(component.filteredIssues.every((i) => i.message.includes('DNI'))).toBe(true);
    });

    it('should reset filters', () => {
      component.selectedSeverityFilter = IssueSeverity.ERROR;
      component.searchTerm = 'test';
      component.resetFilters();

      expect(component.selectedSeverityFilter).toBe('ALL');
      expect(component.searchTerm).toBe('');
      expect(component.filteredIssues.length).toBe(mockIssues.length);
    });

    it('should reset to page 1 when filters change', () => {
      component.currentPage = 3;
      component.applyFilters();

      expect(component.currentPage).toBe(1);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create more issues for pagination testing
      const manyIssues: ImportIssue[] = [];
      for (let i = 0; i < 25; i++) {
        manyIssues.push({
          id: `issue-${i}`,
          sheetName: 'Hoja1',
          rowNumber: i + 1,
          severity: i % 2 === 0 ? IssueSeverity.ERROR : IssueSeverity.WARNING,
          code: 'TEST_CODE',
          message: `Test message ${i}`,
        });
      }
      component.issues = manyIssues;
      component.pageSize = 10;
      component.applyFilters();
    });

    it('should calculate total pages correctly', () => {
      expect(component.getTotalPages()).toBe(3);
    });

    it('should get paginated issues for current page', () => {
      component.currentPage = 1;
      const paginated = component.getPaginatedIssues();

      expect(paginated.length).toBe(10);
      expect(paginated[0].id).toBe('issue-0');
    });

    it('should navigate to next page', () => {
      component.currentPage = 1;
      component.nextPage();

      expect(component.currentPage).toBe(2);
    });

    it('should not navigate beyond last page', () => {
      component.currentPage = 3;
      component.nextPage();

      expect(component.currentPage).toBe(3);
    });

    it('should navigate to previous page', () => {
      component.currentPage = 2;
      component.previousPage();

      expect(component.currentPage).toBe(1);
    });

    it('should not navigate before first page', () => {
      component.currentPage = 1;
      component.previousPage();

      expect(component.currentPage).toBe(1);
    });

    it('should go to specific page', () => {
      component.goToPage(2);

      expect(component.currentPage).toBe(2);
    });

    it('should not go to invalid page', () => {
      component.currentPage = 1;
      component.goToPage(10);

      expect(component.currentPage).toBe(1);
    });

    it('should generate page numbers correctly', () => {
      const pages = component.getPageNumbers();

      expect(pages.length).toBeGreaterThan(0);
      expect(pages.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Row Expansion', () => {
    it('should toggle row expansion', () => {
      const issueId = 'issue-1';
      expect(component.isRowExpanded(issueId)).toBe(false);

      component.toggleRowExpansion(issueId);
      expect(component.isRowExpanded(issueId)).toBe(true);

      component.toggleRowExpansion(issueId);
      expect(component.isRowExpanded(issueId)).toBe(false);
    });

    it('should format payload correctly', () => {
      const payload = { test: 'value', number: 123 };
      const formatted = component.formatPayload(payload);

      expect(formatted).toContain('test');
      expect(formatted).toContain('value');
      expect(formatted).toContain('123');
    });

    it('should handle undefined payload', () => {
      const formatted = component.formatPayload(undefined);

      expect(formatted).toBe('Sin detalles adicionales');
    });
  });

  describe('Severity Badge', () => {
    it('should return correct class for ERROR severity', () => {
      const badgeClass = component.getSeverityBadgeClass(IssueSeverity.ERROR);

      expect(badgeClass).toBe('badge bg-danger');
    });

    it('should return correct class for WARNING severity', () => {
      const badgeClass = component.getSeverityBadgeClass(IssueSeverity.WARNING);

      expect(badgeClass).toBe('badge bg-warning text-dark');
    });

    it('should return correct icon for ERROR severity', () => {
      const icon = component.getSeverityIcon(IssueSeverity.ERROR);

      expect(icon).toBe('bi-x-circle-fill');
    });

    it('should return correct icon for WARNING severity', () => {
      const icon = component.getSeverityIcon(IssueSeverity.WARNING);

      expect(icon).toBe('bi-exclamation-triangle-fill');
    });
  });

  describe('Summary', () => {
    it('should calculate summary correctly', () => {
      component.applyFilters();
      const summary = component.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.errors).toBe(2);
      expect(summary.warnings).toBe(1);
    });
  });

  describe('File Name', () => {
    it('should get file name by ID', () => {
      const fileName = component.getFileName('file1');

      expect(fileName).toBe('estudiantes_2024.xlsx');
    });

    it('should return "Desconocido" for unknown file ID', () => {
      const fileName = component.getFileName('unknown');

      expect(fileName).toBe('Desconocido');
    });
  });

  describe('Export', () => {
    it('should emit download report event', () => {
      const emitSpy = spyOn(component.downloadReport, 'emit');

      component.onDownloadReport();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should export filtered issues to CSV', () => {
      // Mock document methods
      const mockLink = {
        setAttribute: jasmine.createSpy('setAttribute'),
        click: jasmine.createSpy('click'),
        style: { visibility: '' },
      } as any;

      const createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink);
      const appendChildSpy = spyOn(document.body, 'appendChild').and.callFake(() => mockLink);
      const removeChildSpy = spyOn(document.body, 'removeChild').and.callFake(() => mockLink);
      const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
      const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL').and.stub();

      component.exportFilteredToCSV();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });
  });

  describe('OnChanges', () => {
    it('should apply filters when issues change', () => {
      const applyFiltersSpy = spyOn(component, 'applyFilters');

      component.ngOnChanges({
        issues: {
          currentValue: mockIssues,
          previousValue: [],
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(applyFiltersSpy).toHaveBeenCalled();
    });

    it('should apply filters when files change', () => {
      const applyFiltersSpy = spyOn(component, 'applyFilters');

      component.ngOnChanges({
        files: {
          currentValue: mockFiles,
          previousValue: [],
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(applyFiltersSpy).toHaveBeenCalled();
    });
  });
});
