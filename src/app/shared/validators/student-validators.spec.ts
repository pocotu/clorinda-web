import { FormControl, type ValidationErrors } from '@angular/forms';
import { type Observable, firstValueFrom, of, throwError } from 'rxjs';
import {
  studentCodeFormatValidator,
  dniFormatValidator,
  studentCodeUniquenessValidator,
  dniUniquenessValidator,
  getStudentValidationErrorMessage,
} from './student-validators';
import { Student } from '../../core/models/student.model';
import { StudentsService } from '../../core/services/students.service';

describe('Student Validators', () => {
  let mockStudentsService: { getStudents: jasmine.Spy };

  beforeEach(() => {
    mockStudentsService = {
      getStudents: jasmine.createSpy('getStudents'),
    };
  });

  describe('studentCodeFormatValidator', () => {
    it('should return null for empty value', () => {
      const control = new FormControl('');
      const validator = studentCodeFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      const validator = studentCodeFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should validate correct format starting with 19', () => {
      const control = new FormControl('19990001');
      const validator = studentCodeFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should validate correct format starting with 20', () => {
      const control = new FormControl('20240001');
      const validator = studentCodeFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should validate year 2099', () => {
      const control = new FormControl('20999999');
      const validator = studentCodeFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should reject format starting with 18', () => {
      const control = new FormControl('18990001');
      const validator = studentCodeFormatValidator();
      const result: ValidationErrors | null = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['studentCodeFormat']).toBeDefined();
      expect(result?.['studentCodeFormat'].message).toContain('formato YYYYNNNN');
    });

    it('should reject format with less than 8 digits', () => {
      const control = new FormControl('2024001');
      const validator = studentCodeFormatValidator();
      const result: ValidationErrors | null = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['studentCodeFormat']).toBeDefined();
    });

    it('should reject format with letters', () => {
      const control = new FormControl('2024ABCD');
      const validator = studentCodeFormatValidator();
      const result: ValidationErrors | null = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['studentCodeFormat']).toBeDefined();
    });
  });

  describe('dniFormatValidator', () => {
    it('should return null for empty value', () => {
      const control = new FormControl('');
      const validator = dniFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should validate correct 8-digit DNI', () => {
      const control = new FormControl('12345678');
      const validator = dniFormatValidator();
      expect(validator(control)).toBeNull();
    });

    it('should reject DNI with less than 8 digits', () => {
      const control = new FormControl('1234567');
      const validator = dniFormatValidator();
      const result: ValidationErrors | null = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['dniFormat']).toBeDefined();
    });

    it('should reject DNI with letters', () => {
      const control = new FormControl('1234567A');
      const validator = dniFormatValidator();
      const result: ValidationErrors | null = validator(control);
      expect(result).not.toBeNull();
      expect(result?.['dniFormat']).toBeDefined();
    });
  });

  describe('studentCodeUniquenessValidator', () => {
    it('should return null for empty value', async () => {
      const control = new FormControl('');
      const validator = studentCodeUniquenessValidator(
        mockStudentsService as unknown as StudentsService
      );

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
    });

    it('should return null when code is available', async () => {
      const control = new FormControl('20240001');
      mockStudentsService.getStudents.and.returnValue(
        of({ data: [], meta: { total: 0, page: 1, pageSize: 1 } })
      );

      const validator = studentCodeUniquenessValidator(
        mockStudentsService as unknown as StudentsService
      );
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).toBeNull();
      expect(mockStudentsService.getStudents).toHaveBeenCalledWith(
        { studentCode: '20240001' },
        1,
        1
      );
    });

    it('should return error when code is taken by another student', async () => {
      const control = new FormControl('20240001');
      const existingStudent: Student = {
        id: 'other-student-id',
        studentCode: '20240001',
        firstName: 'John',
        lastName: 'Doe',
        secondLastName: 'Smith',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockStudentsService.getStudents.and.returnValue(
        of({ data: [existingStudent], meta: { total: 1, page: 1, pageSize: 1 } })
      );

      const validator = studentCodeUniquenessValidator(
        mockStudentsService as unknown as StudentsService
      );
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).not.toBeNull();
      expect(result?.['studentCodeTaken']).toBeDefined();
      expect(result?.['studentCodeTaken'].message).toContain('ya está en uso');
    });

    it('should return null when code belongs to current student (edit mode)', async () => {
      const currentStudentId = 'current-student-id';
      const control = new FormControl('20240001');
      const existingStudent: Student = {
        id: currentStudentId,
        studentCode: '20240001',
        firstName: 'John',
        lastName: 'Doe',
        secondLastName: 'Smith',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockStudentsService.getStudents.and.returnValue(
        of({ data: [existingStudent], meta: { total: 1, page: 1, pageSize: 1 } })
      );

      const validator = studentCodeUniquenessValidator(
        mockStudentsService as unknown as StudentsService,
        currentStudentId
      );
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).toBeNull();
    });

    it('should return null on network error (graceful degradation)', async () => {
      const control = new FormControl('20240001');
      mockStudentsService.getStudents.and.returnValue(throwError(() => new Error('Network error')));

      const validator = studentCodeUniquenessValidator(
        mockStudentsService as unknown as StudentsService
      );
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).toBeNull();
    });

    it('should not validate if format is invalid', async () => {
      const control = new FormControl('invalid');
      const validator = studentCodeUniquenessValidator(
        mockStudentsService as unknown as StudentsService
      );

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
      expect(mockStudentsService.getStudents).not.toHaveBeenCalled();
    });
  });

  describe('dniUniquenessValidator', () => {
    it('should return null for empty value (DNI is optional)', async () => {
      const control = new FormControl('');
      const validator = dniUniquenessValidator(mockStudentsService as unknown as StudentsService);

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
    });

    it('should return null when DNI is available', async () => {
      const control = new FormControl('12345678');
      mockStudentsService.getStudents.and.returnValue(
        of({ data: [], meta: { total: 0, page: 1, pageSize: 1 } })
      );

      const validator = dniUniquenessValidator(mockStudentsService as unknown as StudentsService);
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).toBeNull();
      expect(mockStudentsService.getStudents).toHaveBeenCalledWith({ dni: '12345678' }, 1, 1);
    });

    it('should return error when DNI is taken by another student', async () => {
      const control = new FormControl('12345678');
      const existingStudent: Student = {
        id: 'other-student-id',
        studentCode: '20240001',
        dni: '12345678',
        firstName: 'John',
        lastName: 'Doe',
        secondLastName: 'Smith',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockStudentsService.getStudents.and.returnValue(
        of({ data: [existingStudent], meta: { total: 1, page: 1, pageSize: 1 } })
      );

      const validator = dniUniquenessValidator(mockStudentsService as unknown as StudentsService);
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).not.toBeNull();
      expect(result?.['dniTaken']).toBeDefined();
      expect(result?.['dniTaken'].message).toContain('ya está registrado');
    });

    it('should return null when DNI belongs to current student (edit mode)', async () => {
      const currentStudentId = 'current-student-id';
      const control = new FormControl('12345678');
      const existingStudent: Student = {
        id: currentStudentId,
        studentCode: '20240001',
        dni: '12345678',
        firstName: 'John',
        lastName: 'Doe',
        secondLastName: 'Smith',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockStudentsService.getStudents.and.returnValue(
        of({ data: [existingStudent], meta: { total: 1, page: 1, pageSize: 1 } })
      );

      const validator = dniUniquenessValidator(
        mockStudentsService as unknown as StudentsService,
        currentStudentId
      );
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).toBeNull();
    });

    it('should return null on network error (graceful degradation)', async () => {
      const control = new FormControl('12345678');
      mockStudentsService.getStudents.and.returnValue(throwError(() => new Error('Network error')));

      const validator = dniUniquenessValidator(mockStudentsService as unknown as StudentsService);
      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );

      expect(result).toBeNull();
    });

    it('should not validate if format is invalid', async () => {
      const control = new FormControl('invalid');
      const validator = dniUniquenessValidator(mockStudentsService as unknown as StudentsService);

      const result = await firstValueFrom(
        validator(control) as Observable<ValidationErrors | null>
      );
      expect(result).toBeNull();
      expect(mockStudentsService.getStudents).not.toHaveBeenCalled();
    });
  });

  describe('getStudentValidationErrorMessage', () => {
    it('should return empty string for null errors', () => {
      const message = getStudentValidationErrorMessage('testField', null);
      expect(message).toBe('');
    });

    it('should return message for studentCodeFormat error', () => {
      const errors = {
        studentCodeFormat: {
          value: 'invalid',
          message: 'El código debe tener formato YYYYNNNN',
        },
      };
      const message = getStudentValidationErrorMessage('studentCode', errors);
      expect(message).toContain('formato YYYYNNNN');
    });

    it('should return message for studentCodeTaken error', () => {
      const errors = {
        studentCodeTaken: {
          value: '20240001',
          message: 'Este código de estudiante ya está en uso',
        },
      };
      const message = getStudentValidationErrorMessage('studentCode', errors);
      expect(message).toContain('ya está en uso');
    });

    it('should return message for dniFormat error', () => {
      const errors = {
        dniFormat: {
          value: 'invalid',
          message: 'El DNI debe tener exactamente 8 dígitos numéricos',
        },
      };
      const message = getStudentValidationErrorMessage('dni', errors);
      expect(message).toContain('8 dígitos numéricos');
    });

    it('should return message for required error', () => {
      const errors = { required: true };
      const message = getStudentValidationErrorMessage('firstName', errors);
      expect(message).toContain('requerido');
    });

    it('should return generic message for unknown error', () => {
      const errors = { unknownError: true };
      const message = getStudentValidationErrorMessage('testField', errors);
      expect(message).toBe('Error de validación');
    });
  });
});
