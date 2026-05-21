import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ImportIssue,
  IssueSeverity,
  FileValidationResult,
} from '../../../core/models/import.model';

/**
 * ImportPreviewComponent
 * Reusable component for displaying import validation errors
 * Requirements: 4.3, 25.1, 25.2, 25.3
 *
 * Features:
 * - Display issues in a table with columns: Archivo, Hoja, Fila, Severidad, Código, Mensaje, Detalles
 * - Color-coded severity badges (red=ERROR, yellow=WARNING)
 * - Expandable rows to view full payload JSON
 * - Filters by severity and file
 * - Search functionality
 * - Pagination
 * - Export to CSV
 */
@Component({
  selector: 'app-import-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-preview.component.html',
  styleUrls: ['./import-preview.component.css'],
})
export class ImportPreviewComponent implements OnChanges {
  /**
   * Import job ID
   */
  @Input() jobId!: string;

  /**
   * List of all issues from validation
   */
  @Input() issues: ImportIssue[] = [];

  /**
   * List of files for filtering
   */
  @Input() files: FileValidationResult[] = [];

  /**
   * Pagination configuration
   */
  @Input() pageSize = 10;

  /**
   * Event emitted when download report is requested
   */
  @Output() downloadReport = new EventEmitter<void>();

  // Filtering state
  selectedSeverityFilter: IssueSeverity | 'ALL' = 'ALL';
  selectedFileFilter = 'ALL';
  searchTerm = '';

  // Pagination state
  currentPage = 1;
  filteredIssues: ImportIssue[] = [];

  // Expanded rows for payload viewing
  expandedRows = new Set<string>();

  // Enums for template
  readonly IssueSeverity = IssueSeverity;

  // Math for template
  readonly Math = Math;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issues'] || changes['files']) {
      this.applyFilters();
    }
  }

  /**
   * Apply all filters (severity, file, search)
   * Requirements: 25.1, 25.2
   */
  applyFilters(): void {
    let filtered = [...this.issues];

    // Apply severity filter
    if (this.selectedSeverityFilter !== 'ALL') {
      filtered = filtered.filter((issue) => issue.severity === this.selectedSeverityFilter);
    }

    // Apply file filter
    if (this.selectedFileFilter !== 'ALL') {
      // Note: We need to match issues to files by some criteria
      // Since ImportIssue doesn't have fileId, we'll need to enhance this
      // For now, we'll keep all issues if file filter is applied
      // This should be enhanced based on actual data structure
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.code.toLowerCase().includes(searchLower) ||
          issue.message.toLowerCase().includes(searchLower) ||
          issue.sheetName.toLowerCase().includes(searchLower)
      );
    }

    this.filteredIssues = filtered;
    this.currentPage = 1; // Reset to first page when filters change
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.selectedSeverityFilter = 'ALL';
    this.selectedFileFilter = 'ALL';
    this.searchTerm = '';
    this.applyFilters();
  }

  /**
   * Get paginated issues for current page
   */
  getPaginatedIssues(): ImportIssue[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredIssues.slice(startIndex, endIndex);
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    return Math.ceil(this.filteredIssues.length / this.pageSize);
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  /**
   * Get page numbers for pagination display
   */
  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const maxPagesToShow = 5;
    const pages: number[] = [];

    if (totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page and surrounding pages
      const halfRange = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfRange);
      const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      // Adjust if we're near the end
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  /**
   * Toggle row expansion to show/hide payload
   * Requirement: 4.3 - Expandir fila para ver payload JSON completo
   */
  toggleRowExpansion(issueId: string): void {
    if (this.expandedRows.has(issueId)) {
      this.expandedRows.delete(issueId);
    } else {
      this.expandedRows.add(issueId);
    }
  }

  /**
   * Check if row is expanded
   */
  isRowExpanded(issueId: string): boolean {
    return this.expandedRows.has(issueId);
  }

  /**
   * Get severity badge CSS class
   * Requirement: 4.3 - Badges de color según severidad (rojo=ERROR, amarillo=WARNING)
   */
  getSeverityBadgeClass(severity: IssueSeverity): string {
    return severity === IssueSeverity.ERROR ? 'badge bg-danger' : 'badge bg-warning text-dark';
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity: IssueSeverity): string {
    return severity === IssueSeverity.ERROR ? 'bi-x-circle-fill' : 'bi-exclamation-triangle-fill';
  }

  /**
   * Format payload JSON for display
   */
  formatPayload(payload: Record<string, unknown> | undefined): string {
    if (!payload) {
      return 'Sin detalles adicionales';
    }
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Get file name by file ID
   */
  getFileName(fileId: string): string {
    const file = this.files.find((f) => f.fileId === fileId);
    return file?.fileName || 'Desconocido';
  }

  /**
   * Request download report
   * Requirement: 4.3 - Exportar reporte
   */
  onDownloadReport(): void {
    this.downloadReport.emit();
  }

  /**
   * Export current filtered issues to CSV
   * Requirement: 25.3 - Exportación de errores
   */
  exportFilteredToCSV(): void {
    const csvRows: string[] = [];
    csvRows.push('Archivo,Hoja,Fila,Severidad,Código,Mensaje');

    for (const issue of this.filteredIssues) {
      const row = [
        'N/A', // File name would need to be mapped
        issue.sheetName,
        issue.rowNumber.toString(),
        issue.severity,
        issue.code,
        `"${issue.message.replace(/"/g, '""')}"`, // Escape quotes
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `errores_filtrados_${this.jobId}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    errors: number;
    warnings: number;
  } {
    return {
      total: this.filteredIssues.length,
      errors: this.filteredIssues.filter((i) => i.severity === IssueSeverity.ERROR).length,
      warnings: this.filteredIssues.filter((i) => i.severity === IssueSeverity.WARNING).length,
    };
  }
}
