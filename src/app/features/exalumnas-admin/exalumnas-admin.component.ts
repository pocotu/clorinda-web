import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ExalumnasService } from '../../core/services/exalumnas.service';
import { ExalumnaStory, StoryStatus } from '../../core/models/exalumna.model';

@Component({
  selector: 'app-exalumnas-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exalumnas-admin.component.html',
  styleUrl: './exalumnas-admin.component.css',
})
export class ExalumnasAdminComponent implements OnInit {
  private exalumnasService = inject(ExalumnasService);

  // States
  stories = signal<ExalumnaStory[]>([]);
  activeTab = signal<StoryStatus>('PENDING');
  isLoading = signal<boolean>(true);

  // Inline Confirmation State
  confirmingId = signal<string | null>(null);
  confirmAction = signal<'APPROVE' | 'REJECT' | 'DELETE' | null>(null);

  // Text Expansion State (IDs of expanded cards)
  expandedCardIds = signal<Set<string>>(new Set());
  showInfoModal = signal<boolean>(false);

  // Dynamic status counts based on loaded stories (for simple tabs)
  // or we can count from all stories. Let's do a complete count of all stories to display.
  allStories = signal<ExalumnaStory[]>([]);

  pendingCount = computed(() => this.allStories().filter((s) => s.status === 'PENDING').length);
  approvedCount = computed(() => this.allStories().filter((s) => s.status === 'APPROVED').length);
  rejectedCount = computed(() => this.allStories().filter((s) => s.status === 'REJECTED').length);

  filteredStories = computed(() => {
    return this.stories().filter((s) => s.status === this.activeTab());
  });

  ngOnInit() {
    this.refreshAll();
  }

  refreshAll() {
    this.isLoading.set(true);
    // Load all stories first to have accurate counts across tabs
    this.exalumnasService.getTodasAdmin({ page: 1, pageSize: 200 }).subscribe({
      next: (response) => {
        this.allStories.set(response.data);
        this.stories.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading admin stories:', err);
        this.isLoading.set(false);
      },
    });
  }

  onTabChange(tab: StoryStatus) {
    this.activeTab.set(tab);
    this.cancelConfirmation();
  }

  // Toggle card description text clamp
  toggleExpandCard(id: string) {
    const nextSet = new Set(this.expandedCardIds());
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    this.expandedCardIds.set(nextSet);
  }

  isCardExpanded(id: string): boolean {
    return this.expandedCardIds().has(id);
  }

  // Confirmation Flow
  askApprove(id: string) {
    this.confirmingId.set(id);
    this.confirmAction.set('APPROVE');
  }

  askReject(id: string) {
    this.confirmingId.set(id);
    this.confirmAction.set('REJECT');
  }

  askDelete(id: string) {
    this.confirmingId.set(id);
    this.confirmAction.set('DELETE');
  }

  cancelConfirmation() {
    this.confirmingId.set(null);
    this.confirmAction.set(null);
  }

  executeAction(id: string) {
    const action = this.confirmAction();
    if (!action) {
      return;
    }

    this.isLoading.set(true);
    this.cancelConfirmation();

    let request$: Observable<any>;

    if (action === 'APPROVE') {
      request$ = this.exalumnasService.aprobar(id);
    } else if (action === 'REJECT') {
      request$ = this.exalumnasService.rechazar(id);
    } else {
      request$ = this.exalumnasService.eliminar(id);
    }

    request$.subscribe({
      next: () => {
        this.refreshAll();
      },
      error: (err: any) => {
        console.error('Error executing admin action:', err);
        this.refreshAll(); // Reload anyway to ensure sync
      },
    });
  }

  // Formatting date helper
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
