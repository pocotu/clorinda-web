import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ImportService } from '../../../core/services/import.service';
import {
  ValidationResult,
  ImportResult,
  SelectedFile,
  ImportIssue,
  IssueSeverity,
  FileValidationResult,
} from '../../../core/models/import.model';

/**
 * ImportWizardComponent
 * 4-step wizard for student import: Upload → Validate → Preview → Confirm
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.7, 4.8
 * Task 17.4.3: Stepper with guided navigation
 */
@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-wizard.component.html',
  styleUrls: ['./import-wizard.component.css'],
})
export class ImportWizardComponent implements OnInit, OnDestroy {
  private readonly importService = inject(ImportService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);
  private readonly destroy$ = new Subject<void>();

  // Wizard state
  currentStep = 1;
  readonly totalSteps = 4;
  showInfoModal = false;

  // Step 1: Upload
  selectedFiles: SelectedFile[] = [];
  isDragging = false;
  uploadError: string | null = null;
  uploading = false;
  /** Turno seleccionado para todos los estudiantes del lote */
  selectedShift: 'MANANA' | 'TARDE' | 'NOCHE' | null = null;

  // Step 2: Validate
  validating = false;
  validationResult: ValidationResult | null = null;
  validationError: string | null = null;

  // Step 3: Preview
  filteredIssues: ImportIssue[] = [];
  selectedSeverityFilter: IssueSeverity | 'ALL' = 'ALL';
  selectedFileFilter = 'ALL';
  currentPage = 1;
  pageSize = 10;

  // Step 4: Confirm
  confirming = false;
  importResult: ImportResult | null = null;
  confirmError: string | null = null;

  // Job ID
  jobId: string | null = null;

  // Enums for template
  readonly IssueSeverity = IssueSeverity;

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== Step 1: Upload ====================

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Add files to selection with validation
   * Requirement 4.1: Validate extension and size
   */
  private addFiles(files: File[]): void {
    this.uploadError = null;

    for (const file of files) {
      // Validate file extension
      const validExtensions = ['.xlsx', '.csv'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        this.uploadError = `Archivo "${file.name}" tiene extensión inválida. Solo se aceptan archivos .xlsx y .csv`;
        continue;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.uploadError = `Archivo "${file.name}" excede el tamaño máximo de 10MB`;
        continue;
      }

      // Check if file already selected
      const isDuplicate = this.selectedFiles.some((sf) => sf.name === file.name);
      if (isDuplicate) {
        this.uploadError = `Archivo "${file.name}" ya está seleccionado`;
        continue;
      }

      // Add file to selection
      const selectedFile: SelectedFile = {
        file,
        id: this.generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
      };

      this.selectedFiles.push(selectedFile);
    }
  }

  /**
   * Remove file from selection
   */
  removeFile(fileId: string): void {
    this.selectedFiles = this.selectedFiles.filter((f) => f.id !== fileId);
    this.uploadError = null;
  }

  /**
   * Upload files to server
   * Requirement 4.1, 4.2
   */
  uploadFiles(): void {
    if (this.selectedFiles.length === 0) {
      this.uploadError = 'Debe seleccionar al menos un archivo';
      return;
    }

    this.uploading = true;
    this.uploadError = null;

    const files = this.selectedFiles.map((sf) => sf.file);

    if (!this.selectedShift) {
      this.uploadError = 'Debe seleccionar el turno antes de continuar';
      this.uploading = false;
      return;
    }

    const uploadRequest$ = this.importService.uploadFiles(files, this.selectedShift);
    if (!uploadRequest$) {
      this.uploading = false;
      this.uploadError = 'Error al subir archivos';
      return;
    }

    uploadRequest$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.jobId = response.data.jobId;
        this.uploading = false;
        // Automatically move to step 2 and start validation
        this.currentStep = 2;
        this.startValidation();
      },
      error: (error) => {
        this.uploading = false;
        this.uploadError = error.error?.error?.message || 'Error al subir archivos';
      },
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // ==================== Step 2: Validate ====================

  /**
   * Start validation process
   * Requirement 4.2, 4.3
   */
  private startValidation(): void {
    if (!this.jobId) {
      return;
    }

    this.validating = true;
    this.validationError = null;

    const validationRequest$ = this.importService.validateJob(this.jobId);
    if (!validationRequest$) {
      this.validating = false;
      this.validationError = 'Error al validar archivos';
      return;
    }

    validationRequest$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.validationResult = response.data;
        this.validating = false;
        // Prepare issues for preview
        this.prepareIssuesForPreview();
      },
      error: (error) => {
        this.validating = false;
        this.validationError = error.error?.error?.message || 'Error al validar archivos';
      },
    });
  }

  /**
   * Check if can continue to preview
   */
  canContinueToPreview(): boolean {
    return this.validationResult !== null && !this.validating;
  }

  /**
   * Move to preview step
   */
  goToPreview(): void {
    if (this.canContinueToPreview()) {
      this.currentStep = 3;
    }
  }

  /**
   * Prepare issues for preview with filtering
   */
  private prepareIssuesForPreview(): void {
    if (!this.validationResult) {
      return;
    }

    // Collect all issues from all files
    const allIssues: ImportIssue[] = [];
    for (const file of this.validationResult.files) {
      const fileIssues = file.issues.map((issue) => ({
        ...issue,
        fileId: file.fileId,
      }));
      allIssues.push(...fileIssues);
    }

    this.filteredIssues = allIssues;
    this.applyFilters();
  }

  /**
   * Apply severity and file filters
   */
  applyFilters(): void {
    if (!this.validationResult) {
      return;
    }

    let issues: ImportIssue[] = [];

    // Collect issues from selected file or all files
    if (this.selectedFileFilter === 'ALL') {
      for (const file of this.validationResult.files) {
        const fileIssues = file.issues.map((issue) => ({
          ...issue,
          fileId: file.fileId,
        }));
        issues.push(...fileIssues);
      }
    } else {
      const selectedFile = this.validationResult.files.find(
        (f) => f.fileId === this.selectedFileFilter
      );
      if (selectedFile) {
        issues = selectedFile.issues.map((issue) => ({
          ...issue,
          fileId: selectedFile.fileId,
        }));
      }
    }

    // Apply severity filter
    if (this.selectedSeverityFilter !== 'ALL') {
      issues = issues.filter((issue) => issue.severity === this.selectedSeverityFilter);
    }

    this.filteredIssues = issues;
    this.currentPage = 1; // Reset to first page
  }

  /**
   * Get paginated issues
   */
  getPaginatedIssues(): ImportIssue[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredIssues.slice(startIndex, endIndex);
  }

  /**
   * Get total pages
   */
  getTotalPages(): number {
    return Math.ceil(this.filteredIssues.length / this.pageSize);
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  /**
   * Get file name by file ID
   */
  getFileName(fileId: string): string {
    if (!this.validationResult) {
      return '';
    }
    const file = this.validationResult.files.find((f) => f.fileId === fileId);
    return file?.fileName || '';
  }

  /**
   * Download error report as CSV
   * Requirement 4.3
   */
  downloadErrorReport(): void {
    if (!this.validationResult) {
      return;
    }

    const csvRows: string[] = [];
    csvRows.push('Archivo,Hoja,Fila,Severidad,Código,Mensaje');

    for (const file of this.validationResult.files) {
      for (const issue of file.issues) {
        const row = [
          file.fileName,
          issue.sheetName,
          issue.rowNumber.toString(),
          issue.severity,
          issue.code,
          `"${issue.message.replace(/"/g, '""')}"`, // Escape quotes
        ];
        csvRows.push(row.join(','));
      }
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `errores_importacion_${this.jobId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Check if can confirm import
   * Requirement 4.3
   */
  canConfirmImport(): boolean {
    return this.validationResult?.canConfirm === true;
  }

  /**
   * Move to confirm step
   */
  goToConfirm(): void {
    if (this.canConfirmImport()) {
      this.currentStep = 4;
      this.startImport();
    }
  }

  // ==================== Step 4: Confirm ====================

  /**
   * Start import process
   * Requirement 4.5, 4.7, 4.8
   */
  private startImport(): void {
    if (!this.jobId) {
      return;
    }

    this.confirming = true;
    this.confirmError = null;

    const confirmRequest$ = this.importService.confirmImport(this.jobId);
    if (!confirmRequest$) {
      this.confirming = false;
      this.confirmError = 'Error al confirmar importación';
      return;
    }

    confirmRequest$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.importResult = response.data;
        this.confirming = false;
      },
      error: (error) => {
        this.confirming = false;
        this.confirmError = error.error?.error?.message || 'Error al confirmar importación';
      },
    });
  }

  /**
   * Download final report
   * Requirement 4.8
   */
  downloadFinalReport(): void {
    if (!this.importResult || !this.validationResult) {
      return;
    }

    const csvRows: string[] = [];
    csvRows.push('Resumen de Importación');
    csvRows.push('');
    csvRows.push('Total de filas,' + this.importResult.summary.totalRows);
    csvRows.push('Insertados,' + this.importResult.summary.inserted);
    csvRows.push('Rechazados,' + this.importResult.summary.rejected);
    csvRows.push('Duración (ms),' + this.importResult.summary.durationMs);
    csvRows.push('');
    csvRows.push('Detalle de Archivos');
    csvRows.push('Archivo,Total Filas,Filas Válidas,Errores');

    for (const file of this.validationResult.files) {
      const row = [file.fileName, file.rowTotal, file.rowValid, file.rowError];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_final_${this.jobId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Start new import
   */
  startNewImport(): void {
    // Reset all state
    this.currentStep = 1;
    this.selectedFiles = [];
    this.uploadError = null;
    this.validationResult = null;
    this.importResult = null;
    this.jobId = null;
    this.filteredIssues = [];
    this.selectedSeverityFilter = 'ALL';
    this.selectedFileFilter = 'ALL';
    this.currentPage = 1;
    this.selectedShift = null;
  }

  /**
   * Navigate back to student list
   */
  goToStudentList(): void {
    this.router.navigate(['/estudiantes']);
  }

  // ==================== Utilities ====================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get step title
   */
  getStepTitle(step: number): string {
    const titles = ['Subir Archivos', 'Validar', 'Previsualizar', 'Confirmar'];
    return titles[step - 1] || '';
  }

  /**
   * Check if step is active
   */
  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(step: number): boolean {
    return this.currentStep > step;
  }

  /**
   * Get severity badge class
   */
  getSeverityBadgeClass(severity: IssueSeverity): string {
    return severity === IssueSeverity.ERROR ? 'badge bg-danger' : 'badge bg-warning text-dark';
  }

  /**
   * Get available files for filter
   */
  getAvailableFiles(): FileValidationResult[] {
    return this.validationResult?.files || [];
  }

  // ==================== Navigation ====================

  /**
   * Check if can go to next step
   * Requirement 4.2: Disable forward navigation if step not complete
   */
  canGoNext(): boolean {
    switch (this.currentStep) {
      case 1:
        // Step 1: Must have files selected, shift selected and not uploading
        return this.selectedFiles.length > 0 && this.selectedShift !== null && !this.uploading;
      case 2:
        // Step 2: Validation must be complete
        return this.validationResult !== null && !this.validating;
      case 3:
        // Step 3: Can only proceed if validation passed (canConfirm = true)
        return this.canConfirmImport();
      case 4:
        // Step 4: Final step, no next
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if can go to previous step
   */
  canGoPrevious(): boolean {
    // Cannot go back from step 1
    // Cannot go back during async operations
    return this.currentStep > 1 && !this.uploading && !this.validating && !this.confirming;
  }

  /**
   * Go to next step
   * Requirement 4.2: Navigate forward with validation
   */
  goNext(): void {
    if (!this.canGoNext()) {
      return;
    }

    switch (this.currentStep) {
      case 1:
        // Upload files and move to validation
        this.uploadFiles();
        break;
      case 2:
        // Move to preview
        this.goToPreview();
        break;
      case 3:
        // Move to confirm and start import
        this.goToConfirm();
        break;
    }
  }

  /**
   * Go to previous step
   * Requirement 4.2: Navigate backward
   */
  goPrevious(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    switch (this.currentStep) {
      case 2:
        // Go back to upload (reset validation)
        this.currentStep = 1;
        this.validationResult = null;
        this.validationError = null;
        break;
      case 3:
        // Go back to validation
        this.currentStep = 2;
        break;
      case 4:
        // Cannot go back from final step
        break;
    }
  }

  /**
   * Cancel wizard with confirmation
   * Requirement 4.2: Confirmation before canceling process
   */
  async cancelWizard(): Promise<void> {
    // If on final step with successful import, no confirmation needed
    if (this.currentStep === 4 && this.importResult) {
      this.goToStudentList();
      return;
    }

    // If no work has been done, no confirmation needed
    if (this.currentStep === 1 && this.selectedFiles.length === 0) {
      this.goToStudentList();
      return;
    }

    // Show confirmation modal
    const confirmed = await this.showCancelConfirmation();
    if (confirmed) {
      this.goToStudentList();
    }
  }

  /**
   * Show cancel confirmation modal
   * Returns true if user confirms cancellation
   */
  private showCancelConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmed = confirm(
        '¿Está seguro que desea cancelar el proceso de importación?\n\n' +
          'Se perderá todo el progreso actual y deberá comenzar nuevamente.'
      );
      resolve(confirmed);
    });
  }

  /**
   * Get button label for next action
   */
  getNextButtonLabel(): string {
    switch (this.currentStep) {
      case 1:
        return this.uploading ? 'Subiendo...' : 'Siguiente';
      case 2:
        return 'Siguiente';
      case 3:
        return 'Confirmar Importación';
      default:
        return 'Siguiente';
    }
  }

  /**
   * Get button icon for next action
   */
  getNextButtonIcon(): string {
    switch (this.currentStep) {
      case 1:
        return this.uploading ? '' : 'bi-arrow-right';
      case 2:
        return 'bi-arrow-right';
      case 3:
        return 'bi-check-circle';
      default:
        return 'bi-arrow-right';
    }
  }
}
