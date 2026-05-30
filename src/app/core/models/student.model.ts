import { Shift } from './attendance.model';

/**
 * Student models and types
 * Aligned with backend API types
 */

export interface Student {
  id: string;
  studentCode: string;
  dni?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName: string;
  thirdName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  enrollments?: Enrollment[];
}

export interface Enrollment {
  id: string;
  studentId: string;
  schoolYear: number;
  grade: number;
  section: string;
  shift?: Shift;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TRANSFERRED = 'TRANSFERRED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface StudentFilters {
  studentCode?: string;
  dni?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  schoolYear?: number;
  grade?: number;
  section?: string;
  shift?: Shift;
  enrollmentStatus?: EnrollmentStatus;
}

export interface CreateStudentDto {
  studentCode: string;
  dni?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName: string;
  thirdName?: string;
  grade?: number;
  section?: string;
  schoolYear?: number;
  shift?: Shift;
}

export interface UpdateStudentDto {
  dni?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  thirdName?: string;
  isActive?: boolean;
  grade?: number;
  section?: string;
  schoolYear?: number;
  shift?: Shift;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    traceId: string;
    timestamp: string;
    pagination?: PaginationMeta;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    traceId: string;
    timestamp: string;
  };
}
