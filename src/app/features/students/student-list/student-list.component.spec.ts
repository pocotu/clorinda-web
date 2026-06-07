import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { StudentListComponent } from './student-list.component';
import { StudentsService } from '../../../core/services/students.service';
import { Student, EnrollmentStatus } from '../../../core/models/student.model';

describe('StudentListComponent', () => {
  let component: StudentListComponent;
  let fixture: ComponentFixture<StudentListComponent>;
  let studentsService: jasmine.SpyObj<StudentsService>;

  const mockStudents: Student[] = [
    {
      id: '1',
      studentCode: '20240001',
      dni: '12345678',
      firstName: 'Juan',
      middleName: 'Carlos',
      lastName: 'Pérez',
      secondLastName: 'García',
      thirdName: undefined,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      enrollments: [
        {
          id: 'e1',
          studentId: '1',
          schoolYear: 2024,
          grade: 3,
          section: 'A',
          status: EnrollmentStatus.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    },
    {
      id: '2',
      studentCode: '20240002',
      dni: undefined,
      firstName: 'María',
      middleName: undefined,
      lastName: 'López',
      secondLastName: 'Martínez',
      thirdName: undefined,
      isActive: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      enrollments: [],
    },
  ];

  const mockApiResponse = {
    data: mockStudents,
    meta: {
      traceId: 'test-trace-id',
      timestamp: '2024-01-01T00:00:00Z',
      pagination: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
    },
  };

  beforeEach(async () => {
    const studentsServiceSpy = jasmine.createSpyObj('StudentsService', [
      'getStudents',
      'createStudent',
      'updateStudent',
      'deleteStudent',
      'toggleStudentStatus',
      'getAvailableGradesAndSections',
    ]);

    await TestBed.configureTestingModule({
      imports: [StudentListComponent, ReactiveFormsModule, HttpClientTestingModule],
      providers: [{ provide: StudentsService, useValue: studentsServiceSpy }],
    }).compileComponents();

    studentsService = TestBed.inject(StudentsService) as jasmine.SpyObj<StudentsService>;
    fixture = TestBed.createComponent(StudentListComponent);
    component = fixture.componentInstance;
    // Default mocks for ngOnInit — prevents "Cannot read pipe of undefined" when detectChanges
    // is called before individual tests set up their own return values.
    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    studentsService.getStudents.and.returnValue(
      of({
        data: [],
        meta: {
          traceId: 'default',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
        },
      })
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load students on init', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));

    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();

    expect(studentsService.getStudents).not.toHaveBeenCalled();
    expect(component.students).toEqual([]);
    expect(component.hasSearched).toBe(false);
  });

  it('should handle error when loading students', () => {
    const errorResponse = {
      error: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error al cargar estudiantes',
        },
      },
    };
    studentsService.getStudents.and.returnValue(throwError(() => errorResponse));

    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();

    // Trigger search explicitly to request database load
    component.searchStudents();

    expect(component.error).toBe('Error al cargar estudiantes');
    expect(component.loading).toBe(false);
  });

  it('should get student full name', () => {
    const student = mockStudents[0];
    const fullName = component.getStudentFullName(student);

    expect(fullName).toBe('Juan Carlos Pérez García');
  });

  it('should get current enrollment', () => {
    const student = mockStudents[0];
    const enrollment = component.getCurrentEnrollment(student);

    expect(enrollment).toEqual({ grade: 3, section: 'A', shift: undefined });
  });

  it('should return null for student without enrollment', () => {
    const student = mockStudents[1];
    const enrollment = component.getCurrentEnrollment(student);

    expect(enrollment).toBeNull();
  });

  it('should change page size and reload students', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();

    const event = {
      target: { value: '25' },
    } as any;

    component.hasSearched = true;
    component.onPageSizeChange(event);

    expect(component.pagination.pageSize).toBe(25);
    expect(component.pagination.page).toBe(1);
    expect(studentsService.getStudents).toHaveBeenCalled();
  });

  it('should navigate to next page', () => {
    // Use callFake so the API response echoes back the requested page,
    // preventing loadStudents() from resetting pagination to page 1.
    studentsService.getStudents.and.callFake((_filters: any, requestedPage: number) =>
      of({
        data: mockStudents,
        meta: {
          traceId: 'test',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: { page: requestedPage ?? 1, pageSize: 10, total: 20, totalPages: 2 },
        },
      })
    );

    fixture.detectChanges();
    component.hasSearched = true;
    component.pagination = {
      page: 1,
      pageSize: 10,
      total: 20,
      totalPages: 2,
    };

    component.nextPage();

    expect(component.pagination.page).toBe(2);
  });

  it('should not navigate beyond last page', () => {
    fixture.detectChanges();
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    component.hasSearched = true;
    component.pagination = {
      page: 2,
      pageSize: 10,
      total: 20,
      totalPages: 2,
    };

    component.nextPage();

    expect(component.pagination.page).toBe(2);
  });

  it('should navigate to previous page', () => {
    fixture.detectChanges();
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    component.hasSearched = true;
    component.pagination = {
      page: 2,
      pageSize: 10,
      total: 20,
      totalPages: 2,
    };

    component.previousPage();

    expect(component.pagination.page).toBe(1);
  });

  it('should not navigate before first page', () => {
    fixture.detectChanges();
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    component.hasSearched = true;
    component.pagination = {
      page: 1,
      pageSize: 10,
      total: 20,
      totalPages: 2,
    };

    component.previousPage();

    expect(component.pagination.page).toBe(1);
  });

  it('should go to specific page', () => {
    // Use callFake so the API response echoes back the requested page,
    // preventing loadStudents() from resetting pagination to page 1.
    studentsService.getStudents.and.callFake((_filters: any, requestedPage: number) =>
      of({
        data: mockStudents,
        meta: {
          traceId: 'test',
          timestamp: '2024-01-01T00:00:00Z',
          pagination: { page: requestedPage ?? 1, pageSize: 10, total: 30, totalPages: 3 },
        },
      })
    );

    fixture.detectChanges();
    component.hasSearched = true;
    component.pagination = {
      page: 1,
      pageSize: 10,
      total: 30,
      totalPages: 3,
    };
    component.goToPage(2);
    expect(component.pagination.page).toBe(2);
  });

  it('should toggle student status', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    studentsService.toggleStudentStatus.and.returnValue(
      of({
        data: { ...mockStudents[0], isActive: false },
        meta: { traceId: 'test', timestamp: '2024-01-01T00:00:00Z' },
      })
    );

    spyOn(window, 'confirm').and.returnValue(true);

    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();
    component.toggleStudentStatus(mockStudents[0]);

    expect(studentsService.toggleStudentStatus).toHaveBeenCalledWith('1', false);
  });

  it('should not toggle student status if not confirmed', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    spyOn(window, 'confirm').and.returnValue(false);

    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();
    component.toggleStudentStatus(mockStudents[0]);

    expect(studentsService.toggleStudentStatus).not.toHaveBeenCalled();
  });

  it('should open and close create modal', () => {
    expect(component.showCreateModal).toBe(false);

    component.openCreateModal();
    expect(component.showCreateModal).toBe(true);

    component.closeCreateModal();
    expect(component.showCreateModal).toBe(false);
  });

  it('should open and close edit modal', () => {
    const student = mockStudents[0];

    expect(component.showEditModal).toBe(false);
    expect(component.selectedStudent).toBeNull();

    component.openEditModal(student);
    expect(component.showEditModal).toBe(true);
    expect(component.selectedStudent).toBe(student);

    component.closeEditModal();
    expect(component.showEditModal).toBe(false);
    expect(component.selectedStudent).toBeNull();
  });

  it('should clear filters', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();

    component.filterForm.patchValue({
      search: 'test',
      grade: '3',
      section: 'A',
      isActive: 'true',
    });

    component.clearFilters();

    expect(component.filterForm.value.search).toBe('');
    expect(component.filterForm.value.grade).toBe('');
    expect(component.filterForm.value.section).toBe('');
    expect(component.filterForm.value.isActive).toBe('');
    expect(component.filterForm.value.shift).toBe('');
  });

  it('should export to CSV', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();

    component.students = mockStudents;

    const mockLink = {
      setAttribute: jasmine.createSpy('setAttribute'),
      click: jasmine.createSpy('click'),
      style: { visibility: '' },
    } as any;

    const createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink);
    const appendChildSpy = spyOn(document.body, 'appendChild').and.callFake(() => mockLink);
    const removeChildSpy = spyOn(document.body, 'removeChild').and.callFake(() => mockLink);
    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');

    component.exportToCSV();

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
    expect(mockLink.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should not export if no students', () => {
    studentsService.getStudents.and.returnValue(of(mockApiResponse));
    studentsService.getAvailableGradesAndSections.and.returnValue(
      of({ data: { grades: [1, 2, 3], sections: ['A', 'B'] } })
    );
    fixture.detectChanges();

    component.students = [];

    spyOn(window, 'alert');
    component.exportToCSV();

    expect(window.alert).toHaveBeenCalledWith('No hay estudiantes para exportar');
  });

  it('should get correct status badge class', () => {
    expect(component.getStatusBadgeClass(true)).toBe('badge bg-success');
    expect(component.getStatusBadgeClass(false)).toBe('badge bg-secondary');
  });

  it('should get correct status label', () => {
    expect(component.getStatusLabel(true)).toBe('Activo');
    expect(component.getStatusLabel(false)).toBe('Inactivo');
  });

  it('should generate correct page numbers', () => {
    component.pagination = {
      page: 3,
      pageSize: 10,
      total: 100,
      totalPages: 10,
    };

    const pages = component.getPageNumbers();

    expect(pages.length).toBeLessThanOrEqual(5);
    expect(pages).toContain(3);
  });
});
