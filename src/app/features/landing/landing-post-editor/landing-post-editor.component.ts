import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbModal, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { switchMap } from 'rxjs';
import { LandingService } from '../../../core/services/landing.service';
import { LandingPost, PostType, PostStatus } from '../../../core/models/landing.model';

@Component({
  selector: 'app-landing-post-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbDatepickerModule],
  templateUrl: './landing-post-editor.component.html',
  styleUrls: ['./landing-post-editor.component.css'],
})
export class LandingPostEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(NgbModal);
  private landingService = inject(LandingService);

  postForm!: FormGroup;
  postId = signal<string | null>(null);
  isEditMode = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  showPreview = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Enums for template
  postTypes: PostType[] = ['COMUNICADO', 'AVISO', 'GALERIA', 'DESTACADO'];
  postTypeLabels: Record<PostType, string> = {
    COMUNICADO: 'Comunicado',
    AVISO: 'Aviso',
    GALERIA: 'Galería',
    DESTACADO: 'Destacado',
  };

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.postForm = this.fb.group({
      postType: ['COMUNICADO', [Validators.required]],
      title: ['', [Validators.required, Validators.maxLength(200)]],
      summary: ['', [Validators.maxLength(500)]],
      content: ['', [Validators.required]],
      imageUrl: ['', [Validators.maxLength(500)]],
      publishAt: [null],
      expireAt: [null],
    });

    // Real-time validation
    this.postForm.valueChanges.subscribe(() => {
      this.errorMessage.set(null);
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.postId.set(id);
      this.isEditMode.set(true);
      this.loadPost(id);
    }
  }

  private loadPost(id: string): void {
    this.isLoading.set(true);
    this.landingService.getPostById(id).subscribe({
      next: (post) => {
        this.populateForm(post);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar el post');
        this.isLoading.set(false);
        console.error('Error loading post:', error);
      },
    });
  }

  private populateForm(post: LandingPost): void {
    this.postForm.patchValue({
      postType: post.postType,
      title: post.title,
      summary: post.summary || '',
      content: post.content,
      imageUrl: post.imageUrl || '',
      publishAt: post.publishAt ? this.dateToNgbDate(new Date(post.publishAt)) : null,
      expireAt: post.expireAt ? this.dateToNgbDate(new Date(post.expireAt)) : null,
    });
  }

  private dateToNgbDate(date: Date): NgbDateStruct {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  private ngbDateToDate(ngbDate: NgbDateStruct | null): Date | null {
    if (!ngbDate) {
      return null;
    }
    return new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
  }

  onContentChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.postForm.patchValue({ content: textarea.value });
  }

  togglePreview(): void {
    this.showPreview.update((value) => !value);
  }

  saveDraft(): void {
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      this.errorMessage.set('Por favor, complete los campos requeridos');
      return;
    }

    this.isLoading.set(true);
    const postData = this.preparePostData('DRAFT');
    if (this.isEditMode()) {
      this.isLoading.set(false);
      this.errorMessage.set('La edicion de posts no esta disponible en backend actual');
      return;
    }
    const saveOperation = this.landingService.createPost(postData);

    saveOperation.subscribe({
      next: (_post) => {
        this.isLoading.set(false);
        this.router.navigate(['/admin/landing']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al guardar el borrador');
        console.error('Error saving draft:', error);
      },
    });
  }

  publish(): void {
    if (this.postForm.invalid) {
      this.markFormGroupTouched(this.postForm);
      this.errorMessage.set('Por favor, complete los campos requeridos');
      return;
    }

    // Show confirmation modal
    this.openConfirmationModal();
  }

  private openConfirmationModal(): void {
    const confirmed = confirm(
      '¿Está seguro de que desea publicar este post? Una vez publicado, será visible para todos los usuarios.'
    );

    if (confirmed) {
      this.executePublish();
    }
  }

  private executePublish(): void {
    this.isLoading.set(true);
    const postData = this.preparePostData('PUBLISHED');

    if (this.isEditMode()) {
      this.landingService.publishPost(this.postId()!).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/admin/landing']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set('Error al publicar el post');
          console.error('Error publishing post:', error);
        },
      });
    } else {
      this.landingService.createPost(postData).pipe(
        switchMap((createdPost) => this.landingService.publishPost(createdPost.id, postData.publishAt))
      ).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/admin/landing']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set('Error al publicar el post');
          console.error('Error publishing post:', error);
        },
      });
    }
  }

  private preparePostData(status: PostStatus): Partial<LandingPost> {
    const formValue = this.postForm.value;

    return {
      postType: formValue.postType,
      title: formValue.title,
      summary: formValue.summary || undefined,
      content: formValue.content,
      imageUrl: formValue.imageUrl || undefined,
      status: status,
      publishAt: this.ngbDateToDate(formValue.publishAt)?.toISOString(),
      expireAt: this.ngbDateToDate(formValue.expireAt)?.toISOString(),
    };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  cancel(): void {
    if (this.postForm.dirty) {
      const confirmed = confirm(
        '¿Está seguro de que desea cancelar? Los cambios no guardados se perderán.'
      );
      if (confirmed) {
        this.router.navigate(['/admin/landing']);
      }
    } else {
      this.router.navigate(['/admin/landing']);
    }
  }

  // Getters for template
  get postType() {
    return this.postForm.get('postType');
  }
  get title() {
    return this.postForm.get('title');
  }
  get summary() {
    return this.postForm.get('summary');
  }
  get content() {
    return this.postForm.get('content');
  }
  get publishAt() {
    return this.postForm.get('publishAt');
  }
  get expireAt() {
    return this.postForm.get('expireAt');
  }

  // Validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.postForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string | null {
    const field = this.postForm.get(fieldName);
    if (!field || !field.errors) {
      return null;
    }

    if (field.errors['required']) {
      return 'Este campo es requerido';
    }
    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    return null;
  }

  getCharacterCount(fieldName: string): number {
    const field = this.postForm.get(fieldName);
    return field?.value?.length || 0;
  }
}
