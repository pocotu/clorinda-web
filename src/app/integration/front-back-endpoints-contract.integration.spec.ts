import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { StudentsService } from '../core/services/students.service';
import { ImportService } from '../core/services/import.service';
import { LandingService } from '../core/services/landing.service';
import { ComunicadosService } from '../core/services/comunicados.service';

describe('Front-Back Endpoints Contract', () => {
  let httpMock: HttpTestingController;
  let studentsService: StudentsService;
  let importService: ImportService;
  let landingService: LandingService;
  let comunicadosService: ComunicadosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StudentsService, ImportService, LandingService, ComunicadosService],
    });

    httpMock = TestBed.inject(HttpTestingController);
    studentsService = TestBed.inject(StudentsService);
    importService = TestBed.inject(ImportService);
    landingService = TestBed.inject(LandingService);
    comunicadosService = TestBed.inject(ComunicadosService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('usa /api/internal/students en StudentsService', () => {
    studentsService.getStudents().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/internal/students?page=1&pageSize=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: {} });
  });

  it('usa /api/internal/students/import en ImportService', () => {
    const mockFile = new File(['a,b'], 'students.csv', { type: 'text/csv' });
    importService.uploadFiles([mockFile]).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/internal/students/import/upload`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { jobId: 'job-1', uploadedFiles: [] }, meta: {} });
  });

  it('usa /api/landing/internal/posts en LandingService interno', () => {
    landingService.getPosts({ page: 1, pageSize: 10 }).subscribe((response) => {
      expect(response.total).toBe(0);
      expect(response.page).toBe(1);
    });
    const req = httpMock.expectOne(
      `${environment.apiUrl}/landing/internal/posts?page=1&pageSize=10`
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } });
  });

  it('usa /api/landing/public/posts en LandingService publico', () => {
    landingService.getPublicPosts({ page: 1, pageSize: 10 }).subscribe((response) => {
      expect(response.totalPages).toBe(0);
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/landing/public/posts?page=1&pageSize=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } });
  });

  it('usa /api/landing/public/posts en ComunicadosService', () => {
    comunicadosService.getComunicados(undefined, 1, 10).subscribe((response) => {
      expect(response.comunicados.length).toBe(0);
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/landing/public/posts?page=1&pageSize=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } });
  });
});
