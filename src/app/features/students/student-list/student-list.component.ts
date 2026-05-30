import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { StudentsService } from '../../../core/services/students.service';
import {
  Student,
  StudentFilters,
  EnrollmentStatus,
  PaginationMeta,
} from '../../../core/models/student.model';
import { StudentFormComponent } from '../student-form/student-form.component';
import { Shift } from '../../../core/models/attendance.model';

/**
 * StudentListComponent
 * Displays a paginated table of students with filters and actions
 * Requirements: 3.6
 */
@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StudentFormComponent],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css'],
})
export class StudentListComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly studentsService = inject(StudentsService);
  private readonly destroy$ = new Subject<void>();

  // Expose Math for template
  protected readonly Math = Math;

  // State
  students: Student[] = [];
  loading = false;
  error: string | null = null;
  pagination: PaginationMeta = {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  };
  hasSearched = false;

  // Forms
  filterForm!: FormGroup;

  // Enums for template
  readonly EnrollmentStatus = EnrollmentStatus;
  readonly pageSizeOptions = [10, 25, 50, 100];
  grades: number[] = [];
  sections: string[] = [];
  readonly enrollmentStatuses = Object.values(EnrollmentStatus);

  // Modal state
  showCreateModal = false;
  showEditModal = false;
  selectedStudent: Student | null = null;
  showInfoModal = false;

  ngOnInit(): void {
    this.initFilterForm();
    this.loadMetadata();
    this.hasSearched = false;
  }

  /**
   * Load available grades and sections
   */
  private loadMetadata(): void {
    this.studentsService.getAvailableGradesAndSections().subscribe({
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
   * Initialize filter form
   */
  private initFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''], // Combined search for code/name/DNI
      grade: [''],
      section: [''],
      isActive: [''],
      enrollmentStatus: [''],
      shift: [''],
    });
  }

  /**
   * Explicitly search students based on current filters (requested by user)
   */
  searchStudents(): void {
    this.hasSearched = true;
    this.pagination.page = 1;
    this.loadStudents();
  }

  /**
   * Load students from API
   */
  loadStudents(): void {
    this.loading = true;
    this.error = null;

    if (!this.hasSearched) {
      this.loading = false;
      return;
    }

    const filters = this.buildFilters();

    const requestedPage = this.pagination.page;
    const requestedPageSize = this.pagination.pageSize;

    this.studentsService
      .getStudents(filters, requestedPage, requestedPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.students = response.data;
          if (response.meta.pagination) {
            this.pagination = {
              page: response.meta.pagination.page ?? requestedPage,
              pageSize: requestedPageSize,
              total: response.meta.pagination.total ?? this.pagination.total,
              totalPages: response.meta.pagination.totalPages ?? this.pagination.totalPages,
            };
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.error?.message || 'Error al cargar estudiantes';
          this.loading = false;
        },
      });
  }

  /**
   * Build filters from form values
   */
  private buildFilters(): StudentFilters {
    const formValue = this.filterForm.value;
    const filters: StudentFilters = {};

    // Search field can match code, name, or DNI
    if (formValue.search) {
      const search = formValue.search.trim();
      // If it looks like a student code (YYYYNNNN), search by code
      if (/^(19|20)\d{6}$/.test(search)) {
        filters.studentCode = search;
      }
      // If it looks like a DNI (8 digits), search by DNI
      else if (/^\d{8}$/.test(search)) {
        filters.dni = search;
      }
      // Otherwise, search by name
      else {
        filters.firstName = search;
      }
    }

    if (formValue.grade) {
      filters.grade = parseInt(formValue.grade, 10);
      filters.schoolYear = new Date().getFullYear();
    }

    if (formValue.section) {
      filters.section = formValue.section;
      filters.schoolYear = new Date().getFullYear();
    }

    if (formValue.isActive !== '') {
      filters.isActive = formValue.isActive === 'true';
    }

    if (formValue.enrollmentStatus) {
      filters.enrollmentStatus = formValue.enrollmentStatus;
    }

    if (formValue.shift) {
      filters.shift = formValue.shift;
      filters.schoolYear = new Date().getFullYear();
    }

    return filters;
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
   * Get current enrollment for student
   */
  getCurrentEnrollment(student: Student): { grade: number; section: string; shift?: Shift } | null {
    if (!student.enrollments || student.enrollments.length === 0) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    const activeEnrollments = student.enrollments.filter(
      (e) => e.status === EnrollmentStatus.ACTIVE
    );
    const currentEnrollment = activeEnrollments.find((e) => e.schoolYear === currentYear);

    if (currentEnrollment) {
      return {
        grade: currentEnrollment.grade,
        section: currentEnrollment.section,
        shift: currentEnrollment.shift,
      };
    }

    const latestEnrollment = activeEnrollments.sort((a, b) => b.schoolYear - a.schoolYear)[0];
    if (latestEnrollment) {
      return {
        grade: latestEnrollment.grade,
        section: latestEnrollment.section,
        shift: latestEnrollment.shift,
      };
    }

    return null;
  }

  /**
   * Get display label for shift
   */
  getShiftLabel(shift?: Shift): string {
    if (!shift) {
      return '—';
    }
    const labels: Record<Shift, string> = {
      [Shift.MANANA]: 'Mañana',
      [Shift.TARDE]: 'Tarde',
      [Shift.NOCHE]: 'Noche',
    };
    return labels[shift] || shift;
  }

  /**
   * Change page size
   */
  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pagination.pageSize = parseInt(select.value, 10);
    this.pagination.page = 1;
    this.loadStudents();
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.totalPages) {
      return;
    }
    this.pagination.page = page;
    this.loadStudents();
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.pagination.page > 1) {
      this.goToPage(this.pagination.page - 1);
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.pagination.page < this.pagination.totalPages) {
      this.goToPage(this.pagination.page + 1);
    }
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.page;

    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
      const endPage = Math.min(totalPages, startPage + maxPages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  /**
   * Open create student modal
   */
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  /**
   * Close create modal
   */
  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  /**
   * Open edit student modal
   */
  openEditModal(student: Student): void {
    this.selectedStudent = student;
    this.showEditModal = true;
  }

  /**
   * Close edit modal
   */
  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedStudent = null;
  }

  /**
   * Handle student created
   */
  onStudentCreated(): void {
    this.closeCreateModal();
    this.loadStudents();
  }

  /**
   * Handle student updated
   */
  onStudentUpdated(): void {
    this.closeEditModal();
    this.loadStudents();
  }

  /**
   * Toggle student active status
   */
  toggleStudentStatus(student: Student): void {
    const action = student.isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Está seguro de ${action} este estudiante?`)) {
      return;
    }

    this.loading = true;
    this.studentsService
      .toggleStudentStatus(student.id, !student.isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadStudents();
        },
        error: (err) => {
          this.error = err.error?.error?.message || `Error al ${action} estudiante`;
          this.loading = false;
        },
      });
  }

  /**
   * Export students to CSV
   */
  exportToCSV(): void {
    if (this.students.length === 0) {
      alert('No hay estudiantes para exportar');
      return;
    }

    const headers = ['N°', 'Código', 'DNI', 'Nombre Completo', 'Grado', 'Sección', 'Estado'];
    const rows = this.students.map((student, i) => {
      const enrollment = this.getCurrentEnrollment(student);
      const rowNum = (this.pagination.page - 1) * this.pagination.pageSize + i + 1;
      return [
        rowNum.toString(),
        student.studentCode,
        student.dni || '',
        this.getStudentFullName(student),
        enrollment?.grade ? `${enrollment.grade}°` : '',
        enrollment?.section || '',
        student.isActive ? 'ACTIVO' : 'INACTIVO',
      ];
    });

    // Helper to sanitize fields and prevent CSV Injection (Formula Injection)
    const sanitizeCsvField = (value: string): string => {
      if (!value) {
        return '';
      }
      // Neutralize formulas (Excel/Sheets auto-execution) by prepending a single quote
      if (/^[=+\-@]/.test(value)) {
        return `'${value}`;
      }
      return value;
    };

    // Construct CSV content safely. Wrap cells in quotes and escape internal quotes to handle names with commas.
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const sanitized = sanitizeCsvField(String(cell));
            return `"${sanitized.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');

    // Add UTF-8 BOM for proper encoding detection in Excel (accents and special characters)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `estudiantes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterForm.reset(
      {
        search: '',
        grade: '',
        section: '',
        isActive: '',
        enrollmentStatus: '',
        shift: '',
      },
      { emitEvent: false }
    );
    this.hasSearched = false;
    this.students = [];
    this.pagination.page = 1;
    this.pagination.total = 0;
    this.pagination.totalPages = 0;
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'badge bg-success' : 'badge bg-secondary';
  }

  /**
   * Get status label
   */
  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }
}
