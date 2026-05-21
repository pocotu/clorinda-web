import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Student,
  StudentFilters,
  CreateStudentDto,
  UpdateStudentDto,
  ApiResponse,
} from '../models/student.model';
import { environment } from '../../../environments/environment';

/**
 * StudentsService
 * Handles all student-related API calls
 * Requirements: 3.6
 */
@Injectable({
  providedIn: 'root',
})
export class StudentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/internal/students`;

  /**
   * Get list of students with optional filters and pagination
   * Requirement 3.6
   */
  getStudents(
    filters: StudentFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Observable<ApiResponse<Student[]>> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());

    if (filters.studentCode) {
      params = params.set('studentCode', filters.studentCode);
    }
    if (filters.dni) {
      params = params.set('dni', filters.dni);
    }
    if (filters.firstName) {
      params = params.set('firstName', filters.firstName);
    }
    if (filters.lastName) {
      params = params.set('lastName', filters.lastName);
    }
    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.schoolYear) {
      params = params.set('schoolYear', filters.schoolYear.toString());
    }
    if (filters.grade) {
      params = params.set('grade', filters.grade.toString());
    }
    if (filters.section) {
      params = params.set('section', filters.section);
    }
    if (filters.enrollmentStatus) {
      params = params.set('enrollmentStatus', filters.enrollmentStatus);
    }

    return this.http.get<ApiResponse<Student[]>>(this.apiUrl, { params });
  }

  /**
   * Get available grades and sections for a school year
   * @param schoolYear The school year to query (defaults to current year)
   */
  getAvailableGradesAndSections(
    schoolYear?: number
  ): Observable<{ data: { grades: number[]; sections: string[] } }> {
    let params = new HttpParams();
    if (schoolYear) {
      params = params.set('schoolYear', schoolYear.toString());
    }

    return this.http.get<{ data: { grades: number[]; sections: string[] } }>(
      `${this.apiUrl}/metadata`,
      { params }
    );
  }

  /**
   * Create a new student
   * Requirement 3.6
   */
  createStudent(data: CreateStudentDto): Observable<ApiResponse<Student>> {
    return this.http.post<ApiResponse<Student>>(this.apiUrl, data);
  }

  /**
   * Update an existing student
   * Requirement 3.6
   */
  updateStudent(studentId: string, data: UpdateStudentDto): Observable<ApiResponse<Student>> {
    return this.http.patch<ApiResponse<Student>>(`${this.apiUrl}/${studentId}`, data);
  }

  /**
   * Delete (soft delete) a student
   * Requirement 3.6
   */
  deleteStudent(studentId: string): Observable<ApiResponse<Student>> {
    return this.http.delete<ApiResponse<Student>>(`${this.apiUrl}/${studentId}`);
  }

  /**
   * Toggle student active status
   * Requirement 3.6
   */
  toggleStudentStatus(studentId: string, isActive: boolean): Observable<ApiResponse<Student>> {
    return this.updateStudent(studentId, { isActive });
  }
}
