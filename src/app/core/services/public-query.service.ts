import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PublicAttendanceQueryRequest, PublicAttendanceResult } from '../models/public-query.model';

/**
 * Public Query Service
 * Handles public attendance queries without authentication
 */
@Injectable({
  providedIn: 'root',
})
export class PublicQueryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/public/attendance`;

  /**
   * Query attendance by student code
   * @param studentCode - Student code in format YYYYNNNN
   * @param captchaToken - CAPTCHA verification token
   * @returns Observable<PublicAttendanceResult>
   */
  queryAttendance(studentCode: string, captchaToken: string): Observable<PublicAttendanceResult> {
    const request: PublicAttendanceQueryRequest = {
      studentCode,
      captchaToken,
    };

    return this.http.post<{ data: PublicAttendanceResult }>(`${this.apiUrl}/query`, request).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   * @param error - HttpErrorResponse
   * @returns Observable<never>
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error al consultar la asistencia';

    if (error.error?.error) {
      const apiError = error.error.error;

      switch (apiError.code) {
        case 'STUDENT_CODE_INVALID_FORMAT':
          errorMessage =
            'El código ingresado debe tener formato YYYYNNNN (año de ingreso + correlativo)';
          break;
        case 'STUDENT_NOT_FOUND':
          errorMessage = 'No se encontró un estudiante con el código ingresado';
          break;
        case 'CAPTCHA_INVALID':
          errorMessage = 'La verificación CAPTCHA falló. Por favor, intenta nuevamente';
          break;
        case 'RATE_LIMIT_EXCEEDED': {
          const retryAfter = apiError.details?.retryAfter || 3600;
          const minutes = Math.ceil(retryAfter / 60);
          errorMessage = `Has excedido el límite de consultas (5 por hora). Por favor, intenta nuevamente en ${minutes} minutos`;
          break;
        }
        default:
          errorMessage = apiError.message || errorMessage;
      }
    } else if (error.status === 0) {
      errorMessage =
        'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet';
    } else if (error.status >= 500) {
      errorMessage = 'El servidor no está disponible en este momento. Por favor, intenta más tarde';
    }

    return throwError(() => new Error(errorMessage));
  }
}
