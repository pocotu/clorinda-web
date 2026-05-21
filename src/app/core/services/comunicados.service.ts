import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, timeout } from 'rxjs';
import { Comunicado } from '../models/comunicado.model';
import { LandingPost, PostType } from '../models/landing.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ComunicadosService {
  private apiUrl = `${environment.apiUrl}/landing/public/posts`;

  constructor(private http: HttpClient) {}

  /**
   * Get published landing posts from backend
   * Maps backend LandingPost to frontend Comunicado model
   */
  getComunicados(
    postType?: PostType,
    page: number = 1,
    pageSize: number = 10
  ): Observable<{
    comunicados: Comunicado[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());

    if (postType) {
      params = params.set('postType', postType);
    }

    return this.http
      .get<{
        data: LandingPost[];
        meta: { total: number; page: number; pageSize: number; totalPages: number };
      }>(this.apiUrl, { params })
      .pipe(
        // Prevent indefinite loading in UI when backend request hangs.
        timeout(8000),
        map((response) => ({
          comunicados: response.data.map((post) => this.mapLandingPostToComunicado(post)),
          total: response.meta.total,
          page: response.meta.page,
          pageSize: response.meta.pageSize,
          totalPages: response.meta.totalPages,
        })),
        catchError((error) => {
          console.error('Error fetching comunicados:', error);
          return of({ comunicados: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
        })
      );
  }

  /**
   * Get comunicados destacados (DESTACADO post type)
   */
  getComunicadosDestacados(): Observable<Comunicado[]> {
    return this.getComunicados('DESTACADO', 1, 10).pipe(map((response) => response.comunicados));
  }

  /**
   * Get comunicado by ID
   */
  getComunicadoPorId(id: string): Observable<Comunicado | undefined> {
    // For now, we'll fetch all and filter
    // In a real implementation, there should be a GET /api/public/landing/posts/:id endpoint
    return this.getComunicados(undefined, 1, 100).pipe(
      map((response) => response.comunicados.find((c) => c.id === id))
    );
  }

  /**
   * Map backend LandingPost to frontend Comunicado model
   */
  private mapLandingPostToComunicado(post: LandingPost): Comunicado {
    return {
      id: post.id,
      titulo: post.title,
      descripcion: post.summary || this.extractSummary(post.content),
      contenido: post.content,
      categoria: this.mapPostTypeToCategoria(post.postType),
      fecha: new Date(post.publishAt || post.createdAt),
      autor: post.publishedBy || post.createdBy,
      destacado: post.postType === 'DESTACADO',
      imagen: post.imageUrl,
    };
  }

  /**
   * Map backend PostType to frontend categoria
   */
  private mapPostTypeToCategoria(
    postType: PostType
  ): 'academico' | 'deportivo' | 'cultural' | 'administrativo' | 'apafa' {
    const mapping: Record<
      PostType,
      'academico' | 'deportivo' | 'cultural' | 'administrativo' | 'apafa'
    > = {
      COMUNICADO: 'academico',
      AVISO: 'administrativo',
      GALERIA: 'cultural',
      DESTACADO: 'academico',
    };
    return mapping[postType] || 'academico';
  }

  /**
   * Extract summary from content if not provided
   */
  private extractSummary(content: string, maxLength: number = 150): string {
    const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
  }
}
