import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceSession } from '../../../core/models/attendance.model';

/**
 * AttendanceHistoryComponent
 *
 * Displays attendance history with filters and pagination
 *
 * Features:
 * - Filters: section, month, year
 * - Table with columns: Date, Shift, Section, Closed By User, Post-Close Changes, Last Modified
 * - Pagination (10, 25, 50 records per page)
 * - "View Detail" button that opens modal with complete attendance list
 * - Export to CSV/Excel
 * - Automatic filtering by assigned sections if user is AUXILIAR
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
@Component({
  selector: 'app-attendance-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.css'],
})
export class AttendanceHistoryComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly authService = inject(AuthService);

  // State signals
  sessions = signal<AttendanceSession[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Filter signals
  selectedGrade = signal<number | undefined>(undefined);
  selectedSection = signal<string>('');
  selectedMonth = signal<number | undefined>(undefined);
  selectedYear = signal<number>(new Date().getFullYear());
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  // Pagination meta
  totalRecords = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize()));

  // Modal state
  showDetailModal = signal<boolean>(false);
  selectedSession = signal<AttendanceSession | null>(null);
  selectedSessionRecords = signal<any[]>([]);
  loadingRecords = signal<boolean>(false);
  showInfoModal = signal<boolean>(false);

  // User role
  currentUser = computed(() => this.authService.getCurrentUser());
  isAuxiliar = computed(() => this.currentUser()?.role === 'AUXILIAR');

  // Available options
  grades: number[] = [];
  sections: string[] = [];
  readonly months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];
  years = this.generateYears();
  pageSizes = [10, 25, 50];

  ngOnInit(): void {
    this.loadMetadata();
    // If user is AUXILIAR, filter by their assigned sections automatically
    // For now, we'll load all sections and let the backend filter
    // In a real implementation, you would get the user's assigned sections from the backend
    this.loadHistory();
  }

  /**
   * Load available grades and sections
   */
  private loadMetadata(): void {
    this.attendanceService['http']
      .get<{
        data: { grades: number[]; sections: string[] };
      }>(`${this.attendanceService['apiUrl'].replace('/attendance', '/students')}/metadata`)
      .subscribe({
        next: (response) => {
          this.grades = response.data.grades;
          this.sections = response.data.sections;
        },
        error: (err) => {
          console.error('Error loading metadata:', err);
        },
      });
  }

  /**
   * Load attendance history with current filters
   */
  loadHistory(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: any = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    if (this.selectedGrade()) {
      filters.grade = this.selectedGrade();
    }

    if (this.selectedSection()) {
      filters.section = this.selectedSection();
    }

    if (this.selectedMonth()) {
      filters.month = this.selectedMonth();
    }

    if (this.selectedYear()) {
      filters.year = this.selectedYear();
    }

    this.attendanceService.getHistory(filters).subscribe({
      next: (response) => {
        this.sessions.set(response.data);
        this.totalRecords.set(response.meta.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading attendance history:', err);
        this.error.set(
          'Error al cargar el historial de asistencia. Por favor, intente nuevamente.'
        );
        this.loading.set(false);
      },
    });
  }

  /**
   * Apply filters and reload history
   */
  applyFilters(): void {
    this.currentPage.set(1); // Reset to first page when filters change
    this.loadHistory();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedGrade.set(undefined);
    this.selectedSection.set('');
    this.selectedMonth.set(undefined);
    this.selectedYear.set(new Date().getFullYear());
    this.currentPage.set(1);
    this.loadHistory();
  }

  /**
   * Change page size
   */
  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1); // Reset to first page
    this.loadHistory();
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadHistory();
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  /**
   * Open detail modal for a session
   */
  viewDetail(session: AttendanceSession): void {
    this.selectedSession.set(session);
    this.showDetailModal.set(true);
    this.loadingRecords.set(true);
    this.attendanceService.getSessionWithRecords(session.id).subscribe({
      next: (res) => {
        this.selectedSessionRecords.set(res.data.records || []);
        this.loadingRecords.set(false);
      },
      error: (err) => {
        console.error('Error loading session records:', err);
        this.loadingRecords.set(false);
      },
    });
  }

  /**
   * Close detail modal
   */
  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedSession.set(null);
    this.selectedSessionRecords.set([]);
  }

  /**
   * Export history to CSV
   */
  exportToCSV(): void {
    if (this.sessions().length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Prepare CSV data
    const headers = [
      'Fecha',
      'Turno',
      'Grado',
      'Sección',
      'Estado',
      'Usuario Cierre',
      'Cambios Post-Cierre',
      'Última Modificación',
    ];
    const rows = this.sessions().map((session) => [
      this.formatDate(session.sessionDate),
      this.formatShift(session.shift),
      session.grade.toString(),
      session.section,
      this.formatStatus(session.status),
      session.closedBy?.username || '-',
      session.postCloseEditCount?.toString() || '0',
      session.lastModifiedAt ? this.formatDateTime(session.lastModifiedAt) : '-',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `historial-asistencia-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export history to Excel (simplified CSV format)
   */
  exportToExcel(): void {
    // For now, we'll use the same CSV export
    // In a real implementation, you would use a library like xlsx to create proper Excel files
    this.exportToCSV();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string | undefined | null): string {
    if (!date) {
      return '-';
    }

    // Convert to ISO string to avoid timezone shifting, then extract YYYY-MM-DD
    const dateString = typeof date === 'string' ? date : date.toISOString();
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '-';
    }
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Format datetime for display
   */
  formatDateTime(date: Date | string | undefined | null): string {
    if (!date) {
      return '-';
    }
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      return '-';
    }
    return d.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get student full name
   */
  getStudentFullName(student: any): string {
    if (!student) {
      return '-';
    }
    const names = [
      student.firstName,
      student.middleName,
      student.lastName,
      student.secondLastName,
      student.thirdLastName,
    ]
      .filter(Boolean)
      .join(' ');
    return names;
  }

  /**
   * Format shift for display
   */
  formatShift(shift: string): string {
    const shiftMap: { [key: string]: string } = {
      MANANA: 'Mañana',
      TARDE: 'Tarde',
      NOCHE: 'Noche',
    };
    return shiftMap[shift] || shift;
  }

  /**
   * Format status for display
   */
  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      OPEN: 'Abierta',
      CLOSED: 'Cerrada',
    };
    return statusMap[status] || status;
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    return status === 'OPEN' ? 'badge bg-success' : 'badge bg-secondary';
  }

  /**
   * Generate array of years for filter
   */
  private generateYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  }

  /**
   * Get page numbers for pagination display
   */
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, current page, and 2 pages before and after current
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      pages.push(total);
    }

    return pages;
  }
}
