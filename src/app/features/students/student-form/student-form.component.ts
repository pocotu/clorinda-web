import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { StudentsService } from '../../../core/services/students.service';
import { Student, CreateStudentDto, UpdateStudentDto } from '../../../core/models/student.model';
import { Shift } from '../../../core/models/attendance.model';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

/**
 * StudentFormComponent
 * Formulario reactivo para crear/editar estudiantes
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-form.component.html',
  styleUrls: ['./student-form.component.css'],
})
export class StudentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly studentsService = inject(StudentsService);

  @Input() student?: Student; // Si existe, modo edición
  @Input() isModal = false;
  @Input() showHeader = true;
  @Output() studentSaved = new EventEmitter<Student>();
  @Output() cancelled = new EventEmitter<void>();

  studentForm!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  serverError: string | null = null;
  showConfirmation = false;

  // Opciones para los selectores
  grades = [1, 2, 3, 4, 5];
  sections = ['A', 'B', 'C', 'D', 'E', 'F'];
  currentYear = new Date().getFullYear();
  schoolYears = Array.from({ length: 5 }, (_, i) => this.currentYear - i);
  readonly Shift = Shift;
  shifts = Object.values(Shift);

  ngOnInit(): void {
    this.isEditMode = !!this.student;
    this.initializeForm();
  }

  /**
   * Inicializa el formulario con validaciones
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  // eslint-disable-next-line complexity
  private initializeForm(): void {
    this.studentForm = this.fb.group({
      studentCode: [
        { value: this.student?.studentCode || '', disabled: this.isEditMode },
        [Validators.required, this.studentCodeValidator],
        this.isEditMode ? [] : [this.studentCodeUniquenessValidator.bind(this)],
      ],
      dni: [this.student?.dni || '', [this.dniValidator], [this.dniUniquenessValidator.bind(this)]],
      firstName: [this.student?.firstName || '', [Validators.required, Validators.minLength(1)]],
      middleName: [this.student?.middleName || ''],
      lastName: [this.student?.lastName || '', [Validators.required, Validators.minLength(1)]],
      secondLastName: [
        this.student?.secondLastName || '',
        [Validators.required, Validators.minLength(1)],
      ],
      thirdName: [this.student?.thirdName || ''],
      grade: [
        this.student?.enrollments?.[0]?.grade || null,
        [Validators.required, Validators.min(1), Validators.max(5)],
      ],
      section: [this.student?.enrollments?.[0]?.section || '', Validators.required],
      shift: [this.student?.enrollments?.[0]?.shift || Shift.MANANA, Validators.required],
      schoolYear: [
        this.student?.enrollments?.[0]?.schoolYear || this.currentYear,
        [Validators.required, Validators.min(2000), Validators.max(2100)],
      ],
    });
  }

  /**
   * Validador de formato de código de estudiante (YYYYNNNN)
   * Requirement 3.2
   */
  private studentCodeValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const regex = /^(19|20)[0-9]{2}[0-9]{4}$/;
    if (!regex.test(control.value)) {
      return {
        invalidFormat: {
          message: 'El código debe tener formato YYYYNNNN (año de ingreso + 4 dígitos)',
        },
      };
    }

    return null;
  }

  /**
   * Validador asíncrono de unicidad de código de estudiante
   * Requirement 3.2
   */
  private studentCodeUniquenessValidator(
    control: AbstractControl
  ): Observable<ValidationErrors | null> {
    if (!control.value || control.hasError('invalidFormat')) {
      return of(null);
    }

    // Debounce de 500ms
    return timer(500).pipe(
      switchMap(() => this.safeStudentsSearch({ studentCode: control.value })),
      map((response) => {
        const students = response.data;
        // Si existe un estudiante con ese código y no es el actual (modo edición)
        if (students.length > 0 && students[0].id !== this.student?.id) {
          return {
            notUnique: {
              message: 'Este código de estudiante ya está registrado',
            },
          };
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Validador de formato de DNI (8 dígitos)
   * Requirement 3.4
   */
  private dniValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // DNI es opcional
    }

    const regex = /^[0-9]{8}$/;
    if (!regex.test(control.value)) {
      return {
        invalidFormat: {
          message: 'El DNI debe tener exactamente 8 dígitos numéricos',
        },
      };
    }

    return null;
  }

  /**
   * Validador asíncrono de unicidad de DNI
   * Requirement 3.4
   */
  private dniUniquenessValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value || control.hasError('invalidFormat')) {
      return of(null);
    }

    // Debounce de 500ms
    return timer(500).pipe(
      switchMap(() => this.safeStudentsSearch({ dni: control.value })),
      map((response) => {
        const students = response.data;
        // Si existe un estudiante con ese DNI y no es el actual (modo edición)
        if (students.length > 0 && students[0].id !== this.student?.id) {
          return {
            notUnique: {
              message: 'Este DNI ya está registrado',
            },
          };
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  private safeStudentsSearch(filters: { studentCode?: string; dni?: string }): Observable<{
    data: Student[];
  }> {
    const request$ = this.studentsService.getStudents(filters, 1, 1) as Observable<{
      data?: Student[];
    }> | null;
    if (!request$) {
      return of({ data: [] });
    }
    return request$.pipe(map((response) => ({ data: response?.data ?? [] })));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.studentForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return 'Este campo es requerido';
    }

    if (errors['invalidFormat']) {
      return errors['invalidFormat'].message;
    }

    if (errors['notUnique']) {
      return errors['notUnique'].message;
    }

    if (errors['minLength']) {
      return `Debe tener al menos ${errors['minLength'].requiredLength} caracteres`;
    }

    if (errors['min']) {
      return `El valor mínimo es ${errors['min'].min}`;
    }

    if (errors['max']) {
      return `El valor máximo es ${errors['max'].max}`;
    }

    return 'Campo inválido';
  }

  /**
   * Verifica si un campo tiene errores y ha sido tocado
   */
  hasError(fieldName: string): boolean {
    const control = this.studentForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Verifica si un campo está validando (async validators)
   */
  isValidating(fieldName: string): boolean {
    const control = this.studentForm.get(fieldName);
    return !!(control && control.pending);
  }

  /**
   * Muestra el diálogo de confirmación
   */
  onSubmit(): void {
    if (this.studentForm.invalid || this.isSubmitting) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.studentForm.controls).forEach((key) => {
        this.studentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.showConfirmation = true;
  }

  /**
   * Confirma y guarda los cambios
   * Requirements: 3.6
   */
  confirmSave(): void {
    this.showConfirmation = false;
    this.isSubmitting = true;
    this.serverError = null;

    const formValue = this.studentForm.getRawValue(); // getRawValue incluye campos deshabilitados

    if (this.isEditMode && this.student) {
      // Modo edición
      const updateDto: UpdateStudentDto = {
        dni: formValue.dni || undefined,
        firstName: formValue.firstName,
        middleName: formValue.middleName || undefined,
        lastName: formValue.lastName,
        secondLastName: formValue.secondLastName,
        thirdName: formValue.thirdName || undefined,
        grade: formValue.grade ? Number(formValue.grade) : undefined,
        section: formValue.section || undefined,
        schoolYear: formValue.schoolYear ? Number(formValue.schoolYear) : undefined,
        shift: formValue.shift || undefined,
      };

      this.studentsService.updateStudent(this.student.id, updateDto).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.studentSaved.emit(response.data);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.handleServerError(error);
        },
      });
    } else {
      // Modo creación
      const createDto: CreateStudentDto = {
        studentCode: formValue.studentCode,
        dni: formValue.dni || undefined,
        firstName: formValue.firstName,
        middleName: formValue.middleName || undefined,
        lastName: formValue.lastName,
        secondLastName: formValue.secondLastName,
        thirdName: formValue.thirdName || undefined,
        grade: formValue.grade ? Number(formValue.grade) : undefined,
        section: formValue.section || undefined,
        schoolYear: formValue.schoolYear ? Number(formValue.schoolYear) : undefined,
        shift: formValue.shift || undefined,
      };

      this.studentsService.createStudent(createDto).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.studentSaved.emit(response.data);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.handleServerError(error);
        },
      });
    }
  }

  /**
   * Cancela la confirmación
   */
  cancelConfirmation(): void {
    this.showConfirmation = false;
  }

  /**
   * Maneja errores del servidor
   * Muestra mensajes específicos para código duplicado y DNI duplicado
   */
  private handleServerError(error: any): void {
    if (error.error?.error?.code === 'STUDENT_CODE_DUPLICATE') {
      this.serverError = 'El código de estudiante ya está registrado';
    } else if (error.error?.error?.code === 'DNI_DUPLICATE') {
      this.serverError = 'El DNI ya está registrado';
    } else if (error.error?.error?.message) {
      this.serverError = error.error.error.message;
    } else {
      this.serverError =
        'Ocurrió un error al guardar el estudiante. Por favor, intente nuevamente.';
    }
  }

  /**
   * Cancela el formulario
   */
  onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Cierra el mensaje de error del servidor
   */
  closeServerError(): void {
    this.serverError = null;
  }
}
