import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LandingPostListComponent } from './landing-post-list.component';
import { LandingService } from '../../../core/services/landing.service';
import { LandingPost, PostStatus, PostType } from '../../../core/models/landing.model';

describe('LandingPostListComponent', () => {
  let component: LandingPostListComponent;
  let fixture: ComponentFixture<LandingPostListComponent>;
  let mockLandingService: jasmine.SpyObj<LandingService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockPosts: LandingPost[] = [
    {
      id: '1',
      postType: 'COMUNICADO',
      title: 'Test Post 1',
      summary: 'Summary 1',
      content: 'Content 1',
      status: 'DRAFT',
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      postType: 'AVISO',
      title: 'Test Post 2',
      content: 'Content 2',
      status: 'PUBLISHED',
      createdBy: 'admin',
      publishedBy: 'admin',
      publishAt: '2024-01-02T00:00:00Z',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    mockLandingService = jasmine.createSpyObj('LandingService', [
      'getPosts',
      'publishPost',
      'unpublishPost',
      'deletePost',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LandingPostListComponent, ReactiveFormsModule],
      providers: [
        { provide: LandingService, useValue: mockLandingService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPostListComponent);
    component = fixture.componentInstance;
    mockLandingService.getPosts.and.returnValue(
      of({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      })
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize filter form with empty values', () => {
      expect(component.filterForm).toBeDefined();
      expect(component.filterForm.get('postType')?.value).toBe('');
      expect(component.filterForm.get('status')?.value).toBe('');
      expect(component.filterForm.get('search')?.value).toBe('');
    });

    it('should load posts on init', () => {
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        })
      );

      component.loadPosts();

      expect(mockLandingService.getPosts).toHaveBeenCalled();
      expect(component.posts().length).toBe(2);
      expect(component.totalItems()).toBe(2);
    });
  });

  describe('Loading Posts', () => {
    it('should load posts with filters', () => {
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        })
      );

      component.filterForm.patchValue({
        postType: 'COMUNICADO',
        status: 'DRAFT',
        search: 'test',
      });

      component.loadPosts();

      expect(mockLandingService.getPosts).toHaveBeenCalledWith(
        jasmine.objectContaining({
          postType: 'COMUNICADO',
          status: 'DRAFT',
          search: 'test',
          page: 1,
          pageSize: 10,
        })
      );
    });

    it('should handle loading error', () => {
      mockLandingService.getPosts.and.returnValue(throwError(() => new Error('Network error')));

      component.loadPosts();

      expect(component.errorMessage()).toBe('Error al cargar los posts');
      expect(component.isLoading()).toBe(false);
    });

    it('should set loading state during load', () => {
      mockLandingService.getPosts.and.returnValue(
        of({
          data: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        })
      );

      component.loadPosts();

      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Pagination', () => {
    it('should change page and reload posts', () => {
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 20,
          page: 2,
          pageSize: 10,
          totalPages: 2,
        })
      );

      component.onPageChange(2);

      expect(component.currentPage()).toBe(2);
      expect(mockLandingService.getPosts).toHaveBeenCalled();
    });

    it('should change page size and reset to page 1', () => {
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 20,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        })
      );

      const event = { target: { value: '25' } } as any;
      component.onPageSizeChange(event);

      expect(component.pageSize()).toBe(25);
      expect(component.currentPage()).toBe(1);
      expect(mockLandingService.getPosts).toHaveBeenCalled();
    });

    it('should calculate total pages correctly', () => {
      component.totalItems.set(45);
      component.pageSize.set(10);

      expect(component.totalPages()).toBe(5);
    });
  });

  describe('Post Actions', () => {
    it('should navigate to create new post', () => {
      component.createNewPost();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/landing/new']);
    });

    it('should navigate to edit post', () => {
      const post = mockPosts[0];
      component.editPost(post);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/landing/edit', post.id]);
    });

    it('should publish post with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockLandingService.publishPost.and.returnValue(of(mockPosts[0]));
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        })
      );

      component.publishPost(mockPosts[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockLandingService.publishPost).toHaveBeenCalledWith('1');
      expect(mockLandingService.getPosts).toHaveBeenCalled();
    });

    it('should not publish post if confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.publishPost(mockPosts[0]);

      expect(mockLandingService.publishPost).not.toHaveBeenCalled();
    });

    it('should unpublish post with reason', () => {
      spyOn(window, 'prompt').and.returnValue('Test reason');
      mockLandingService.unpublishPost.and.returnValue(of(mockPosts[1]));
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        })
      );

      component.unpublishPost(mockPosts[1]);

      expect(window.prompt).toHaveBeenCalled();
      expect(mockLandingService.unpublishPost).toHaveBeenCalledWith('2', 'Test reason');
      expect(mockLandingService.getPosts).toHaveBeenCalled();
    });

    it('should not unpublish post if reason is empty', () => {
      spyOn(window, 'prompt').and.returnValue('');
      spyOn(window, 'alert');

      component.unpublishPost(mockPosts[1]);

      expect(window.alert).toHaveBeenCalledWith(
        'Debe proporcionar un motivo para despublicar el post'
      );
      expect(mockLandingService.unpublishPost).not.toHaveBeenCalled();
    });

    it('should set error message when deletePost is called', () => {
      component.deletePost(mockPosts[0]);
      expect(component.errorMessage()).toBe(
        'La eliminacion de posts no esta disponible en backend actual. Post: Test Post 1'
      );
    });
  });

  describe('Filters', () => {
    it('should clear all filters', () => {
      mockLandingService.getPosts.and.returnValue(
        of({
          data: mockPosts,
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        })
      );

      component.filterForm.patchValue({
        postType: 'COMUNICADO',
        status: 'DRAFT',
        search: 'test',
      });

      component.clearFilters();

      expect(component.filterForm.get('postType')?.value).toBe('');
      expect(component.filterForm.get('status')?.value).toBe('');
      expect(component.filterForm.get('search')?.value).toBe('');
      expect(component.currentPage()).toBe(1);
      expect(mockLandingService.getPosts).toHaveBeenCalled();
    });
  });

  describe('Permission Checks', () => {
    it('should allow publishing DRAFT posts', () => {
      const draftPost: LandingPost = { ...mockPosts[0], status: 'DRAFT' };
      expect(component.canPublish(draftPost)).toBe(true);
    });

    it('should allow unpublishing PUBLISHED posts', () => {
      const publishedPost: LandingPost = { ...mockPosts[1], status: 'PUBLISHED' };
      expect(component.canUnpublish(publishedPost)).toBe(true);
    });

    it('should allow editing DRAFT posts', () => {
      const draftPost: LandingPost = { ...mockPosts[0], status: 'DRAFT' };
      expect(component.canEdit(draftPost)).toBe(true);
    });

    it('should not allow deleting DRAFT posts', () => {
      const draftPost: LandingPost = { ...mockPosts[0], status: 'DRAFT' };
      expect(component.canDelete(draftPost)).toBe(false);
    });

    it('should not allow editing PUBLISHED posts', () => {
      const publishedPost: LandingPost = { ...mockPosts[1], status: 'PUBLISHED' };
      expect(component.canEdit(publishedPost)).toBe(false);
    });
  });

  describe('Formatting', () => {
    it('should format date correctly', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
      expect(formatted).toContain('15');
    });

    it('should return dash for undefined date', () => {
      expect(component.formatDate(undefined)).toBe('-');
    });

    it('should get correct status label', () => {
      expect(component.getStatusLabel('DRAFT')).toBe('Borrador');
      expect(component.getStatusLabel('PUBLISHED')).toBe('Publicado');
    });

    it('should get correct type label', () => {
      expect(component.getTypeLabel('COMUNICADO')).toBe('Comunicado');
      expect(component.getTypeLabel('AVISO')).toBe('Aviso');
    });

    it('should get correct status badge class', () => {
      expect(component.getStatusBadgeClass('DRAFT')).toBe('badge bg-secondary');
      expect(component.getStatusBadgeClass('PUBLISHED')).toBe('badge bg-success');
    });
  });
});
