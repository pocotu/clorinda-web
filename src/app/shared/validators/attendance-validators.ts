import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom validators for attendance forms
 * Requirements: 6.3, 6.4, 6.5
 */

/**
 * Validates time format HH:MM with range 00:00-23:59
 * Requirement: 6.3 - Validar formato de hora (HH:MM, rango 00:00-23:59)
 */
export function timeFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (use Validators.required for that)
    }

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timePattern.test(control.value)) {
      return {
        timeFormat: {
          value: control.value,
          message: 'El formato debe ser HH:MM (ejemplo: 08:30, 14:45)',
        },
        pattern: {
          requiredPattern: timePattern.toString(),
          actualValue: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Validates that entry time is not in the future
 * Requirement: 6.3 - Validar que hora de entrada no sea futura
 */
export function notFutureTimeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    // Parse the time value (HH:MM)
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timePattern.test(control.value)) {
      return null; // Let timeFormatValidator handle format errors
    }

    const [hours, minutes] = control.value.split(':').map(Number);

    // Get current time in Lima timezone (America/Lima)
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Convert both times to minutes for easier comparison
    const entryTimeInMinutes = hours * 60 + minutes;
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    if (entryTimeInMinutes > currentTimeInMinutes) {
      return {
        futureTime: {
          value: control.value,
          message: 'La hora de entrada no puede ser futura',
        },
      };
    }

    return null;
  };
}

/**
 * Validates maximum length for observation field
 * Requirement: 6.5 - Validar longitud máxima de observaciones (500 caracteres)
 */
export function observationMaxLengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const maxLength = 500;
    const currentLength = control.value.length;

    if (currentLength > maxLength) {
      return {
        observationMaxLength: {
          maxLength,
          actualLength: currentLength,
          message: `La observación no puede exceder ${maxLength} caracteres (actual: ${currentLength})`,
        },
        maxlength: {
          requiredLength: maxLength,
          actualLength: currentLength,
        },
      };
    }

    return null;
  };
}

/**
 * Validates maximum length for permission note field
 * Requirement: 6.4 - Validar longitud máxima de nota de permiso (200 caracteres)
 */
export function permissionNoteMaxLengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const maxLength = 200;
    const currentLength = control.value.length;

    if (currentLength > maxLength) {
      return {
        permissionNoteMaxLength: {
          maxLength,
          actualLength: currentLength,
          message: `La nota de permiso no puede exceder ${maxLength} caracteres (actual: ${currentLength})`,
        },
        maxlength: {
          requiredLength: maxLength,
          actualLength: currentLength,
        },
      };
    }

    return null;
  };
}

/**
 * Validates that entry time is required when status is PRESENTE or TARDANZA
 * Requirement: 6.3 - Entry time conditional validation
 */
export function entryTimeRequiredValidator(statusControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }

    const statusControl = control.parent.get(statusControlName);
    const status = statusControl?.value;

    // Entry time is required for PRESENTE and TARDANZA
    if ((status === 'PRESENTE' || status === 'TARDANZA') && !control.value) {
      return {
        entryTimeRequired: {
          message: 'La hora de entrada es requerida para este estado',
        },
      };
    }

    return null;
  };
}

/**
 * Validates that permission note is required when status is CON_PERMISO
 * Requirement: 6.4 - Permission note conditional validation
 */
export function permissionNoteRequiredValidator(statusControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }

    const statusControl = control.parent.get(statusControlName);
    const status = statusControl?.value;

    // Permission note is required for CON_PERMISO
    if (status === 'CON_PERMISO' && !control.value) {
      return {
        permissionNoteRequired: {
          message: 'La nota de permiso es requerida para este estado',
        },
      };
    }

    return null;
  };
}

/**
 * Helper function to get error message from validation errors
 * Requirement: Mostrar mensajes de error claros y específicos
 */
export function getValidationErrorMessage(
  controlName: string,
  errors: ValidationErrors | null
): string {
  if (!errors) {
    return '';
  }

  // Custom validators with messages
  if (errors['timeFormat']) {
    return errors['timeFormat'].message;
  }

  if (errors['futureTime']) {
    return errors['futureTime'].message;
  }

  if (errors['observationMaxLength']) {
    return errors['observationMaxLength'].message;
  }

  if (errors['permissionNoteMaxLength']) {
    return errors['permissionNoteMaxLength'].message;
  }

  if (errors['entryTimeRequired']) {
    return errors['entryTimeRequired'].message;
  }

  if (errors['permissionNoteRequired']) {
    return errors['permissionNoteRequired'].message;
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

  return 'Error de validación';
}
