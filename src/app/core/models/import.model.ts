/**
 * Import Models
 * Type definitions for student import functionality
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.7, 4.8
 */

/**
 * Import job status
 */
export enum ImportJobStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  CONFIRMING = 'CONFIRMING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Issue severity levels
 */
export enum IssueSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

/**
 * Result of file upload operation
 */
export interface UploadResult {
  jobId: string;
  fileCount: number;
  status: ImportJobStatus;
}

/**
 * Validation result for an import job
 */
export interface ValidationResult {
  jobId: string;
  status: ImportJobStatus;
  canConfirm: boolean;
  summary: {
    totalFiles: number;
    totalRows: number;
    validRows: number;
    warnings: number;
    errors: number;
  };
  files: FileValidationResult[];
}

/**
 * Validation result for a single file
 */
export interface FileValidationResult {
  fileId: string;
  fileName: string;
  gradeDetected?: string;
  status: string;
  rowTotal: number;
  rowValid: number;
  rowError: number;
  issues: ImportIssue[];
}

/**
 * Import issue (error or warning)
 */
export interface ImportIssue {
  id: string;
  sheetName: string;
  rowNumber: number;
  severity: IssueSeverity;
  code: string;
  message: string;
  payload?: Record<string, unknown>;
  fileId?: string;
}

/**
 * Result of import confirmation
 */
export interface ImportResult {
  jobId: string;
  status: ImportJobStatus;
  summary: {
    totalRows: number;
    inserted: number;
    updated?: number;
    rejected: number;
    durationMs: number;
  };
}

/**
 * Import report
 */
export interface ImportReport {
  jobId: string;
  status: ImportJobStatus;
  summary: {
    totalFiles: number;
    totalRows: number;
    validRows: number;
    warnings: number;
    errors: number;
    inserted?: number;
    rejected?: number;
    durationMs?: number;
  };
  files: FileValidationResult[];
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    traceId: string;
    timestamp: string;
  };
}

/**
 * Selected file for upload
 */
export interface SelectedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
}
