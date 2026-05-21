import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { StudentFormComponent } from './student-form.component';
import { StudentsService } from '../../../core/services/students.service';
import { Student, CreateStudentDto, UpdateStudentDto } from '../../../core/models/student.model';

describe('StudentFormComponent', () => {
  let component: StudentFormComponent;
  let fixture: ComponentFixture<StudentFormComponent>;
  let studentsService: any;

  const mockStudent: Student = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    studentCode: '20240001',
    dni: '12345678',
    firstName: 'Juan',
    middleName: 'Carlos',
    lastName: 'Pérez',
    secondLastName: 'García',
    thirdLastName: 'López',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    enrollments: [
      {
        id: '456e7890-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174000',
        schoolYear: 2024,
        grade: 3,
        section: 'A',
        status: 'ACTIVE' as any,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    const studentsServiceSpy = {
      getStudents: jasmine.createSpy('getStudents'),
      createStudent: jasmine.createSpy('createStudent'),
      updateStudent: jasmine.createSpy('updateStudent'),
    };

    await TestBed.configureTestingModule({
      imports: [StudentFormComponent, ReactiveFormsModule],
      providers: [{ provide: StudentsService, useValue: studentsServiceSpy }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    studentsService = TestBed.inject(StudentsService);
    fixture = TestBed.createComponent(StudentFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form in create mode when no student is provided', () => {
      fixture.detectChanges();

      expect(component.isEditMode).toBe(false);
      expect(component.studentForm).toBeDefined();
      expect(component.studentForm.get('studentCode')?.enabled).toBe(true);
    });

    it('should initialize form in edit mode when student is provided', () => {
      component.student = mockStudent;
      fixture.detectChanges();

      expect(component.isEditMode).toBe(true);
      expect(component.studentForm.get('studentCode')?.disabled).toBe(true);
      expect(component.studentForm.get('studentCode')?.value).toBe('20240001');
      expect(component.studentForm.get('firstName')?.value).toBe('Juan');
    });

    it('should populate form with student data in edit mode', () => {
      component.student = mockStudent;
      fixture.detectChanges();

      expect(component.studentForm.get('dni')?.value).toBe('12345678');
      expect(component.studentForm.get('firstName')?.value).toBe('Juan');
      expect(component.studentForm.get('middleName')?.value).toBe('Carlos');
      expect(component.studentForm.get('lastName')?.value).toBe('Pérez');
      expect(component.studentForm.get('secondLastName')?.value).toBe('García');
      expect(component.studentForm.get('thirdLastName')?.value).toBe('López');
      expect(component.studentForm.get('grade')?.value).toBe(3);
      expect(component.studentForm.get('section')?.value).toBe('A');
      expect(component.studentForm.get('schoolYear')?.value).toBe(2024);
    });
  });

  describe('Student Code Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should validate correct student code format', () => {
      const control = component.studentForm.get('studentCode');
      control?.setValue('20240001');
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(false);
    });

    it('should reject invalid student code format', () => {
      const control = component.studentForm.get('studentCode');
      control?.setValue('2024001'); // Missing one digit
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(true);
    });

    it('should reject student code with invalid year prefix', () => {
      const control = component.studentForm.get('studentCode');
      control?.setValue('18240001'); // Year starts with 18
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(true);
    });

    it('should check uniqueness of student code', fakeAsync(() => {
      studentsService.getStudents.and.returnValue(
        of({
          data: [],
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z', pagination: undefined },
        })
      );

      const control = component.studentForm.get('studentCode');
      control?.setValue('20240001');
      control?.markAsTouched();

      tick(500); // Debounce

      expect(studentsService.getStudents).toHaveBeenCalledWith({ studentCode: '20240001' }, 1, 1);
      expect(control?.hasError('notUnique')).toBe(false);
    }));

    it('should detect duplicate student code', fakeAsync(() => {
      studentsService.getStudents.and.returnValue(
        of({
          data: [mockStudent],
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z', pagination: undefined },
        })
      );

      const control = component.studentForm.get('studentCode');
      control?.setValue('20240001');
      control?.markAsTouched();

      tick(500); // Debounce

      expect(control?.hasError('notUnique')).toBe(true);
    }));
  });

  describe('DNI Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should allow empty DNI (optional field)', () => {
      const control = component.studentForm.get('dni');
      control?.setValue('');
      control?.markAsTouched();

      expect(control?.valid).toBe(true);
    });

    it('should validate correct DNI format', () => {
      const control = component.studentForm.get('dni');
      control?.setValue('12345678');
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(false);
    });

    it('should reject DNI with less than 8 digits', () => {
      const control = component.studentForm.get('dni');
      control?.setValue('1234567');
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(true);
    });

    it('should reject DNI with more than 8 digits', () => {
      const control = component.studentForm.get('dni');
      control?.setValue('123456789');
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(true);
    });

    it('should reject DNI with non-numeric characters', () => {
      const control = component.studentForm.get('dni');
      control?.setValue('1234567A');
      control?.markAsTouched();

      expect(control?.hasError('invalidFormat')).toBe(true);
    });

    it('should check uniqueness of DNI', fakeAsync(() => {
      studentsService.getStudents.and.returnValue(
        of({
          data: [],
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z', pagination: undefined },
        })
      );

      const control = component.studentForm.get('dni');
      control?.setValue('12345678');
      control?.markAsTouched();

      tick(500); // Debounce

      expect(studentsService.getStudents).toHaveBeenCalledWith({ dni: '12345678' }, 1, 1);
      expect(control?.hasError('notUnique')).toBe(false);
    }));
  });

  describe('Required Fields Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require firstName', () => {
      const control = component.studentForm.get('firstName');
      control?.setValue('');
      control?.markAsTouched();

      expect(control?.hasError('required')).toBe(true);
    });

    it('should require lastName', () => {
      const control = component.studentForm.get('lastName');
      control?.setValue('');
      control?.markAsTouched();

      expect(control?.hasError('required')).toBe(true);
    });

    it('should require secondLastName', () => {
      const control = component.studentForm.get('secondLastName');
      control?.setValue('');
      control?.markAsTouched();

      expect(control?.hasError('required')).toBe(true);
    });

    it('should require grade', () => {
      const control = component.studentForm.get('grade');
      control?.setValue(null);
      control?.markAsTouched();

      expect(control?.hasError('required')).toBe(true);
    });

    it('should require section', () => {
      const control = component.studentForm.get('section');
      control?.setValue('');
      control?.markAsTouched();

      expect(control?.hasError('required')).toBe(true);
    });

    it('should require schoolYear', () => {
      const control = component.studentForm.get('schoolYear');
      control?.setValue(null);
      control?.markAsTouched();

      expect(control?.hasError('required')).toBe(true);
    });
  });

  describe('Form Submission - Create Mode', () => {
    beforeEach(() => {
      studentsService.getStudents.and.returnValue(
        of({
          data: [],
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z', pagination: undefined },
        })
      );
      fixture.detectChanges();
    });

    it('should show confirmation dialog on valid form submission', () => {
      component.studentForm.patchValue({
        studentCode: '20240001',
        firstName: 'Juan',
        lastName: 'Pérez',
        secondLastName: 'García',
        grade: 3,
        section: 'A',
        schoolYear: 2024,
      });

      component.onSubmit();

      expect(component.showConfirmation).toBe(true);
    });

    it('should not submit if form is invalid', () => {
      component.studentForm.patchValue({
        studentCode: '',
        firstName: '',
      });

      component.onSubmit();

      expect(component.showConfirmation).toBe(false);
    });

    it('should create student on confirmation', fakeAsync(() => {
      const createDto: CreateStudentDto = {
        studentCode: '20240001',
        firstName: 'Juan',
        lastName: 'Pérez',
        secondLastName: 'García',
      };

      studentsService.createStudent.and.returnValue(
        of({
          data: mockStudent,
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z' },
        })
      );

      component.studentForm.patchValue({
        studentCode: '20240001',
        firstName: 'Juan',
        lastName: 'Pérez',
        secondLastName: 'García',
        grade: 3,
        section: 'A',
        schoolYear: 2024,
      });

      tick(500); // Wait for async validators

      spyOn(component.studentSaved, 'emit');

      component.confirmSave();

      expect(studentsService.createStudent).toHaveBeenCalled();
      expect(component.studentSaved.emit).toHaveBeenCalledWith(mockStudent);
    }));

    it('should handle server error on create', () => {
      const error = {
        error: {
          error: {
            code: 'STUDENT_CODE_DUPLICATE',
            message: 'Student code already exists',
          },
        },
      };

      studentsService.createStudent.and.returnValue(throwError(() => error));

      component.studentForm.patchValue({
        studentCode: '20240001',
        firstName: 'Juan',
        lastName: 'Pérez',
        secondLastName: 'García',
        grade: 3,
        section: 'A',
        schoolYear: 2024,
      });

      component.confirmSave();

      expect(component.serverError).toBe('El código de estudiante ya está registrado');
    });
  });

  describe('Form Submission - Edit Mode', () => {
    beforeEach(() => {
      component.student = mockStudent;
      studentsService.getStudents.and.returnValue(
        of({
          data: [],
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z', pagination: undefined },
        })
      );
      fixture.detectChanges();
    });

    it('should update student on confirmation', () => {
      studentsService.updateStudent.and.returnValue(
        of({
          data: mockStudent,
          meta: { traceId: '123', timestamp: '2024-01-01T00:00:00Z' },
        })
      );

      spyOn(component.studentSaved, 'emit');

      component.studentForm.patchValue({
        firstName: 'Pedro',
      });

      component.confirmSave();

      expect(studentsService.updateStudent).toHaveBeenCalledWith(
        mockStudent.id,
        jasmine.any(Object)
      );
      expect(component.studentSaved.emit).toHaveBeenCalledWith(mockStudent);
    });

    it('should handle DNI duplicate error on update', () => {
      const error = {
        error: {
          error: {
            code: 'DNI_DUPLICATE',
            message: 'DNI already exists',
          },
        },
      };

      studentsService.updateStudent.and.returnValue(throwError(() => error));

      component.confirmSave();

      expect(component.serverError).toBe('El DNI ya está registrado');
    });
  });

  describe('Error Messages', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return correct error message for required field', () => {
      const control = component.studentForm.get('firstName');
      control?.setValue('');
      control?.markAsTouched();

      expect(component.getErrorMessage('firstName')).toBe('Este campo es requerido');
    });

    it('should return correct error message for invalid format', () => {
      const control = component.studentForm.get('studentCode');
      control?.setValue('invalid');
      control?.markAsTouched();

      expect(component.getErrorMessage('studentCode')).toContain('formato YYYYNNNN');
    });

    it('should return empty string if field is not touched', () => {
      const control = component.studentForm.get('firstName');
      control?.setValue('');

      expect(component.getErrorMessage('firstName')).toBe('');
    });
  });

  describe('Cancel and Close', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit cancelled event on cancel', () => {
      spyOn(component.cancelled, 'emit');

      component.onCancel();

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('should close confirmation dialog on cancel confirmation', () => {
      component.showConfirmation = true;

      component.cancelConfirmation();

      expect(component.showConfirmation).toBe(false);
    });

    it('should close server error message', () => {
      component.serverError = 'Test error';

      component.closeServerError();

      expect(component.serverError).toBeNull();
    });
  });
});
