import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map, filter, take } from 'rxjs/operators';

import { AuthResponse, LoginRequest, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'current_user';
  private readonly storageMode = environment.authStorage ?? 'session';
  private readonly memoryStore: Record<string, string> = {};

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  // Signal-based state management
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Computed signal for authentication status
  private userSignal = signal<User | null>(this.getUserFromStorage());
  public isAuthenticated = computed(() => this.userSignal() !== null);

  constructor() {
    // Initialize user signal from storage
    const storedUser = this.getUserFromStorage();
    if (storedUser) {
      this.userSignal.set(storedUser);
      this.currentUserSubject.next(storedUser);
    }
  }

  /**
   * Login user with username and password
   * Calls POST /api/auth/login
   * @param username - User's username
   * @param password - User's password
   * @returns Observable<AuthResponse>
   */
  login(username: string, password: string): Observable<AuthResponse> {
    const loginRequest: LoginRequest = { username, password };

    return this.http
      .post<{ data: AuthResponse; meta: unknown }>(`${this.API_URL}/login`, loginRequest)
      .pipe(
        map((envelope) => envelope.data),
        tap((response) => {
          // Store tokens and user data
          this.storeAuthData(response);

          // Update signals and subjects
          this.userSignal.set(response.user);
          this.currentUserSubject.next(response.user);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Logout current user
   * Calls POST /api/auth/logout
   * @returns Observable<void>
   */
  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();

    return this.http.post<void>(`${this.API_URL}/logout`, { refreshToken }).pipe(
      tap(() => {
        this.clearAuthData();
      }),
      catchError((error) => {
        // Even if logout fails on server, clear local data
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh access token using refresh token
   * Calls POST /api/auth/refresh
   * @returns Observable<AuthResponse>
   */
  refresh(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<{ data: AuthResponse; meta: unknown }>(`${this.API_URL}/refresh`, { refreshToken })
      .pipe(
        map((envelope) => envelope.data),
        tap((response) => {
          // Update tokens and user data
          this.storeAuthData(response);

          // Update signals and subjects
          this.userSignal.set(response.user);
          this.currentUserSubject.next(response.user);
        }),
        catchError((error) => {
          // If refresh fails, clear auth data
          this.clearAuthData();
          return throwError(() => error);
        })
      );
  }

  /**
   * Refreshes the token and handles parallel requests using a BehaviorSubject queue
   */
  refreshAccessToken(): Observable<string> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1)
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.refresh().pipe(
      map((response) => response.accessToken),
      tap((token) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(token);
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  /**
   * Check if user is authenticated
   * @returns boolean - true if user has valid session
   */
  isAuthenticatedSync(): boolean {
    const token = this.getAccessToken();
    const user = this.getCurrentUser();

    if (!token || !user) {
      return false;
    }

    // Check if token is expired
    return !this.isTokenExpired(token);
  }

  /**
   * Get current authenticated user
   * @returns User | null
   */
  getCurrentUser(): User | null {
    return this.userSignal();
  }

  /**
   * Get access token from storage
   * @returns string | null
   */
  getAccessToken(): string | null {
    return this.getStorageItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token from storage
   * @returns string | null
   */
  getRefreshToken(): string | null {
    return this.getStorageItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Store authentication data in session storage (or memory fallback)
   * @param response - AuthResponse from login/refresh
   */
  private storeAuthData(response: AuthResponse): void {
    this.setStorageItem(this.ACCESS_TOKEN_KEY, response.accessToken);
    this.setStorageItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    this.setStorageItem(this.USER_KEY, JSON.stringify(response.user));
  }

  /**
   * Clear all authentication data from storage
   */
  private clearAuthData(): void {
    this.removeStorageItem(this.ACCESS_TOKEN_KEY);
    this.removeStorageItem(this.REFRESH_TOKEN_KEY);
    this.removeStorageItem(this.USER_KEY);

    // Reset signals and subjects
    this.userSignal.set(null);
    this.currentUserSubject.next(null);
  }

  /**
   * Get user from session storage (or memory fallback)
   * @returns User | null
   */
  private getUserFromStorage(): User | null {
    const userJson = this.getStorageItem(this.USER_KEY);
    if (!userJson) {
      return null;
    }

    try {
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('Error parsing user from storage:', error);
      return null;
    }
  }

  /**
   * Check if JWT token is expired
   * @param token - JWT token string
   * @returns boolean - true if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      // Check if token expiration time has passed
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      return currentTime >= expirationTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Decode JWT token payload
   * @param token - JWT token string
   * @returns any - Decoded token payload
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      let payload = parts[1];
      // Convert base64url to base64 format
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Add necessary padding if missing
      const pad = payload.length % 4;
      if (pad) {
        payload += '='.repeat(4 - pad);
      }

      const decoded =
        typeof atob === 'function'
          ? atob(payload)
          : typeof (globalThis as any).Buffer !== 'undefined'
            ? (globalThis as any).Buffer.from(payload, 'base64').toString('utf-8')
            : '';
      if (!decoded) {
        throw new Error('Token decoding not supported');
      }
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Handle HTTP errors
   * @param error - HttpErrorResponse
   * @returns Observable<never>
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.error?.message || error.message || 'Server error';
    }

    console.error('AuthService error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  private getStorageItem(key: string): string | null {
    const storage = this.getStorage();
    if (storage) {
      return storage.getItem(key);
    }
    return this.getMemoryItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(key, value);
      return;
    }
    this.setMemoryItem(key, value);
  }

  private removeStorageItem(key: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(key);
    }
    this.removeMemoryItem(key);
  }

  private getStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId) || this.storageMode === 'memory') {
      return null;
    }
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  }

  private getMemoryItem(key: string): string | null {
    return this.memoryStore[key] ?? null;
  }

  private setMemoryItem(key: string, value: string): void {
    this.memoryStore[key] = value;
  }

  private removeMemoryItem(key: string): void {
    delete this.memoryStore[key];
  }
}
