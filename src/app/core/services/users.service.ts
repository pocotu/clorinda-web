import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserListItem, CreateUserDto, ApiResponse } from '../models';

/**
 * UsersService
 * Handles all user management API operations
 */
@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/internal/users`;

  /**
   * Get all users in the system
   */
  getUsers(): Observable<ApiResponse<UserListItem[]>> {
    return this.http.get<ApiResponse<UserListItem[]>>(this.apiUrl);
  }

  /**
   * Create a new user
   */
  createUser(data: CreateUserDto): Observable<ApiResponse<UserListItem>> {
    return this.http.post<ApiResponse<UserListItem>>(this.apiUrl, data);
  }

  /**
   * Update a user's password
   */
  updatePassword(userId: string, password: string): Observable<ApiResponse<UserListItem>> {
    return this.http.patch<ApiResponse<UserListItem>>(`${this.apiUrl}/${userId}/password`, {
      password,
    });
  }

  /**
   * Toggle user active/inactive status
   */
  toggleActive(userId: string, isActive: boolean): Observable<ApiResponse<UserListItem>> {
    return this.http.patch<ApiResponse<UserListItem>>(`${this.apiUrl}/${userId}/status`, {
      isActive,
    });
  }
}
