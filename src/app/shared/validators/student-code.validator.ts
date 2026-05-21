import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator for student code format YYYYNNNN
 * Year must be 19XX or 20XX followed by 4 digits
 */
export function studentCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (use Validators.required for that)
    }

    const studentCodePattern = /^(19|20)[0-9]{2}[0-9]{4}$/;
    const isValid = studentCodePattern.test(control.value);

    return isValid
      ? null
      : {
          invalidStudentCode: {
            value: control.value,
            message: 'El código debe tener formato YYYYNNNN (año de ingreso + 4 dígitos)',
          },
        };
  };
}
