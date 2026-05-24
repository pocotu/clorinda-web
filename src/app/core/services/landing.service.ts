import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LandingPost,
  UpdatePostDto,
  PublishPostDto,
  UnpublishPostDto,
  PostFilters,
  PaginatedPosts,
} from '../models/landing.model';

@Injectable({
  providedIn: 'root',
})
export class LandingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/landing/internal/posts`;
  private publicApiUrl = `${environment.apiUrl}/landing/public/posts`;
  private workflowEnabled = false;

  private unwrapData<T>(response: { data?: T } | T): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: T }).data as T;
    }
    return response as T;
  }

  private normalizePaginatedResponse(response: {
    data?: LandingPost[] | LandingPost;
    meta?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  }): PaginatedPosts {
    const total = response.total ?? response.meta?.total ?? 0;
    const page = response.page ?? response.meta?.page ?? 1;
    const pageSize = response.pageSize ?? response.meta?.pageSize ?? 10;
    const totalPages = response.totalPages ?? response.meta?.totalPages ?? 0;

    if (!('data' in response) && (response as LandingPost).id) {
      return {
        data: [response as LandingPost],
        total: 1,
        page: 1,
        pageSize: 1,
        totalPages: 1,
      };
    }

    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    if (response.data) {
      return {
        data: [response.data],
        total: total || 1,
        page,
        pageSize: pageSize || 1,
        totalPages: totalPages || 1,
      };
    }

    return {
      data: [],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get all posts with optional filters (internal)
   */
  getPosts(filters?: PostFilters): Observable<PaginatedPosts> {
    let params = new HttpParams();

    if (filters) {
      if (filters.postType) {
        params = params.set('postType', filters.postType);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http
      .get<{
        data: LandingPost[];
        meta?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
        total?: number;
        page?: number;
        pageSize?: number;
        totalPages?: number;
      }>(this.apiUrl, { params })
      .pipe(map((response) => this.normalizePaginatedResponse(response)));
  }

  /**
   * Get a single post by ID (internal)
   */
  getPostById(id: string): Observable<LandingPost> {
    return this.getPosts({ page: 1, pageSize: 200 }).pipe(
      map((response) => {
        const post = response.data.find((item) => item.id === id);
        if (!post) {
          throw new Error('Post no encontrado en listado interno');
        }
        return post;
      })
    );
  }

  /**
   * Create a new post (internal)
   */
  createPost(post: Partial<LandingPost>): Observable<LandingPost> {
    return this.http.post<{ data: LandingPost } | LandingPost>(this.apiUrl, post).pipe(
      map((response) => this.unwrapData<LandingPost>(response)),
      map((created) => {
        this.workflowEnabled = true;
        return created;
      })
    );
  }

  /**
   * Update an existing post (internal)
   */
  updatePost(id: string, _post: UpdatePostDto): Observable<LandingPost> {
    if (!this.workflowEnabled) {
      return throwError(() => new Error(`updatePost no soportado por backend actual. Post: ${id}`));
    }

    return this.http
      .patch<{ data: LandingPost } | LandingPost>(`${this.apiUrl}/${id}`, _post)
      .pipe(map((response) => this.unwrapData<LandingPost>(response)));
  }

  /**
   * Send post for approval (internal)
   */
  sendForApproval(id: string, _comment?: string): Observable<LandingPost> {
    if (!this.workflowEnabled) {
      return throwError(
        () => new Error(`sendForApproval no soportado por backend actual. Post: ${id}`)
      );
    }

    const body = _comment ? { comment: _comment } : {};
    return this.http
      .post<{ data: LandingPost } | LandingPost>(`${this.apiUrl}/${id}/send-approval`, body)
      .pipe(map((response) => this.unwrapData<LandingPost>(response)));
  }

  /**
   * Approve a post (internal - DIRECCION only)
   */
  approvePost(id: string, _comment?: string): Observable<LandingPost> {
    if (!this.workflowEnabled) {
      return throwError(
        () => new Error(`approvePost no soportado por backend actual. Post: ${id}`)
      );
    }

    const body = _comment ? { comment: _comment } : {};
    return this.http
      .post<{ data: LandingPost } | LandingPost>(`${this.apiUrl}/${id}/approve`, body)
      .pipe(map((response) => this.unwrapData<LandingPost>(response)));
  }

  /**
   * Reject a post (internal - DIRECCION only)
   */
  rejectPost(id: string, _comment: string): Observable<LandingPost> {
    if (!this.workflowEnabled) {
      return throwError(() => new Error(`rejectPost no soportado por backend actual. Post: ${id}`));
    }

    const body = _comment ? { comment: _comment } : {};
    return this.http
      .post<{ data: LandingPost } | LandingPost>(`${this.apiUrl}/${id}/reject`, body)
      .pipe(map((response) => this.unwrapData<LandingPost>(response)));
  }

  /**
   * Publish a post (internal - ADMIN or DIRECCION)
   */
  publishPost(id: string, publishAt?: string): Observable<LandingPost> {
    const body: PublishPostDto = publishAt ? { publishAt } : {};
    return this.http
      .post<{ data: LandingPost } | LandingPost>(`${this.apiUrl}/${id}/publish`, body)
      .pipe(map((response) => this.unwrapData<LandingPost>(response)));
  }

  /**
   * Unpublish a post (internal - ADMIN or DIRECCION)
   */
  unpublishPost(id: string, reason: string): Observable<LandingPost> {
    const body: UnpublishPostDto = { reason };
    return this.http
      .post<{ data: LandingPost } | LandingPost>(`${this.apiUrl}/${id}/unpublish`, body)
      .pipe(map((response) => this.unwrapData<LandingPost>(response)));
  }

  /**
   * Delete a post (internal - ADMIN only)
   */
  deletePost(id: string): Observable<void> {
    if (!this.workflowEnabled) {
      return throwError(() => new Error(`deletePost no soportado por backend actual. Post: ${id}`));
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get published posts (public)
   */
  getPublicPosts(filters?: PostFilters): Observable<PaginatedPosts> {
    let params = new HttpParams();

    if (filters) {
      if (filters.postType) {
        params = params.set('postType', filters.postType);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.pageSize) {
        params = params.set('pageSize', filters.pageSize.toString());
      }
    }

    return this.http
      .get<{
        data: LandingPost[];
        meta?: { total?: number; page?: number; pageSize?: number; totalPages?: number };
        total?: number;
        page?: number;
        pageSize?: number;
        totalPages?: number;
      }>(this.publicApiUrl, { params })
      .pipe(map((response) => this.normalizePaginatedResponse(response)));
  }

  /**
   * Get a single published post by ID (public)
   */
  getPublicPostById(id: string): Observable<LandingPost> {
    return this.getPublicPosts({ page: 1, pageSize: 200 }).pipe(
      map((response) => {
        const post = response.data.find((item) => item.id === id);
        if (!post) {
          throw new Error('Post publico no encontrado en listado');
        }
        return post;
      })
    );
  }

  /**
   * Upload an image file for a landing post
   */
  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<
        { data: { imageUrl: string } } | { imageUrl: string }
      >(`${environment.apiUrl}/landing/internal/posts/upload-image`, formData)
      .pipe(map((response) => this.unwrapData<{ imageUrl: string }>(response)));
  }
}
