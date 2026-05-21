/**
 * Public Query Models
 * Frontend types for public attendance queries
 */

import { AttendanceStatus } from './attendance.model';

export interface PublicAttendanceQueryRequest {
  studentCode: string;
  captchaToken: string;
}

export interface PublicAttendanceResult {
  studentCode: string;
  displayName: string;
  month: string;
  today: {
    status: AttendanceStatus;
    entryTime?: string;
    permission: boolean;
  };
  monthlySummary: {
    presentes: number;
    tardanzas: number;
    faltas: number;
    conPermiso: number;
    percentage: number;
  };
}

export interface RateLimitError {
  code: string;
  message: string;
  retryAfter?: number;
}
