import { FormControl } from '@angular/forms';
import {
  timeFormatValidator,
  notFutureTimeValidator,
  observationMaxLengthValidator,
  permissionNoteMaxLengthValidator,
  getValidationErrorMessage,
} from './attendance-validators';

describe('Attendance Validators', () => {
  describe('timeFormatValidator', () => {
    it('should accept valid time format HH:MM', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('08:30');
      expect(validator(control)).toBeNull();
    });

    it('should accept time at midnight', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('00:00');
      expect(validator(control)).toBeNull();
    });

    it('should accept time at 23:59', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('23:59');
      expect(validator(control)).toBeNull();
    });

    it('should reject invalid hour (24:00)', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('24:00');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['timeFormat']).toBeDefined();
    });

    it('should reject invalid minute (08:60)', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('08:60');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['timeFormat']).toBeDefined();
    });

    it('should reject invalid format (8:30)', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('8:30');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['timeFormat']).toBeDefined();
    });

    it('should reject invalid format (08:5)', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('08:5');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['timeFormat']).toBeDefined();
    });

    it('should accept empty value', () => {
      const validator = timeFormatValidator();
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should accept null value', () => {
      const validator = timeFormatValidator();
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });
  });

  describe('notFutureTimeValidator', () => {
    beforeEach(() => {
      // Mock current time to 14:30
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2024-01-15T14:30:00'));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should accept time in the past', () => {
      const validator = notFutureTimeValidator();
      const control = new FormControl('08:00');
      expect(validator(control)).toBeNull();
    });

    it('should accept current time', () => {
      const validator = notFutureTimeValidator();
      const control = new FormControl('14:30');
      expect(validator(control)).toBeNull();
    });

    it('should reject future time', () => {
      const validator = notFutureTimeValidator();
      const control = new FormControl('15:00');
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['futureTime']).toBeDefined();
      expect(result?.['futureTime'].message).toContain('no puede ser futura');
    });

    it('should accept empty value', () => {
      const validator = notFutureTimeValidator();
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should not validate if format is invalid', () => {
      const validator = notFutureTimeValidator();
      const control = new FormControl('invalid');
      expect(validator(control)).toBeNull();
    });
  });

  describe('observationMaxLengthValidator', () => {
    it('should accept observation within limit', () => {
      const validator = observationMaxLengthValidator();
      const control = new FormControl('Esta es una observaciÃÂ³n vÃÂ¡lida');
      expect(validator(control)).toBeNull();
    });

    it('should accept observation at exactly 500 characters', () => {
      const validator = observationMaxLengthValidator();
      const text = 'a'.repeat(500);
      const control = new FormControl(text);
      expect(validator(control)).toBeNull();
    });

    it('should reject observation exceeding 500 characters', () => {
      const validator = observationMaxLengthValidator();
      const text = 'a'.repeat(501);
      const control = new FormControl(text);
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['observationMaxLength']).toBeDefined();
      expect(result?.['observationMaxLength'].maxLength).toBe(500);
      expect(result?.['observationMaxLength'].actualLength).toBe(501);
    });

    it('should accept empty value', () => {
      const validator = observationMaxLengthValidator();
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should accept null value', () => {
      const validator = observationMaxLengthValidator();
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });
  });

  describe('permissionNoteMaxLengthValidator', () => {
    it('should accept permission note within limit', () => {
      const validator = permissionNoteMaxLengthValidator();
      const control = new FormControl('Permiso mÃÂ©dico');
      expect(validator(control)).toBeNull();
    });

    it('should accept permission note at exactly 200 characters', () => {
      const validator = permissionNoteMaxLengthValidator();
      const text = 'a'.repeat(200);
      const control = new FormControl(text);
      expect(validator(control)).toBeNull();
    });

    it('should reject permission note exceeding 200 characters', () => {
      const validator = permissionNoteMaxLengthValidator();
      const text = 'a'.repeat(201);
      const control = new FormControl(text);
      const result = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['permissionNoteMaxLength']).toBeDefined();
      expect(result?.['permissionNoteMaxLength'].maxLength).toBe(200);
      expect(result?.['permissionNoteMaxLength'].actualLength).toBe(201);
    });

    it('should accept empty value', () => {
      const validator = permissionNoteMaxLengthValidator();
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should accept null value', () => {
      const validator = permissionNoteMaxLengthValidator();
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });
  });

  describe('getValidationErrorMessage', () => {
    it('should return message for timeFormat error', () => {
      const errors = {
        timeFormat: {
          value: '25:00',
          message: 'El formato debe ser HH:MM (ejemplo: 08:30, 14:45)',
        },
      };
      const message = getValidationErrorMessage('entryTime', errors);
      expect(message).toBe('El formato debe ser HH:MM (ejemplo: 08:30, 14:45)');
    });

    it('should return message for futureTime error', () => {
      const errors = {
        futureTime: {
          value: '23:00',
          message: 'La hora de entrada no puede ser futura',
        },
      };
      const message = getValidationErrorMessage('entryTime', errors);
      expect(message).toBe('La hora de entrada no puede ser futura');
    });

    it('should return message for observationMaxLength error', () => {
      const errors = {
        observationMaxLength: {
          maxLength: 500,
          actualLength: 550,
          message: 'La observaciÃÂ³n no puede exceder 500 caracteres (actual: 550)',
        },
      };
      const message = getValidationErrorMessage('observation', errors);
      expect(message).toContain('500 caracteres');
    });

    it('should return message for permissionNoteMaxLength error', () => {
      const errors = {
        permissionNoteMaxLength: {
          maxLength: 200,
          actualLength: 250,
          message: 'La nota de permiso no puede exceder 200 caracteres (actual: 250)',
        },
      };
      const message = getValidationErrorMessage('permissionNote', errors);
      expect(message).toContain('200 caracteres');
    });

    it('should return message for required error', () => {
      const errors = { required: true };
      const message = getValidationErrorMessage('status', errors);
      expect(message).toContain('requerido');
    });

    it('should return message for maxlength error', () => {
      const errors = {
        maxlength: {
          requiredLength: 100,
          actualLength: 150,
        },
      };
      const message = getValidationErrorMessage('field', errors);
      expect(message).toContain('100 caracteres');
    });

    it('should return empty string for null errors', () => {
      const message = getValidationErrorMessage('field', null);
      expect(message).toBe('');
    });

    it('should return generic message for unknown error', () => {
      const errors = { unknownError: true };
      const message = getValidationErrorMessage('field', errors);
      expect(message).toBe('Error de validación');
    });
  });
});
