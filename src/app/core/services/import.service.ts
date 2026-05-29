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
 * Handles all student import-related API calls
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.7, 4.8
 */
@Injectable({
  providedIn: 'root',
})
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/internal/students/import`;

  /**
   * Upload import files and create job
   * Requirement 4.1, 4.2
   */
  uploadFiles(
    files: File[],
    shift: 'MANANA' | 'TARDE' | 'NOCHE'
  ): Observable<ApiResponse<UploadResult>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('shift', shift);

    return this.http.post<ApiResponse<UploadResult>>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Validate import job and detect errors
   * Requirement 4.2, 4.3
   */
  validateJob(jobId: string): Observable<ApiResponse<ValidationResult>> {
    return this.http.post<ApiResponse<ValidationResult>>(`${this.apiUrl}/${jobId}/validate`, {});
  }

  /**
   * Confirm and execute import.
   * Files are sent again as a FormData fallback so the backend can recover
   * when its in-memory buffer store was cleared by a server restart (e.g. Render).
   * Requirement 4.5, 4.7, 4.8
   */
  confirmImport(
    jobId: string,
    files: File[],
    shift: 'MANANA' | 'TARDE' | 'NOCHE'
  ): Observable<ApiResponse<ImportResult>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('shift', shift);

    return this.http
      .post<ApiResponse<ImportResult>>(`${this.apiUrl}/${jobId}/confirm`, formData)
      .pipe(
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

                  (response.data as ImportResult & { inserted?: number }).inserted = inserted;
                  (response.data as ImportResult & { rejected?: number }).rejected = rejected;
                  (response.data as ImportResult & { updated?: number }).updated = updated;
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
