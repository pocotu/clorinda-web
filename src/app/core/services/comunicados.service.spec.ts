import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComunicadosService } from './comunicados.service';
import { LandingPost } from '../models/landing.model';
import { environment } from '../../../environments/environment';

describe('ComunicadosService', () => {
  let service: ComunicadosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ComunicadosService],
    });
    service = TestBed.inject(ComunicadosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch comunicados from backend', (done) => {
    const mockResponse = {
      data: [
        {
          id: '1',
          postType: 'COMUNICADO' as const,
          title: 'Test Post',
          summary: 'Test summary',
          content: 'Test content',
          status: 'PUBLISHED' as const,
          createdBy: 'admin',
          publishedBy: 'admin',
          publishAt: '2026-05-01T00:00:00Z',
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    };

    service.getComunicados().subscribe((result) => {
      expect(result.comunicados.length).toBe(1);
      expect(result.comunicados[0].titulo).toBe('Test Post');
      expect(result.comunicados[0].categoria).toBe('academico');
      expect(result.total).toBe(1);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/landing/public/posts?page=1&pageSize=10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should filter by postType', (done) => {
    const mockResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      },
    };

    service.getComunicados('AVISO', 1, 10).subscribe(() => {
      done();
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/landing/public/posts?page=1&pageSize=10&postType=AVISO`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle errors gracefully', (done) => {
    service.getComunicados().subscribe((result) => {
      expect(result.comunicados.length).toBe(0);
      expect(result.total).toBe(0);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/landing/public/posts?page=1&pageSize=10`);
    req.error(new ProgressEvent('error'));
  });

  it('should map PostType to categoria correctly', (done) => {
    const mockResponse = {
      data: [
        {
          id: '1',
          postType: 'AVISO' as const,
          title: 'Aviso Test',
          content: 'Content',
          status: 'PUBLISHED' as const,
          createdBy: 'admin',
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    };

    service.getComunicados().subscribe((result) => {
      expect(result.comunicados[0].categoria).toBe('administrativo');
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/landing/public/posts?page=1&pageSize=10`);
    req.flush(mockResponse);
  });

  it('should extract summary from content if not provided', (done) => {
    const mockResponse = {
      data: [
        {
          id: '1',
          postType: 'COMUNICADO' as const,
          title: 'Test',
          content:
            '<p>This is a very long content that should be truncated to create a summary when no summary is provided in the response from the backend API</p>',
          status: 'PUBLISHED' as const,
          createdBy: 'admin',
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    };

    service.getComunicados().subscribe((result) => {
      expect(result.comunicados[0].descripcion).toBeTruthy();
      expect(result.comunicados[0].descripcion.length).toBeLessThanOrEqual(153); // 150 + '...'
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/landing/public/posts?page=1&pageSize=10`);
    req.flush(mockResponse);
  });
});
