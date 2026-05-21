import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError, first } from 'rxjs/operators';
import { StudentsService } from '../../core/services/students.service';

/**
 * Custom validators for student forms
 * Requirements: 3.2, 3.4
 */

/**
 * Validates student code format YYYYNNNN
 * Requirement: 3.2 - Validar formato YYYYNNNN usando regex ^(19|20)[0-9]{2}[0-9]{4}$
 */
export function studentCodeFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (use Validators.required for that)
    }

    // Regex: ^(19|20)[0-9]{2}[0-9]{4}$
    // - Starts with 19 or 20 (year prefix)
    // - Followed by 2 digits (year suffix)
    // - Followed by 4 digits (sequential number)
    const studentCodePattern = /^(19|20)[0-9]{2}[0-9]{4}$/;

    if (!studentCodePattern.test(control.value)) {
      return {
        studentCodeFormat: {
          value: control.value,
          message:
            'El código debe tener formato YYYYNNNN (año de ingreso + 4 dígitos). Ejemplo: 20240001',
        },
      };
    }

    return null;
  };
}

/**
 * Validates DNI format (8 numeric digits)
 * Requirement: 3.4 - Validar formato DNI (8 dígitos numéricos)
 */
export function dniFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // DNI is optional, don't validate empty values
    }

    // Regex: exactly 8 numeric digits
    const dniPattern = /^[0-9]{8}$/;

    if (!dniPattern.test(control.value)) {
      return {
        dniFormat: {
          value: control.value,
          message: 'El DNI debe tener exactamente 8 dígitos numéricos',
        },
      };
    }

    return null;
  };
}

/**
 * Async validator to check student code uniqueness
 * Requirement: 3.2 - Validador asíncrono para verificar unicidad de código
 * Debounce: 500ms
 */
export function studentCodeUniquenessValidator(
  studentsService: StudentsService,
  currentStudentId?: string
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null);
    }

    // First validate format before checking uniqueness
    const formatError = studentCodeFormatValidator()(control);
    if (formatError) {
      return of(null); // Let format validator handle format errors
    }

    // Debounce for 500ms to avoid excessive API calls
    return timer(500).pipe(
      switchMap(() => studentsService.getStudents({ studentCode: control.value }, 1, 1)),
      map((response) => {
        const students = response.data;

        // Check if any student with this code exists
        if (students && students.length > 0) {
          const existingStudent = students[0];

          // If we're editing and the code belongs to the current student, it's valid
          if (currentStudentId && existingStudent.id === currentStudentId) {
            return null;
          }

          // Code is already taken by another student
          return {
            studentCodeTaken: {
              value: control.value,
              message: 'Este código de estudiante ya está en uso',
            },
          };
        }

        // Code is available
        return null;
      }),
      catchError(() => {
        // On error, don't block the form (network issues, etc.)
        // The backend will validate on submit anyway
        return of(null);
      }),
      first() // Complete after first emission
    );
  };
}

/**
 * Async validator to check DNI uniqueness
 * Requirement: 3.4 - Validador asíncrono para verificar unicidad de DNI
 * Debounce: 500ms
 */
export function dniUniquenessValidator(
  studentsService: StudentsService,
  currentStudentId?: string
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null); // DNI is optional
    }

    // First validate format before checking uniqueness
    const formatError = dniFormatValidator()(control);
    if (formatError) {
      return of(null); // Let format validator handle format errors
    }

    // Debounce for 500ms to avoid excessive API calls
    return timer(500).pipe(
      switchMap(() => studentsService.getStudents({ dni: control.value }, 1, 1)),
      map((response) => {
        const students = response.data;

        // Check if any student with this DNI exists
        if (students && students.length > 0) {
          const existingStudent = students[0];

          // If we're editing and the DNI belongs to the current student, it's valid
          if (currentStudentId && existingStudent.id === currentStudentId) {
            return null;
          }

          // DNI is already taken by another student
          return {
            dniTaken: {
              value: control.value,
              message: 'Este DNI ya está registrado para otro estudiante',
            },
          };
        }

        // DNI is available
        return null;
      }),
      catchError(() => {
        // On error, don't block the form (network issues, etc.)
        // The backend will validate on submit anyway
        return of(null);
      }),
      first() // Complete after first emission
    );
  };
}

/**
 * Helper function to get error message from student validation errors
 * Requirement: Mostrar mensajes de error claros y específicos
 */
export function getStudentValidationErrorMessage(
  controlName: string,
  errors: ValidationErrors | null
): string {
  if (!errors) {
    return '';
  }

  // Custom validators with messages
  if (errors['studentCodeFormat']) {
    return errors['studentCodeFormat'].message;
  }

  if (errors['studentCodeTaken']) {
    return errors['studentCodeTaken'].message;
  }

  if (errors['dniFormat']) {
    return errors['dniFormat'].message;
  }

  if (errors['dniTaken']) {
    return errors['dniTaken'].message;
  }

  // Built-in validators
  if (errors['required']) {
    return `El campo ${controlName} es requerido`;
  }

  if (errors['maxlength']) {
    return `El campo ${controlName} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
  }

  if (errors['minlength']) {
    return `El campo ${controlName} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
  }

  if (errors['pattern']) {
    return `El formato del campo ${controlName} es inválido`;
  }

  if (errors['min']) {
    return `El valor mínimo para ${controlName} es ${errors['min'].min}`;
  }

  if (errors['max']) {
    return `El valor máximo para ${controlName} es ${errors['max'].max}`;
  }

  return 'Error de validación';
}
