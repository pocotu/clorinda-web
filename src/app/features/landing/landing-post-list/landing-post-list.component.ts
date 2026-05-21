import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { LandingService } from '../../../core/services/landing.service';
import { LandingPost, PostType, PostStatus, PostFilters } from '../../../core/models/landing.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-landing-post-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbPaginationModule],
  templateUrl: './landing-post-list.component.html',
  styleUrls: ['./landing-post-list.component.css'],
})
export class LandingPostListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private landingService = inject(LandingService);

  // Expose Math for template
  protected readonly Math = Math;

  // State signals
  posts = signal<LandingPost[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Pagination state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filter form
  filterForm!: FormGroup;

  // Enums for template
  postTypes: (PostType | '')[] = ['', 'COMUNICADO', 'AVISO', 'GALERIA', 'DESTACADO'];
  postStatuses: (PostStatus | '')[] = ['', 'DRAFT', 'PUBLISHED'];

  postTypeLabels: Record<PostType | '', string> = {
    '': 'Todos los tipos',
    COMUNICADO: 'Comunicado',
    AVISO: 'Aviso',
    GALERIA: 'Galería',
    DESTACADO: 'Destacado',
  };

  postStatusLabels: Record<PostStatus | '', string> = {
    '': 'Todos los estados',
    DRAFT: 'Borrador',
    PENDING_APPROVAL: 'Pendiente de Aprobación',
    APPROVED: 'Aprobado',
    PUBLISHED: 'Publicado',
    UNPUBLISHED: 'Despublicado',
  };

  postStatusBadgeClasses: Record<PostStatus, string> = {
    DRAFT: 'badge bg-secondary',
    PENDING_APPROVAL: 'badge bg-warning text-dark',
    APPROVED: 'badge bg-info',
    PUBLISHED: 'badge bg-success',
    UNPUBLISHED: 'badge bg-danger',
  };

  ngOnInit(): void {
    this.initializeFilterForm();
    this.setupFilterListeners();
    this.loadPosts();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      postType: [''],
      status: [''],
      search: [''],
    });
  }

  private setupFilterListeners(): void {
    // Debounce search input
    this.filterForm
      .get('search')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadPosts();
      });

    // Immediate filter for dropdowns
    this.filterForm.get('postType')?.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadPosts();
    });

    this.filterForm.get('status')?.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadPosts();
    });
  }

  loadPosts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters: PostFilters = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    const formValue = this.filterForm.value;
    if (formValue.postType) {
      filters.postType = formValue.postType;
    }
    if (formValue.status) {
      filters.status = formValue.status;
    }
    if (formValue.search?.trim()) {
      filters.search = formValue.search.trim();
    }

    this.landingService.getPosts(filters).subscribe({
      next: (response) => {
        this.posts.set(response.data);
        this.totalItems.set(response.total);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar los posts');
        this.isLoading.set(false);
        console.error('Error loading posts:', error);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPosts();
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(1);
    this.loadPosts();
  }

  createNewPost(): void {
    this.router.navigate(['/admin/landing/new']);
  }

  editPost(post: LandingPost): void {
    this.router.navigate(['/admin/landing/edit', post.id]);
  }

  publishPost(post: LandingPost): void {
    const confirmed = confirm(`¿Está seguro de que desea publicar el post "${post.title}"?`);

    if (confirmed) {
      this.isLoading.set(true);
      this.landingService.publishPost(post.id).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.loadPosts();
        },
        error: (error) => {
          this.errorMessage.set('Error al publicar el post');
          this.isLoading.set(false);
          console.error('Error publishing post:', error);
        },
      });
    }
  }

  unpublishPost(post: LandingPost): void {
    const reason = prompt(`Ingrese el motivo para despublicar el post "${post.title}":`);

    if (reason && reason.trim()) {
      this.isLoading.set(true);
      this.landingService.unpublishPost(post.id, reason.trim()).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.loadPosts();
        },
        error: (error) => {
          this.errorMessage.set('Error al despublicar el post');
          this.isLoading.set(false);
          console.error('Error unpublishing post:', error);
        },
      });
    } else if (reason !== null) {
      alert('Debe proporcionar un motivo para despublicar el post');
    }
  }

  deletePost(post: LandingPost): void {
    this.errorMessage.set(
      `La eliminacion de posts no esta disponible en backend actual. Post: ${post.title}`
    );
  }

  clearFilters(): void {
    this.filterForm.reset({
      postType: '',
      status: '',
      search: '',
    });
    this.currentPage.set(1);
    this.loadPosts();
  }

  getStatusBadgeClass(status: PostStatus): string {
    return this.postStatusBadgeClasses[status];
  }

  getStatusLabel(status: PostStatus): string {
    return this.postStatusLabels[status];
  }

  getTypeLabel(type: PostType): string {
    return this.postTypeLabels[type];
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canPublish(post: LandingPost): boolean {
    return post.status === 'DRAFT' || post.status === 'APPROVED';
  }

  canUnpublish(post: LandingPost): boolean {
    return post.status === 'PUBLISHED';
  }

  canEdit(post: LandingPost): boolean {
    return post.status === 'DRAFT' || post.status === 'UNPUBLISHED';
  }

  canDelete(_post: LandingPost): boolean {
    return false;
  }

  // Getters for template
  get postType() {
    return this.filterForm.get('postType');
  }
  get status() {
    return this.filterForm.get('status');
  }
  get search() {
    return this.filterForm.get('search');
  }
}
