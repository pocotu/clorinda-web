/**
 * Attendance Models
 * Frontend types for attendance management
 */

export enum Shift {
  MANANA = 'MANANA',
  TARDE = 'TARDE',
  NOCHE = 'NOCHE',
}

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum AttendanceStatus {
  PRESENTE = 'PRESENTE',
  FALTA = 'FALTA',
  TARDANZA = 'TARDANZA',
  CON_PERMISO = 'CON_PERMISO',
  FERIADO = 'FERIADO',
}

export interface AttendanceSession {
  id: string;
  sessionDate: string;
  shift: Shift;
  grade: number;
  section: string;
  status: SessionStatus;
  openedByUserId: string;
  closedByUserId?: string;
  openedAt: string;
  closedAt?: string;
  closeReason?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields from backend
  closedBy?: {
    id: string;
    username: string;
    role?: string;
  };
  openedBy?: {
    id: string;
    username: string;
  };
  postCloseEditCount?: number;
  lastModifiedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  entryTime?: string;
  permissionNote?: string;
  observation?: string;
  updatedByUserId: string;
  updatedAt: string;
  createdAt: string;
}

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
  enrollments?: Enrollment[];
}

export interface Enrollment {
  id: string;
  studentId: string;
  schoolYear: number;
  grade: number;
  section: string;
  status: string;
}

export interface CreateSessionDto {
  sessionDate: string;
  shift: Shift;
  grade: number;
  section: string;
}

export interface UpdateRecordDto {
  status: AttendanceStatus;
  entryTime?: string;
  permissionNote?: string;
  observation?: string;
}

export interface CloseSessionDto {
  reason: string;
}

export interface SessionWithRecords extends AttendanceSession {
  records: AttendanceRecord[];
}

export interface StudentWithRecord {
  student: Student;
  record?: AttendanceRecord;
}

export interface SaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
}
