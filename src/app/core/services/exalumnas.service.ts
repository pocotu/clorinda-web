import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExalumnaStory, StoryFilters, PaginatedStories } from '../models/exalumna.model';

@Injectable({
  providedIn: 'root',
})
export class ExalumnasService {
  private http = inject(HttpClient);
  private publicApiUrl = `${environment.apiUrl}/public/exalumnas`;
  private internalApiUrl = `${environment.apiUrl}/internal/exalumnas`;

  private unwrapData<T>(response: { data?: T } | T): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: T }).data as T;
    }
    return response as T;
  }

  private normalizePaginatedResponse(response: any): PaginatedStories {
    const data = response.data || [];
    const meta = response.meta || {};
    return {
      data,
      total: meta.total ?? data.length,
      page: meta.page ?? 1,
      pageSize: meta.pageSize ?? 10,
      totalPages: meta.totalPages ?? 1,
    };
  }

  /**
   * Get approved exalumna stories (public carousel)
   */
  getAprobadas(page: number = 1, pageSize: number = 10): Observable<PaginatedStories> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<any>(this.publicApiUrl, { params })
      .pipe(map((response) => this.normalizePaginatedResponse(response)));
  }

  /**
   * Submit an exalumna story (public submission form)
   */
  submitHistoria(description: string, photos: File[]): Observable<ExalumnaStory> {
    const formData = new FormData();
    formData.append('description', description);
    photos.forEach((file) => {
      formData.append('photos', file);
    });

    return this.http
      .post<any>(`${this.publicApiUrl}/submit`, formData)
      .pipe(map((response) => this.unwrapData<ExalumnaStory>(response)));
  }

  /**
   * Get all exalumna stories with filters (admin panel)
   */
  getTodasAdmin(filters: StoryFilters): Observable<PaginatedStories> {
    let params = new HttpParams();

    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    return this.http
      .get<any>(this.internalApiUrl, { params })
      .pipe(map((response) => this.normalizePaginatedResponse(response)));
  }

  /**
   * Approve a pending story (DIRECCION / ADMIN only)
   */
  aprobar(id: string): Observable<ExalumnaStory> {
    return this.http
      .patch<any>(`${this.internalApiUrl}/${id}/approve`, {})
      .pipe(map((response) => this.unwrapData<ExalumnaStory>(response)));
  }

  /**
   * Reject a pending story (DIRECCION / ADMIN only)
   */
  rechazar(id: string): Observable<ExalumnaStory> {
    return this.http
      .patch<any>(`${this.internalApiUrl}/${id}/reject`, {})
      .pipe(map((response) => this.unwrapData<ExalumnaStory>(response)));
  }

  /**
   * Delete a story (DIRECCION / ADMIN only)
   */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.internalApiUrl}/${id}`);
  }
}
