import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { trigger, style, transition, animate } from '@angular/animations';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  switchMap,
  of,
  catchError,
} from 'rxjs';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Shift,
  SessionStatus,
  AttendanceStatus,
  AttendanceSession,
  AttendanceRecord,
  Student,
  StudentWithRecord,
  SaveStatus,
  UpdateRecordDto,
} from '../../../core/models/attendance.model';

/**
 * AttendanceSessionComponent
 * Manages daily attendance session: open session, mark attendance, close session
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1
 */
@Component({
  selector: 'app-attendance-session',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './attendance-session.component.html',
  styleUrls: ['./attendance-session.component.css'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' })),
      ]),
    ]),
  ],
})
export class AttendanceSessionComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly recordUpdates$ = new Subject<{ recordId: string; data: UpdateRecordDto }>();
  private readonly cdr = inject(ChangeDetectorRef);

  // Form groups
  sessionForm!: FormGroup;
  closeSessionForm!: FormGroup;

  // State
  currentSession: AttendanceSession | null = null;
  studentsWithRecords: StudentWithRecord[] = [];
  loading = false;
  error: string | null = null;
  saveStatus: SaveStatus = { status: 'idle' };
  showCloseModal = false;
  expandedStudentId: string | null = null;

  // Enums for template
  readonly Shift = Shift;
  readonly AttendanceStatus = AttendanceStatus;
  readonly shifts = Object.values(Shift);
  readonly attendanceStatuses = Object.values(AttendanceStatus);

  // Current school year
  readonly currentSchoolYear = new Date().getFullYear();

  grades: number[] = [];
  sections: string[] = [];

  ngOnInit(): void {
    this.initForms();
    this.setupAutoSave();
    this.loadMetadata();
  }

  /**
   * Load available grades and sections
   */
  private loadMetadata(): void {
    this.attendanceService['http']
      .get<{
        data: { grades: number[]; sections: string[] };
      }>(`${this.attendanceService['apiUrl'].replace('/attendance', '/students')}/metadata`)
      .subscribe({
        next: (response) => {
          this.grades = response.data.grades;
          this.sections = response.data.sections;
        },
        error: (err) => {
          console.error('Error loading metadata:', err);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize forms
   */
  private initForms(): void {
    // Session creation form
    this.sessionForm = this.fb.group({
      sessionDate: [this.getTodayDate(), Validators.required],
      shift: [Shift.MANANA, Validators.required],
      grade: ['', [Validators.required]],
      section: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
    });

    // Close session form
    this.closeSessionForm = this.fb.group({
      reason: ['', [Validators.required, Validators.maxLength(500)]],
    });
  }

  /**
   * Setup auto-save with debounce
   * Requirement: Guardar cambios automáticamente (debounce de 500ms)
   */
  private setupAutoSave(): void {
    this.recordUpdates$
      .pipe(
        debounceTime(500),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        switchMap(({ recordId, data }) => {
          this.saveStatus = { status: 'saving' };
          return this.attendanceService.updateRecord(recordId, data).pipe(
            catchError((err) => {
              this.saveStatus = {
                status: 'error',
                message: err.error?.error?.message || 'Error al guardar',
              };
              setTimeout(() => {
                this.saveStatus = { status: 'idle' };
              }, 3000);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          } // Error was handled in catchError
          this.saveStatus = { status: 'saved', message: 'Guardado exitosamente' };
          this.updateRecordInList(response.data);
          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.saveStatus.status === 'saved') {
              this.saveStatus = { status: 'idle' };
              this.cdr.detectChanges();
            }
          }, 2000);
        },
      });
  }

  /**
   * Open a new attendance session
   * Requirements: 5.1, 5.2
   */
  openSession(): void {
    if (this.sessionForm.invalid) {
      const gradeControl = this.sessionForm.get('grade');
      const sectionValue = this.sessionForm.get('section')?.value as string | undefined;
      if (!gradeControl?.value && sectionValue) {
        const derivedGrade = this.deriveGradeFromSection(sectionValue);
        if (derivedGrade !== null && gradeControl) {
          gradeControl.setValue(derivedGrade);
        }
      }

      if (this.sessionForm.invalid) {
        this.sessionForm.markAllAsTouched();
        return;
      }
    }

    this.loading = true;
    this.error = null;

    const formValue = this.sessionForm.value;
    this.attendanceService
      .createSession({
        sessionDate: formValue.sessionDate,
        shift: formValue.shift,
        grade: Number(formValue.grade),
        section: formValue.section,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.currentSession = response.data;
          this.loadStudentsForSession();
        },
        error: (err) => {
          if (err.status === 409) {
            // Session exists, fetch it instead
            this.attendanceService
              .getSessions({
                sessionDate: formValue.sessionDate,
                shift: formValue.shift,
                grade: formValue.grade,
                section: formValue.section,
              })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (res) => {
                  if (res.data && res.data.length > 0) {
                    this.currentSession = res.data[0];
                    this.error = null;
                    this.loadStudentsForSession();
                  } else {
                    this.loading = false;
                    this.error = 'La sesión existe pero no se pudo cargar.';
                    this.cdr.detectChanges();
                  }
                },
                error: () => {
                  this.loading = false;
                  this.error = 'Error al cargar la sesión existente.';
                  this.cdr.detectChanges();
                },
              });
          } else {
            this.loading = false;
            this.error =
              err?.error?.error?.message ||
              err?.message ||
              'Error al abrir sesión. Verifique que no exista una sesión duplicada.';
            this.cdr.detectChanges();
          }
        },
      });
  }

  private deriveGradeFromSection(section: string): number | null {
    const match = section.match(/(\d+)/);
    if (!match) {
      return null;
    }
    const grade = parseInt(match[1], 10);
    return Number.isNaN(grade) ? null : grade;
  }

  /**
   * Load students for the current session
   */
  private loadStudentsForSession(): void {
    if (!this.currentSession) {
      return;
    }

    this.attendanceService
      .getStudentsBySection(
        this.currentSession.grade,
        this.currentSession.section,
        this.currentSchoolYear,
        { includeGrade: false }
      )
      .pipe(
        switchMap((studentsResponse) => {
          const students = studentsResponse.data;
          // Get session with records
          return this.attendanceService.getSessionWithRecords(this.currentSession!.id).pipe(
            switchMap((sessionResponse) => {
              const records = sessionResponse.data.records;
              // Map students with their records
              this.studentsWithRecords = students.map((student) => ({
                student,
                record: records.find((r) => r.studentId === student.id),
              }));
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.error?.message || err?.message || 'Error al cargar estudiantes';
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Get student full name
   */
  getStudentFullName(student: Student): string {
    const names = [
      student.firstName,
      student.middleName,
      student.thirdName,
      student.lastName,
      student.secondLastName,
    ]
      .filter(Boolean)
      .join(' ');
    return names;
  }

  /**
   * Handle status change for a student
   * Requirements: 6.1, 6.2
   */
  onStatusChange(studentWithRecord: StudentWithRecord, newStatus: AttendanceStatus): void {
    if (!this.currentSession || this.currentSession.status === SessionStatus.CLOSED) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return;
    }

    const updateData: UpdateRecordDto = {
      status: newStatus,
      entryTime: undefined,
      permissionNote: undefined,
      observation: studentWithRecord.record?.observation,
    };

    // Clear conditional fields based on status
    if (newStatus !== AttendanceStatus.PRESENTE && newStatus !== AttendanceStatus.TARDANZA) {
      updateData.entryTime = undefined;
    } else if (studentWithRecord.record?.entryTime) {
      updateData.entryTime = studentWithRecord.record.entryTime;
    }

    if (newStatus !== AttendanceStatus.CON_PERMISO) {
      updateData.permissionNote = undefined;
    } else if (studentWithRecord.record?.permissionNote) {
      updateData.permissionNote = studentWithRecord.record.permissionNote;
    }

    if (studentWithRecord.record) {
      // Update existing record
      this.recordUpdates$.next({ recordId: studentWithRecord.record.id, data: updateData });
    } else {
      // Create new record
      this.createRecord(studentWithRecord.student.id, updateData);
    }
  }

  /**
   * Handle entry time change
   * Requirements: 6.3
   */
  onEntryTimeChange(studentWithRecord: StudentWithRecord, entryTime: string): void {
    if (!this.currentSession || !studentWithRecord.record) {
      return;
    }

    const updateData: UpdateRecordDto = {
      status: studentWithRecord.record.status,
      entryTime: entryTime || undefined,
      permissionNote: studentWithRecord.record.permissionNote,
      observation: studentWithRecord.record.observation,
    };

    this.recordUpdates$.next({ recordId: studentWithRecord.record.id, data: updateData });
  }

  /**
   * Handle permission note change
   * Requirements: 6.4
   */
  onPermissionNoteChange(studentWithRecord: StudentWithRecord, permissionNote: string): void {
    if (!this.currentSession || !studentWithRecord.record) {
      return;
    }

    const updateData: UpdateRecordDto = {
      status: studentWithRecord.record.status,
      entryTime: studentWithRecord.record.entryTime,
      permissionNote: permissionNote || undefined,
      observation: studentWithRecord.record.observation,
    };

    this.recordUpdates$.next({ recordId: studentWithRecord.record.id, data: updateData });
  }

  /**
   * Handle observation change
   * Requirements: 6.5
   */
  onObservationChange(studentWithRecord: StudentWithRecord, observation: string): void {
    if (!this.currentSession || !studentWithRecord.record) {
      return;
    }

    const updateData: UpdateRecordDto = {
      status: studentWithRecord.record.status,
      entryTime: studentWithRecord.record.entryTime,
      permissionNote: studentWithRecord.record.permissionNote,
      observation: observation || undefined,
    };

    this.recordUpdates$.next({ recordId: studentWithRecord.record.id, data: updateData });
  }

  /**
   * Create a new attendance record
   */
  private createRecord(studentId: string, data: UpdateRecordDto): void {
    if (!this.currentSession) {
      return;
    }

    this.saveStatus = { status: 'saving' };
    this.attendanceService
      .createRecord({
        sessionId: this.currentSession.id,
        studentId: studentId,
        status: data.status as string,
        entryTime: data.entryTime,
        permissionNote: data.permissionNote,
        observation: data.observation,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saveStatus = { status: 'saved', message: 'Guardado exitosamente' };

          // Find the student and assign the newly created record
          const index = this.studentsWithRecords.findIndex((swr) => swr.student.id === studentId);
          if (index !== -1) {
            this.studentsWithRecords[index].record = response.data;
          }

          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.saveStatus.status === 'saved') {
              this.saveStatus = { status: 'idle' };
              this.cdr.detectChanges();
            }
          }, 2000);
        },
        error: (err) => {
          this.saveStatus = {
            status: 'error',
            message: err.error?.error?.message || 'Error al guardar',
          };
          this.cdr.detectChanges();
          setTimeout(() => {
            this.saveStatus = { status: 'idle' };
            this.cdr.detectChanges();
          }, 3000);
        },
      });
  }

  /**
   * Update record in the local list
   */
  private updateRecordInList(updatedRecord: AttendanceRecord): void {
    const index = this.studentsWithRecords.findIndex((swr) => swr.record?.id === updatedRecord.id);
    if (index !== -1) {
      this.studentsWithRecords[index].record = updatedRecord;
    }
  }

  /**
   * Check if entry time field should be visible
   * Requirements: 6.3
   */
  shouldShowEntryTime(status: AttendanceStatus): boolean {
    return status === AttendanceStatus.PRESENTE || status === AttendanceStatus.TARDANZA;
  }

  /**
   * Check if permission note field should be visible
   * Requirements: 6.4
   */
  shouldShowPermissionNote(status: AttendanceStatus): boolean {
    return status === AttendanceStatus.CON_PERMISO;
  }

  /**
   * Show close session modal
   */
  openCloseModal(): void {
    this.showCloseModal = true;
    this.closeSessionForm.reset();
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    this.showCloseModal = false;
  }

  /**
   * Close the attendance session
   * Requirements: 7.1
   */
  closeSession(): void {
    if (this.closeSessionForm.invalid || !this.currentSession) {
      this.closeSessionForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    this.attendanceService
      .closeSession(this.currentSession.id, {
        reason: this.closeSessionForm.value.reason,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.currentSession = response.data;
          this.loading = false;
          this.showCloseModal = false;
          alert('Sesión cerrada exitosamente');
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error?.message || 'Error al cerrar sesión';
        },
      });
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Check if session is closed
   */
  isSessionClosed(): boolean {
    return this.currentSession?.status === SessionStatus.CLOSED;
  }

  /**
   * Get shift label in Spanish
   */
  getShiftLabel(shift: Shift): string {
    const labels: Record<Shift, string> = {
      [Shift.MANANA]: 'Mañana',
      [Shift.TARDE]: 'Tarde',
      [Shift.NOCHE]: 'Noche',
    };
    return labels[shift];
  }

  /**
   * Get status label in Spanish
   */
  getStatusLabel(status: AttendanceStatus): string {
    const labels: Record<AttendanceStatus, string> = {
      [AttendanceStatus.PRESENTE]: 'Presente',
      [AttendanceStatus.FALTA]: 'Falta',
      [AttendanceStatus.TARDANZA]: 'Tardanza',
      [AttendanceStatus.CON_PERMISO]: 'Con Permiso',
      [AttendanceStatus.FERIADO]: 'Feriado',
    };
    return labels[status];
  }

  /**
   * Toggle student card expansion
   * Mobile-first: Show options only when clicking student name
   */
  toggleStudentExpansion(studentId: string): void {
    if (this.isSessionClosed()) {
      return;
    }
    this.expandedStudentId = this.expandedStudentId === studentId ? null : studentId;
  }

  /**
   * Mark all students as present
   * Quick action for common scenario
   */
  markAllPresent(): void {
    if (!this.currentSession || this.isSessionClosed()) {
      return;
    }

    this.loading = true;
    this.saveStatus = { status: 'saving' };

    // Mark all students as present
    this.studentsWithRecords.forEach((studentWithRecord) => {
      if (!studentWithRecord.record) {
        // Create new record for students without one
        this.createRecord(studentWithRecord.student.id, {
          status: AttendanceStatus.PRESENTE,
          entryTime: undefined,
          permissionNote: undefined,
          observation: undefined,
        });
      } else if (studentWithRecord.record.status !== AttendanceStatus.PRESENTE) {
        // Update existing records
        const updateData: UpdateRecordDto = {
          status: AttendanceStatus.PRESENTE,
          entryTime: undefined,
          permissionNote: undefined,
          observation: studentWithRecord.record.observation,
        };
        this.recordUpdates$.next({ recordId: studentWithRecord.record.id, data: updateData });
      }
    });

    this.loading = false;
    this.saveStatus = { status: 'saved', message: 'Todos marcados como presentes' };
    setTimeout(() => {
      if (this.saveStatus.status === 'saved') {
        this.saveStatus = { status: 'idle' };
        this.cdr.detectChanges();
      }
    }, 2000);
  }
}
