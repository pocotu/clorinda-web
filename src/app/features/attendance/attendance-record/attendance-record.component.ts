import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AttendanceService } from '../../../core/services/attendance.service';
import {
  AttendanceStatus,
  AttendanceRecord,
  SessionStatus,
  UpdateRecordDto,
} from '../../../core/models/attendance.model';
import {
  timeFormatValidator,
  notFutureTimeValidator,
  observationMaxLengthValidator,
  permissionNoteMaxLengthValidator,
  getValidationErrorMessage,
} from '../../../shared/validators';

/**
 * AttendanceRecordComponent
 * Reusable component for editing individual attendance records
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 8.1, 8.2
 */
@Component({
  selector: 'app-attendance-record',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './attendance-record.component.html',
  styleUrls: ['./attendance-record.component.css'],
})
export class AttendanceRecordComponent implements OnInit, OnDestroy, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceService);
  private readonly destroy$ = new Subject<void>();

  // Props
  @Input({ required: true }) sessionId!: string;
  @Input({ required: true }) studentId!: string;
  @Input() currentRecord?: AttendanceRecord;
  @Input() sessionStatus: SessionStatus = SessionStatus.OPEN;
  @Input() sessionDate!: string;
  @Input() studentName!: string;

  // Outputs
  @Output() recordUpdated = new EventEmitter<AttendanceRecord>();

  // Form
  recordForm!: FormGroup;

  // State
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  isWithinJustificationWindow = false;
  isSessionClosed = false;
  canEdit = true;
  showReasonField = false;

  // Enums for template
  readonly AttendanceStatus = AttendanceStatus;
  readonly attendanceStatuses = Object.values(AttendanceStatus);

  // Justification window (default 48 hours, should be fetched from system params)
  private readonly JUSTIFICATION_WINDOW_HOURS = 48;

  ngOnInit(): void {
    this.initForm();
    this.checkEditPermissions();
    this.applyEditState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentRecord'] || changes['sessionStatus'] || changes['sessionDate']) {
      this.checkEditPermissions();
      if (this.recordForm) {
        this.updateFormValues();
        this.applyEditState();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form with validators
   * Requirements: 6.2, 6.3, 6.4, 6.5
   */
  private initForm(): void {
    this.recordForm = this.fb.group({
      status: [this.currentRecord?.status || AttendanceStatus.FALTA, [Validators.required]],
      entryTime: [
        this.currentRecord?.entryTime || '',
        [timeFormatValidator(), notFutureTimeValidator()],
      ],
      permissionNote: [
        this.currentRecord?.permissionNote || '',
        [permissionNoteMaxLengthValidator()],
      ],
      observation: [this.currentRecord?.observation || '', [observationMaxLengthValidator()]],
      reason: ['', [Validators.maxLength(500)]],
    });

    // Setup conditional validators
    this.setupConditionalValidators();

    // Disable form if cannot edit
    if (!this.canEdit) {
      this.recordForm.disable();
    }
  }

  /**
   * Update form values when currentRecord changes
   */
  private updateFormValues(): void {
    if (this.currentRecord) {
      this.recordForm.patchValue({
        status: this.currentRecord.status,
        entryTime: this.currentRecord.entryTime || '',
        permissionNote: this.currentRecord.permissionNote || '',
        observation: this.currentRecord.observation || '',
      });
    }
  }

  /**
   * Setup conditional validators based on status
   * Requirements: 6.3, 6.4
   */
  private setupConditionalValidators(): void {
    this.recordForm
      .get('status')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        const entryTimeControl = this.recordForm.get('entryTime');
        const permissionNoteControl = this.recordForm.get('permissionNote');

        // Clear validators first
        entryTimeControl?.clearValidators();
        permissionNoteControl?.clearValidators();

        // Add validators based on status
        if (status === AttendanceStatus.PRESENTE || status === AttendanceStatus.TARDANZA) {
          // Entry time with format and future time validation
          entryTimeControl?.setValidators([timeFormatValidator(), notFutureTimeValidator()]);
        }

        if (status === AttendanceStatus.CON_PERMISO) {
          // Permission note with max length validation
          permissionNoteControl?.setValidators([permissionNoteMaxLengthValidator()]);
        }

        // Update validity
        entryTimeControl?.updateValueAndValidity();
        permissionNoteControl?.updateValueAndValidity();
      });
  }

  /**
   * Check if user can edit this record
   * Requirements: 6.7, 7.3, 8.1, 8.2
   */
  private checkEditPermissions(): void {
    this.isSessionClosed = this.sessionStatus === SessionStatus.CLOSED;

    if (!this.isSessionClosed) {
      // Session is open, can edit freely
      this.canEdit = true;
      this.showReasonField = false;
      this.isWithinJustificationWindow = false;
      return;
    }

    // Session is closed, check justification window
    if (!this.sessionDate) {
      this.canEdit = false;
      this.showReasonField = false;
      this.isWithinJustificationWindow = false;
      return;
    }

    const sessionDateTime = new Date(this.sessionDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - sessionDateTime.getTime()) / (1000 * 60 * 60);

    this.isWithinJustificationWindow = hoursDiff <= this.JUSTIFICATION_WINDOW_HOURS;

    if (this.isWithinJustificationWindow) {
      // Within window, can edit but requires reason
      this.canEdit = true;
      this.showReasonField = true;
    } else {
      // Outside window, cannot edit (unless user is ADMIN - handled by backend)
      this.canEdit = false;
      this.showReasonField = false;
    }
  }

  private applyEditState(): void {
    if (!this.recordForm) {
      return;
    }

    const reasonControl = this.recordForm.get('reason');
    reasonControl?.clearValidators();
    if (this.showReasonField) {
      reasonControl?.setValidators([Validators.required, Validators.maxLength(500)]);
    }
    reasonControl?.updateValueAndValidity({ emitEvent: false });

    if (!this.canEdit) {
      this.recordForm.disable({ emitEvent: false });
    } else {
      this.recordForm.enable({ emitEvent: false });
    }
  }

  /**
   * Check if entry time field should be visible
   * Requirements: 6.3
   */
  shouldShowEntryTime(): boolean {
    const status = this.recordForm.get('status')?.value;
    return status === AttendanceStatus.PRESENTE || status === AttendanceStatus.TARDANZA;
  }

  /**
   * Check if permission note field should be visible
   * Requirements: 6.4
   */
  shouldShowPermissionNote(): boolean {
    const status = this.recordForm.get('status')?.value;
    return status === AttendanceStatus.CON_PERMISO;
  }

  /**
   * Save the attendance record
   * Requirements: 6.1, 6.7, 8.1, 8.2
   */
  saveRecord(): void {
    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      this.error = 'Por favor corrija los errores en el formulario';
      return;
    }

    if (!this.currentRecord) {
      this.error = 'No se puede actualizar un registro que no existe';
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const formValue = this.recordForm.value;

    // Build update DTO
    const updateData: UpdateRecordDto = {
      status: formValue.status,
      entryTime: this.shouldShowEntryTime() ? formValue.entryTime || undefined : undefined,
      permissionNote: this.shouldShowPermissionNote()
        ? formValue.permissionNote || undefined
        : undefined,
      observation: formValue.observation || undefined,
    };

    // Add reason if editing post-closure
    const updatePayload: any = { ...updateData };
    if (this.showReasonField && formValue.reason) {
      updatePayload.reason = formValue.reason;
    }

    this.attendanceService
      .updateRecord(this.currentRecord.id, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.successMessage = 'Registro actualizado exitosamente';
          this.recordUpdated.emit(response.data);

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);

          // Clear reason field after successful save
          if (this.showReasonField) {
            this.recordForm.get('reason')?.reset();
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = this.getErrorMessage(err);
        },
      });
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(err: any): string {
    const errorCode = err.error?.error?.code;
    const errorMessage = err.error?.error?.message;

    switch (errorCode) {
      case 'ATTENDANCE_SESSION_CLOSED':
        return 'La sesión está cerrada y no se puede editar';
      case 'ATTENDANCE_EDIT_WINDOW_EXPIRED':
        return 'El período de justificación (48 horas) ha expirado. Contacte a un administrador.';
      case 'ATTENDANCE_REASON_REQUIRED':
        return 'Debe proporcionar un motivo para editar después del cierre';
      case 'VALIDATION_ERROR':
        return errorMessage || 'Error de validación en los datos ingresados';
      default:
        return errorMessage || 'Error al actualizar el registro';
    }
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
   * Reset form to initial values
   */
  resetForm(): void {
    this.updateFormValues();
    this.error = null;
    this.successMessage = null;
  }

  /**
   * Get warning message for closed session within justification window
   */
  getWarningMessage(): string {
    if (!this.isSessionClosed) {
      return '';
    }

    if (this.isWithinJustificationWindow) {
      return 'La sesión está cerrada pero aún puede editar dentro del período de justificación (48 horas). Debe proporcionar un motivo.';
    }

    return 'La sesión está cerrada y el período de justificación ha expirado. No se pueden realizar cambios.';
  }

  /**
   * Get validation error message for a form control
   * Requirement: Mostrar mensajes de error claros y específicos
   */
  getFieldError(fieldName: string): string {
    const control = this.recordForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    return getValidationErrorMessage(fieldName, control.errors);
  }

  /**
   * Check if a field has errors and has been touched
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.recordForm.get(fieldName);
    return !!(control && control.errors && control.touched);
  }
}
