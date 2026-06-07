import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UploadResult,
  ValidationResult,
  ImportResult,
  ImportReport,
  ApiResponse,
} from '../models/import.model';
import { environment } from '../../../environments/environment';

/**
 * ImportService
 *
 * Design Note: Only uploadFiles sends files (multipart). The validateJob and
 * confirmImport methods send simple JSON payloads — the backend recovers the
 * file buffers from the database, making the flow fully stateless and safe
 * against server restarts on platforms like Render.
 */
@Injectable({
  providedIn: 'root',
})
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/internal/students/import`;

  /**
   * Upload import files and create job (also persists buffers + shift to DB)
   * Requirement 4.1, 4.2
   */
  uploadFiles(
    files: File[],
    shift: 'MANANA' | 'TARDE' | 'NOCHE'
  ): Observable<ApiResponse<UploadResult>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('shift', shift);
    return this.http.post<ApiResponse<UploadResult>>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Trigger validation of an existing upload job.
   * No files are sent — the backend reconstructs them from the database.
   * Requirement 4.2, 4.3
   */
  validateJob(jobId: string): Observable<ApiResponse<ValidationResult>> {
    return this.http.post<ApiResponse<ValidationResult>>(`${this.apiUrl}/${jobId}/validate`, {});
  }

  /**
   * Confirm and execute the import.
   * No files are sent — the backend reconstructs them and the shift from the database.
   * Requirement 4.5, 4.7, 4.8
   */
  confirmImport(jobId: string): Observable<ApiResponse<ImportResult>> {
    return this.http.post<ApiResponse<ImportResult>>(`${this.apiUrl}/${jobId}/confirm`, {}).pipe(
      (source) =>
        new Observable<ApiResponse<ImportResult>>((subscriber) =>
          source.subscribe({
            next: (response) => {
              const summary = response.data?.summary;
              if (summary) {
                const inserted = summary.inserted ?? 0;
                const rejected = summary.rejected ?? 0;
                const totalRows = summary.totalRows ?? inserted + rejected;
                const updated = Math.max(0, totalRows - inserted - rejected);

                response.data.summary.inserted = inserted;
                response.data.summary.rejected = rejected;
                response.data.summary.updated = updated;
              }

              subscriber.next(response);
              subscriber.complete();
            },
            error: (error) => subscriber.error(error),
          })
        )
    );
  }

  /**
   * Get import job report
   * Requirement 4.7
   */
  getReport(jobId: string): Observable<ApiResponse<ImportReport>> {
    return this.http.get<ApiResponse<ImportReport>>(`${this.apiUrl}/${jobId}/report`);
  }
}
