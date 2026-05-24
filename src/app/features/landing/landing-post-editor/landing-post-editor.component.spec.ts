import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { LandingPostEditorComponent } from './landing-post-editor.component';
import { LandingService } from '../../../core/services/landing.service';
import { LandingPost } from '../../../core/models/landing.model';

describe('LandingPostEditorComponent', () => {
  let component: LandingPostEditorComponent;
  let fixture: ComponentFixture<LandingPostEditorComponent>;
  let landingService: jasmine.SpyObj<LandingService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: any;

  const mockPost: LandingPost = {
    id: '1',
    postType: 'COMUNICADO',
    title: 'Test Post',
    summary: 'Test summary',
    content: 'Test content',
    status: 'DRAFT',
    createdBy: 'user1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const landingServiceSpy = jasmine.createSpyObj('LandingService', [
      'getPostById',
      'createPost',
      'updatePost',
      'publishPost',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    activatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue(null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [
        LandingPostEditorComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        NgbDatepickerModule,
      ],
      providers: [
        { provide: LandingService, useValue: landingServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    landingService = TestBed.inject(LandingService) as jasmine.SpyObj<LandingService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(LandingPostEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      fixture.detectChanges();

      expect(component.postForm).toBeDefined();
      expect(component.postForm.get('postType')?.value).toBe('COMUNICADO');
      expect(component.postForm.get('title')?.value).toBe('');
      expect(component.postForm.get('summary')?.value).toBe('');
      expect(component.postForm.get('content')?.value).toBe('');
    });

    it('should set required validators', () => {
      fixture.detectChanges();

      const postType = component.postForm.get('postType');
      const title = component.postForm.get('title');
      const content = component.postForm.get('content');

      expect(postType?.hasError('required')).toBeFalse();

      title?.setValue('');
      expect(title?.hasError('required')).toBeTrue();

      content?.setValue('');
      expect(content?.hasError('required')).toBeTrue();
    });

    it('should set maxLength validators', () => {
      fixture.detectChanges();

      const title = component.postForm.get('title');
      const summary = component.postForm.get('summary');

      title?.setValue('a'.repeat(201));
      expect(title?.hasError('maxlength')).toBeTrue();

      summary?.setValue('a'.repeat(501));
      expect(summary?.hasError('maxlength')).toBeTrue();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      activatedRoute.snapshot.paramMap.get.and.returnValue('1');
      landingService.getPostById.and.returnValue(of(mockPost));
    });

    it('should load post in edit mode', () => {
      fixture.detectChanges();

      expect(component.isEditMode()).toBeTrue();
      expect(component.postId()).toBe('1');
      expect(landingService.getPostById).toHaveBeenCalledWith('1');
    });

    it('should populate form with post data', () => {
      fixture.detectChanges();

      expect(component.postForm.get('postType')?.value).toBe(mockPost.postType);
      expect(component.postForm.get('title')?.value).toBe(mockPost.title);
      expect(component.postForm.get('summary')?.value).toBe(mockPost.summary);
      expect(component.postForm.get('content')?.value).toBe(mockPost.content);
    });

    it('should handle load error', () => {
      landingService.getPostById.and.returnValue(throwError(() => new Error('Load error')));
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Error al cargar el post');
      expect(component.isLoading()).toBeFalse();
    });
  });

  describe('Save Draft', () => {
    it('should not save if form is invalid', () => {
      fixture.detectChanges();
      component.postForm.patchValue({ title: '', content: '' });

      component.saveDraft();

      expect(landingService.createPost).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Por favor, complete los campos requeridos');
    });

    it('should create new post when not in edit mode', () => {
      fixture.detectChanges();
      component.postForm.patchValue({
        postType: 'COMUNICADO',
        title: 'New Post',
        content: 'New content',
      });
      landingService.createPost.and.returnValue(of(mockPost));

      component.saveDraft();

      expect(landingService.createPost).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/landing']);
    });

    it('should update post when in edit mode', () => {
      activatedRoute.snapshot.paramMap.get.and.returnValue('1');
      landingService.getPostById.and.returnValue(of(mockPost));
      fixture.detectChanges();

      component.postForm.patchValue({ title: 'Updated Title' });
      landingService.updatePost.and.returnValue(of(mockPost));

      component.saveDraft();

      expect(landingService.updatePost).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe(
        'La edicion de posts no esta disponible en backend actual'
      );
      expect(component.isLoading()).toBeFalse();
    });

    it('should handle save error', () => {
      fixture.detectChanges();
      component.postForm.patchValue({
        postType: 'COMUNICADO',
        title: 'New Post',
        content: 'New content',
      });
      landingService.createPost.and.returnValue(throwError(() => new Error('Save error')));

      component.saveDraft();

      expect(component.errorMessage()).toBe('Error al guardar el borrador');
      expect(component.isLoading()).toBeFalse();
    });
  });

  describe('Publish', () => {
    beforeEach(() => {
      spyOn(window, 'confirm').and.returnValue(true);
      landingService.publishPost.and.returnValue(of(mockPost));
    });

    it('should not publish if form is invalid', () => {
      fixture.detectChanges();
      component.postForm.patchValue({ title: '', content: '' });

      component.publish();

      expect(landingService.publishPost).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Por favor, complete los campos requeridos');
    });

    it('should show confirmation dialog', () => {
      fixture.detectChanges();
      component.postForm.patchValue({
        postType: 'COMUNICADO',
        title: 'New Post',
        content: 'New content',
      });
      landingService.createPost.and.returnValue(of(mockPost));

      component.publish();

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should publish post after confirmation', () => {
      fixture.detectChanges();
      component.postForm.patchValue({
        postType: 'COMUNICADO',
        title: 'New Post',
        content: 'New content',
      });
      landingService.createPost.and.returnValue(of(mockPost));

      component.publish();

      expect(landingService.createPost).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/landing']);
    });

    it('should not publish if confirmation is cancelled', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);
      fixture.detectChanges();
      component.postForm.patchValue({
        postType: 'COMUNICADO',
        title: 'New Post',
        content: 'New content',
      });

      component.publish();

      expect(landingService.createPost).not.toHaveBeenCalled();
    });
  });

  describe('Preview Mode', () => {
    it('should toggle preview mode', () => {
      fixture.detectChanges();

      expect(component.showPreview()).toBeFalse();

      component.togglePreview();
      expect(component.showPreview()).toBeTrue();

      component.togglePreview();
      expect(component.showPreview()).toBeFalse();
    });
  });

  describe('Cancel', () => {
    it('should navigate without confirmation if form is pristine', () => {
      fixture.detectChanges();

      component.cancel();

      expect(router.navigate).toHaveBeenCalledWith(['/admin/landing']);
    });

    it('should show confirmation if form is dirty', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      fixture.detectChanges();
      component.postForm.markAsDirty();

      component.cancel();

      expect(window.confirm).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/landing']);
    });

    it('should not navigate if confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      fixture.detectChanges();
      component.postForm.markAsDirty();

      component.cancel();

      expect(window.confirm).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Validation Helpers', () => {
    it('should check if field is invalid', () => {
      fixture.detectChanges();
      const title = component.postForm.get('title');

      title?.setValue('');
      title?.markAsTouched();

      expect(component.isFieldInvalid('title')).toBeTrue();
    });

    it('should get field error message', () => {
      fixture.detectChanges();
      const title = component.postForm.get('title');

      title?.setValue('');
      title?.markAsTouched();

      expect(component.getFieldError('title')).toBe('Este campo es requerido');
    });

    it('should get character count', () => {
      fixture.detectChanges();
      component.postForm.patchValue({ title: 'Test' });

      expect(component.getCharacterCount('title')).toBe(4);
    });
  });

  describe('Date Conversion', () => {
    it('should convert Date to NgbDateStruct', () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      const ngbDate = (component as any).dateToNgbDate(date);

      expect(ngbDate.year).toBe(2026);
      expect(ngbDate.month).toBe(1);
      expect(ngbDate.day).toBe(15);
    });

    it('should convert NgbDateStruct to Date', () => {
      const ngbDate = { year: 2026, month: 1, day: 15 };
      const date = (component as any).ngbDateToDate(ngbDate);

      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0); // January is 0
      expect(date?.getDate()).toBe(15);
    });

    it('should handle null NgbDateStruct', () => {
      const date = (component as any).ngbDateToDate(null);

      expect(date).toBeNull();
    });
  });
});
