export * from './auth.model';
export * from './comunicado.model';
export * from './import.model';
export * from './landing.model';
export * from './public-query.model';
export * from './user-management.model';

// Attendance models with aliases to avoid conflicts
export { Shift, SessionStatus, AttendanceStatus } from './attendance.model';

export type {
  AttendanceSession,
  AttendanceRecord,
  CreateSessionDto,
  UpdateRecordDto,
  CloseSessionDto,
  SessionWithRecords,
  StudentWithRecord,
  SaveStatus,
  Student as AttendanceStudent,
  Enrollment as AttendanceEnrollment,
} from './attendance.model';

// Student models (primary exports)
export { EnrollmentStatus } from './student.model';

export type {
  Student,
  Enrollment,
  StudentFilters,
  CreateStudentDto,
  UpdateStudentDto,
  PaginationMeta,
  ApiResponse,
  ApiError,
} from './student.model';
