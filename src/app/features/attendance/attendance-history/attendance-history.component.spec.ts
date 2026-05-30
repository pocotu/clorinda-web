import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AttendanceHistoryComponent } from './attendance-history.component';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceSession } from '../../../core/models/attendance.model';

describe('AttendanceHistoryComponent', () => {
  let component: AttendanceHistoryComponent;
  let fixture: ComponentFixture<AttendanceHistoryComponent>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    role: 'ADMIN' as const,
  };

  const mockSessions: AttendanceSession[] = [
    {
      id: 'session-1',
      sessionDate: '2026-05-01',
      shift: 'MANANA' as any,
      grade: 1,
      section: 'A',
      status: 'CLOSED' as any,
      openedByUserId: 'user-1',
      closedByUserId: 'user-1',
      openedAt: '2026-05-01T08:00:00',
      closedAt: '2026-05-01T12:00:00',
      closeReason: 'Fin de jornada',
      createdAt: '2026-05-01T08:00:00',
      updatedAt: '2026-05-01T12:00:00',
    },
    {
      id: 'session-2',
      sessionDate: '2026-05-02',
      shift: 'TARDE' as any,
      grade: 2,
      section: 'B',
      status: 'OPEN' as any,
      openedByUserId: 'user-1',
      openedAt: '2026-05-02T13:00:00',
      createdAt: '2026-05-02T13:00:00',
      updatedAt: '2026-05-02T13:00:00',
    },
  ];

  const mockHistoryResponse = {
    data: mockSessions,
    meta: {
      total: 2,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const attendanceServiceSpy = jasmine.createSpyObj('AttendanceService', [
      'getHistory',
      'getSessionWithRecords',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [AttendanceHistoryComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: AttendanceService, useValue: attendanceServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    attendanceService = TestBed.inject(AttendanceService) as jasmine.SpyObj<AttendanceService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    authService.getCurrentUser.and.returnValue(mockUser);
    attendanceService.getSessionWithRecords.and.returnValue(of({ data: { records: [] } } as any));
    attendanceService.getHistory.and.returnValue(of(mockHistoryResponse));

    (attendanceService as any)['http'] = {
      get: jasmine.createSpy('get').and.returnValue(of({ data: { grades: [1], sections: ['A'] } })),
    };
    (attendanceService as any)['apiUrl'] = 'http://localhost:3000/api/internal/attendance';
    fixture = TestBed.createComponent(AttendanceHistoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load history on init', () => {
    fixture.detectChanges();

    expect(attendanceService.getHistory).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      year: new Date().getFullYear(),
    });
    expect(component.sessions().length).toBe(2);
    expect(component.totalRecords()).toBe(2);
  });

  it('should apply filters and reload history', () => {
    fixture.detectChanges();
    attendanceService.getHistory.calls.reset();

    component.selectedSection.set('A');
    component.selectedShift.set('MANANA');
    component.selectedMonth.set(5);
    component.selectedYear.set(2026);
    component.applyFilters();

    expect(attendanceService.getHistory).toHaveBeenCalledWith({
      section: 'A',
      shift: 'MANANA',
      month: 5,
      year: 2026,
      page: 1,
      pageSize: 25,
    });
  });

  it('should clear filters', () => {
    component.selectedSection.set('A');
    component.selectedShift.set('MANANA');
    component.selectedMonth.set(5);
    component.selectedYear.set(2025);
    component.currentPage.set(2);

    component.clearFilters();

    expect(component.selectedSection()).toBe('');
    expect(component.selectedShift()).toBe('');
    expect(component.selectedMonth()).toBeUndefined();
    expect(component.selectedYear()).toBe(new Date().getFullYear());
    expect(component.currentPage()).toBe(1);
  });

  it('should change page size and reset to first page', () => {
    fixture.detectChanges();
    attendanceService.getHistory.calls.reset();

    component.onPageSizeChange(50);

    expect(component.pageSize()).toBe(50);
    expect(component.currentPage()).toBe(1);
    expect(attendanceService.getHistory).toHaveBeenCalled();
  });

  it('should navigate to next page', () => {
    component.totalRecords.set(100);
    component.pageSize.set(25);
    component.currentPage.set(1);
    attendanceService.getHistory.calls.reset();

    component.nextPage();

    expect(component.currentPage()).toBe(2);
    expect(attendanceService.getHistory).toHaveBeenCalled();
  });

  it('should navigate to previous page', () => {
    component.currentPage.set(2);
    component.totalRecords.set(50);
    component.pageSize.set(25);
    attendanceService.getHistory.calls.reset();

    component.previousPage();

    expect(component.currentPage()).toBe(1);
    expect(attendanceService.getHistory).toHaveBeenCalled();
  });

  it('should not navigate beyond first page', () => {
    component.currentPage.set(1);
    attendanceService.getHistory.calls.reset();

    component.previousPage();

    expect(component.currentPage()).toBe(1);
    expect(attendanceService.getHistory).not.toHaveBeenCalled();
  });

  it('should not navigate beyond last page', () => {
    component.totalRecords.set(50);
    component.pageSize.set(25);
    component.currentPage.set(2);
    attendanceService.getHistory.calls.reset();

    component.nextPage();

    expect(component.currentPage()).toBe(2);
    expect(attendanceService.getHistory).not.toHaveBeenCalled();
  });

  it('should open detail modal', () => {
    const session = mockSessions[0];

    component.viewDetail(session);

    expect(component.showDetailModal()).toBe(true);
    expect(component.selectedSession()).toBe(session);
  });

  it('should close detail modal', () => {
    component.showDetailModal.set(true);
    component.selectedSession.set(mockSessions[0]);

    component.closeDetailModal();

    expect(component.showDetailModal()).toBe(false);
    expect(component.selectedSession()).toBeNull();
  });

  it('should handle error when loading history', () => {
    attendanceService.getSessionWithRecords.and.returnValue(of({ data: { records: [] } } as any));
    attendanceService.getHistory.and.returnValue(throwError(() => new Error('Network error')));

    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.loading()).toBe(false);
  });

  it('should format date correctly', () => {
    const date = new Date('2026-05-01');
    const formatted = component.formatDate(date);

    expect(formatted).toContain('2026');
    expect(formatted).toContain('05');
    expect(formatted).toContain('01');
  });

  it('should format shift correctly', () => {
    expect(component.formatShift('MANANA')).toBe('Mañana');
    expect(component.formatShift('TARDE')).toBe('Tarde');
    expect(component.formatShift('NOCHE')).toBe('Noche');
  });

  it('should format status correctly', () => {
    expect(component.formatStatus('OPEN')).toBe('Abierta');
    expect(component.formatStatus('CLOSED')).toBe('Cerrada');
  });

  it('should get correct status badge class', () => {
    expect(component.getStatusBadgeClass('OPEN')).toBe('badge bg-success');
    expect(component.getStatusBadgeClass('CLOSED')).toBe('badge bg-secondary');
  });

  it('should calculate total pages correctly', () => {
    component.totalRecords.set(100);
    component.pageSize.set(25);

    expect(component.totalPages()).toBe(4);
  });

  it('should generate page numbers correctly for small total', () => {
    component.totalRecords.set(100);
    component.pageSize.set(25);
    component.currentPage.set(2);

    const pages = component.getPageNumbers();

    expect(pages).toEqual([1, 2, 3, 4]);
  });

  it('should generate page numbers with ellipsis for large total', () => {
    component.totalRecords.set(250);
    component.pageSize.set(25);
    component.currentPage.set(5);

    const pages = component.getPageNumbers();

    expect(pages).toContain(1);
    expect(pages).toContain(10);
    expect(pages).toContain(-1); // Ellipsis
  });

  it('should identify AUXILIAR role correctly', () => {
    authService.getCurrentUser.and.returnValue({
      ...mockUser,
      role: 'AUXILIAR',
    });

    (attendanceService as any)['http'] = {
      get: jasmine.createSpy('get').and.returnValue(of({ data: { grades: [1], sections: ['A'] } })),
    } as any;
    (attendanceService as any)['apiUrl'] = 'http://localhost:3000/api/internal/attendance';
    fixture = TestBed.createComponent(AttendanceHistoryComponent);
    component = fixture.componentInstance;

    expect(component.isAuxiliar()).toBe(true);
  });

  it('should export to CSV', () => {
    component.sessions.set(mockSessions);
    spyOn(document, 'createElement').and.callThrough();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');

    component.exportToCSV();

    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should not export empty data', () => {
    component.sessions.set([]);
    spyOn(window, 'alert');

    component.exportToCSV();

    expect(window.alert).toHaveBeenCalledWith('No hay datos para exportar');
  });
});
