import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LandingService } from './landing.service';
import {
  LandingPost,
  CreatePostDto,
  UpdatePostDto,
  PublishPostDto,
  UnpublishPostDto,
  PostFilters,
  PaginatedPosts,
} from '../models/landing.model';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for LandingService
 * **Validates: Requirements 14.1, 14.2, 16.1, 16.2, 17.1, 17.2**
 *
 * Tests cover:
 * - Post CRUD operations
 * - Approval workflow
 * - Publishing/unpublishing
 * - Public post retrieval
 */
describe('LandingService', () => {
  let service: LandingService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/landing/internal/posts`;
  const publicApiUrl = `${environment.apiUrl}/landing/public/posts`;

  const mockPost: LandingPost = {
    id: 'post-123',
    postType: 'COMUNICADO',
    title: 'Test Post',
    summary: 'Test summary',
    content: 'Test content',
    status: 'DRAFT',
    createdBy: 'user-123',
    approvedBy: undefined,
    publishedBy: undefined,
    publishAt: undefined,
    expireAt: undefined,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LandingService],
    });

    service = TestBed.inject(LandingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getPosts', () => {
    it('should get posts without filters', async () => {
      const mockResponse: PaginatedPosts = {
        data: [mockPost],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };

      const promise = new Promise((resolve, reject) => {
        service.getPosts().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data.length).toBe(1);
    });

    it('should get posts with filters', async () => {
      const filters: PostFilters = {
        postType: 'COMUNICADO',
        status: 'PUBLISHED',
        search: 'test',
        page: 1,
        pageSize: 10,
      };
      const mockResponse: PaginatedPosts = {
        data: [mockPost],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      const promise = new Promise((resolve, reject) => {
        service.getPosts(filters).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === apiUrl &&
          request.params.get('postType') === 'COMUNICADO' &&
          request.params.get('status') === 'PUBLISHED' &&
          request.params.get('search') === 'test' &&
          request.params.get('page') === '1' &&
          request.params.get('pageSize') === '10'
        );
      });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getPostById', () => {
    it('should get post by id', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getPostById('post-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}?page=1&pageSize=200`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPost);

      const response: any = await promise;
      expect(response).toEqual(mockPost);
      expect(response.id).toBe('post-123');
    });

    it('should handle post not found', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getPostById('invalid-id').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}?page=1&pageSize=200`);
      req.flush({ error: { message: 'Post not found' } }, { status: 404, statusText: 'Not Found' });

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const createDto: Partial<LandingPost> = {
        postType: 'COMUNICADO',
        title: 'New Post',
        summary: 'New summary',
        content: 'New content',
      };

      const promise = new Promise((resolve, reject) => {
        service.createPost(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush({ ...mockPost, ...createDto });

      const response: any = await promise;
      expect(response.title).toBe(createDto.title);
      expect(response.status).toBe('DRAFT');
    });

    it('should handle validation errors', async () => {
      const createDto: Partial<LandingPost> = {
        postType: 'COMUNICADO',
        title: '',
        content: '',
      };

      const promise = new Promise((resolve, reject) => {
        service.createPost(createDto).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: { message: 'Title and content are required' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('updatePost', () => {
    it('should throw unsupported error', async () => {
      await expectAsync(
        new Promise((resolve, reject) =>
          service.updatePost('1', {}).subscribe({ next: resolve, error: reject })
        )
      ).toBeRejectedWithError(/no soportado/);
    });
  });

  describe('sendForApproval', () => {
    it('should throw unsupported error', async () => {
      await expectAsync(
        new Promise((resolve, reject) =>
          service.sendForApproval('1').subscribe({ next: resolve, error: reject })
        )
      ).toBeRejectedWithError(/no soportado/);
    });
  });

  describe('approvePost', () => {
    it('should throw unsupported error', async () => {
      await expectAsync(
        new Promise((resolve, reject) =>
          service.approvePost('1').subscribe({ next: resolve, error: reject })
        )
      ).toBeRejectedWithError(/no soportado/);
    });
  });

  describe('rejectPost', () => {
    it('should throw unsupported error', async () => {
      await expectAsync(
        new Promise((resolve, reject) =>
          service.rejectPost('1', 'comment').subscribe({ next: resolve, error: reject })
        )
      ).toBeRejectedWithError(/no soportado/);
    });
  });

  describe('publishPost', () => {
    it('should publish post immediately', async () => {
      const publishedPost = {
        ...mockPost,
        status: 'PUBLISHED' as const,
        publishedBy: 'user-123',
      };

      const promise = new Promise((resolve, reject) => {
        service.publishPost('post-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/post-123/publish`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(publishedPost);

      const response: any = await promise;
      expect(response.status).toBe('PUBLISHED');
      expect(response.publishedBy).toBeTruthy();
    });

    it('should schedule post for future publication', async () => {
      const publishAt = '2024-12-31T00:00:00Z';
      const scheduledPost = {
        ...mockPost,
        status: 'PUBLISHED' as const,
        publishAt,
      };

      const promise = new Promise((resolve, reject) => {
        service.publishPost('post-123', publishAt).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/post-123/publish`);
      expect(req.request.body).toEqual({ publishAt });
      req.flush({ data: scheduledPost });

      const response: any = await promise;
      expect(response.publishAt).toBe(publishAt);
    });

    it('should handle publish without approval error', async () => {
      const promise = new Promise((resolve, reject) => {
        service.publishPost('post-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/post-123/publish`);
      req.flush(
        { error: { message: 'Post must be approved before publishing' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('unpublishPost', () => {
    it('should unpublish post successfully', async () => {
      const reason = 'Content outdated';
      const unpublishedPost = { ...mockPost, status: 'UNPUBLISHED' as const };

      const promise = new Promise((resolve, reject) => {
        service.unpublishPost('post-123', reason).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/post-123/unpublish`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason });
      req.flush(unpublishedPost);

      const response: any = await promise;
      expect(response.status).toBe('UNPUBLISHED');
    });

    it('should require reason for unpublishing', async () => {
      const promise = new Promise((resolve, reject) => {
        service.unpublishPost('post-123', '').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${apiUrl}/post-123/unpublish`);
      req.flush(
        { error: { message: 'Reason is required for unpublishing' } },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('deletePost', () => {
    it('should throw unsupported error', async () => {
      await expectAsync(
        new Promise((resolve, reject) =>
          service.deletePost('1').subscribe({ next: resolve, error: reject })
        )
      ).toBeRejectedWithError(/no soportado/);
    });
  });

  describe('getPublicPosts', () => {
    it('should get public posts without filters', async () => {
      const publishedPost = { ...mockPost, status: 'PUBLISHED' as const };
      const mockResponse: PaginatedPosts = {
        data: [publishedPost],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };

      const promise = new Promise((resolve, reject) => {
        service.getPublicPosts().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(publicApiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
      expect(response.data[0].status).toBe('PUBLISHED');
    });

    it('should get public posts with filters', async () => {
      const filters: PostFilters = {
        postType: 'COMUNICADO',
        page: 1,
        pageSize: 10,
      };
      const publishedPost = { ...mockPost, status: 'PUBLISHED' as const };
      const mockResponse: PaginatedPosts = {
        data: [publishedPost],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      const promise = new Promise((resolve, reject) => {
        service.getPublicPosts(filters).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === publicApiUrl &&
          request.params.get('postType') === 'COMUNICADO' &&
          request.params.get('page') === '1' &&
          request.params.get('pageSize') === '10'
        );
      });
      req.flush(mockResponse);

      const response: any = await promise;
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getPublicPostById', () => {
    it('should get public post by id', async () => {
      const publishedPost = { ...mockPost, status: 'PUBLISHED' as const };

      const promise = new Promise((resolve, reject) => {
        service.getPublicPostById('post-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${publicApiUrl}?page=1&pageSize=200`);
      expect(req.request.method).toBe('GET');
      req.flush(publishedPost);

      const response: any = await promise;
      expect(response).toEqual(publishedPost);
      expect(response.status).toBe('PUBLISHED');
    });

    it('should handle unpublished post access', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getPublicPostById('post-123').subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(`${publicApiUrl}?page=1&pageSize=200`);
      req.flush(
        { error: { message: 'Post not found or not published' } },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('approval workflow', () => {
    it('should complete full approval and publish workflow', async () => {
      const postId = 'post-123';

      // Step 1: Create draft
      const createPromise = new Promise((resolve, reject) => {
        service
          .createPost({ postType: 'COMUNICADO', title: 'Test', content: 'Content' })
          .subscribe({
            next: resolve,
            error: reject,
          });
      });

      const createReq = httpMock.expectOne(apiUrl);
      createReq.flush(mockPost);

      const createResponse: any = await createPromise;
      expect(createResponse.status).toBe('DRAFT');

      // Step 2: Send for approval
      const approvalPromise = new Promise((resolve, reject) => {
        service.sendForApproval(postId).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const sendApprovalReq = httpMock.expectOne(`${apiUrl}/${postId}/send-approval`);
      sendApprovalReq.flush({ ...mockPost, status: 'PENDING_APPROVAL' });

      const approvalResponse: any = await approvalPromise;
      expect(approvalResponse.status).toBe('PENDING_APPROVAL');

      // Step 3: Approve
      const approvePromise = new Promise((resolve, reject) => {
        service.approvePost(postId).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const approveReq = httpMock.expectOne(`${apiUrl}/${postId}/approve`);
      approveReq.flush({ ...mockPost, status: 'APPROVED' });

      const approveResponse: any = await approvePromise;
      expect(approveResponse.status).toBe('APPROVED');

      // Step 4: Publish
      const publishPromise = new Promise((resolve, reject) => {
        service.publishPost(postId).subscribe({
          next: resolve,
          error: reject,
        });
      });

      const publishReq = httpMock.expectOne(`${apiUrl}/${postId}/publish`);
      publishReq.flush({ ...mockPost, status: 'PUBLISHED' });

      const publishResponse: any = await publishPromise;
      expect(publishResponse.status).toBe('PUBLISHED');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service.getPosts().subscribe({
          next: resolve,
          error: reject,
        });
      });

      const req = httpMock.expectOne(apiUrl);
      req.error(new ProgressEvent('error'));

      await expectAsync(promise).toBeRejected();
    });

    it('should handle server errors', async () => {
      const promise = new Promise((resolve, reject) => {
        service
          .createPost({ postType: 'COMUNICADO', title: 'Test', content: 'Content' })
          .subscribe({
            next: resolve,
            error: reject,
          });
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: { message: 'Internal server error' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });
});
