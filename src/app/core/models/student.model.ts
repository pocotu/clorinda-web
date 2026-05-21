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
  thirdLastName?: string;
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
  enrollmentStatus?: EnrollmentStatus;
}

export interface CreateStudentDto {
  studentCode: string;
  dni?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName: string;
  thirdLastName?: string;
}

export interface UpdateStudentDto {
  dni?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  thirdLastName?: string;
  isActive?: boolean;
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
