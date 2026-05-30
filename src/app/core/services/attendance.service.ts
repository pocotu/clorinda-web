import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AttendanceSession,
  CreateSessionDto,
  UpdateRecordDto,
  CloseSessionDto,
  SessionWithRecords,
  AttendanceRecord,
  Student,
} from '../models/attendance.model';
import { environment } from '../../../environments/environment';

/**
 * Attendance Service
 * Handles all attendance-related API calls
 */
@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/internal/attendance`;
  private readonly studentsApiUrl = `${environment.apiUrl}/internal/students`;

  /**
   * Get attendance sessions with optional filters
   */
  getSessions(filters?: {
    sessionDate?: string;
    shift?: string;
    grade?: number;
    section?: string;
    status?: string;
  }): Observable<{ data: AttendanceSession[] }> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params = params.set(key, value);
        }
      });
    }
    return this.http.get<{ data: AttendanceSession[] }>(`${this.apiUrl}/sessions`, { params });
  }

  /**
   * Get a single session with all records
   * Calls GET /api/internal/attendance/sessions/:id
   */
  getSessionWithRecords(sessionId: string): Observable<{ data: SessionWithRecords }> {
    return this.http.get<{ data: SessionWithRecords }>(`${this.apiUrl}/sessions/${sessionId}`);
  }

  /**
   * Create a new attendance session
   */
  createSession(data: CreateSessionDto): Observable<{ data: AttendanceSession }> {
    return this.http.post<{ data: AttendanceSession }>(`${this.apiUrl}/sessions`, data);
  }

  /**
   * Update an attendance record
   */
  updateRecord(recordId: string, data: UpdateRecordDto): Observable<{ data: AttendanceRecord }> {
    return this.http.patch<{ data: AttendanceRecord }>(`${this.apiUrl}/records/${recordId}`, data);
  }

  /**
   * Create an attendance record
   */
  createRecord(data: {
    recordId?: string;
    sessionId: string;
    studentId: string;
    status: string;
    entryTime?: string;
    permissionNote?: string;
    observation?: string;
  }): Observable<{ data: AttendanceRecord }> {
    const { recordId: _recordId, ...payload } = data;
    return this.http.post<{ data: AttendanceRecord }>(`${this.apiUrl}/records`, payload);
  }

  /**
   * Close an attendance session
   */
  closeSession(sessionId: string, data: CloseSessionDto): Observable<{ data: AttendanceSession }> {
    return this.http.post<{ data: AttendanceSession }>(
      `${this.apiUrl}/sessions/${sessionId}/close`,
      data
    );
  }

  /**
   * Get students by section for current school year
   */
  getStudentsBySection(
    grade: number | undefined,
    section: string,
    schoolYear: number,
    options?: { includeGrade?: boolean }
  ): Observable<{ data: Student[] }> {
    let params = new HttpParams().set('section', section).set('schoolYear', schoolYear.toString());
    const includeGrade = options?.includeGrade !== false;
    if (includeGrade && grade !== undefined && grade !== null) {
      params = params.set('grade', grade.toString());
    }
    return this.http.get<{ data: Student[] }>(this.studentsApiUrl, { params });
  }

  /**
   * Get attendance history with filters
   */
  getHistory(filters?: {
    grade?: number;
    section?: string;
    shift?: string;
    month?: number;
    year?: number;
    page?: number;
    pageSize?: number;
  }): Observable<{
    data: AttendanceSession[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<{
      data: AttendanceSession[];
      meta: { total: number; page: number; pageSize: number; totalPages: number };
    }>(`${this.apiUrl}/history`, { params });
  }
}
