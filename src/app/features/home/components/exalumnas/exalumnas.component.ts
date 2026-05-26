import {
  Component,
  OnInit,
  HostListener,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExalumnasService } from '../../../../core/services/exalumnas.service';
import { ExalumnaStory } from '../../../../core/models/exalumna.model';

interface DisplayCard {
  id: string;
  nombre: string;
  promocion: string;
  profesion: string;
  logro: string;
  frase: string;
  imagen?: string;
  photos?: string[]; // all photos for the detail modal
  isRealStory?: boolean;
  originalStory?: ExalumnaStory;
}

@Component({
  selector: 'app-exalumnas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exalumnas.component.html',
  styleUrl: './exalumnas.component.css',
})
export class ExalumnasComponent implements OnInit, OnDestroy {
  private exalumnasService = inject(ExalumnasService);

  /** Number of cards visible at once — adapts to viewport width */
  cardsPerPage = signal<number>(this.getCardsPerPage());

  private getCardsPerPage(): number {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 576) return 1;
    if (window.innerWidth < 992) return 2;
    return 3;
  }

  @HostListener('window:resize')
  onResize() {
    const newCount = this.getCardsPerPage();
    if (newCount !== this.cardsPerPage()) {
      this.cardsPerPage.set(newCount);
      // Clamp currentIndex so it doesn't exceed bounds after resize
      const max = Math.max(0, this.exalumnas().length - newCount);
      if (this.currentIndex > max) {
        this.currentIndex = max;
      }
    }
  }

  // Dynamic state
  stories = signal<ExalumnaStory[]>([]);
  isLoading = signal<boolean>(true);
  loadError = signal<string | null>(null);

  // Hardcoded fallback list
  private fallbackExalumnas: DisplayCard[] = [
    {
      id: 'fallback-1',
      nombre: 'María Fernanda Quispe',
      promocion: 'Promoción 2015',
      profesion: 'Médica Cirujana',
      logro: 'Especialista en Cardiología - Hospital Regional del Cusco',
      frase:
        'El colegio me enseñó la disciplina y los valores que me llevaron al éxito profesional.',
      imagen: 'assets/images/exalumnas/img_ex_alum.png',
      photos: ['assets/images/exalumnas/img_ex_alum.png'],
      isRealStory: false,
    },
    {
      id: 'fallback-2',
      nombre: 'Ana Lucía Huamán',
      promocion: 'Promoción 2012',
      profesion: 'Ingeniera de Sistemas',
      logro: 'Líder de Proyectos en Google - Silicon Valley',
      frase: 'Gracias al colegio descubrí mi pasión por la tecnología y la innovación.',
      imagen: 'assets/images/exalumnas/img_exalum1.png',
      photos: ['assets/images/exalumnas/img_exalum1.png'],
      isRealStory: false,
    },
    {
      id: 'fallback-3',
      nombre: 'Carmen Rosa Vargas',
      promocion: 'Promoción 2010',
      profesion: 'Abogada',
      logro: 'Defensora de Derechos Humanos - ONU',
      frase: 'Los valores de justicia y equidad que aprendí aquí guían mi trabajo.',
      imagen: 'assets/images/exalumnas/img_ex_alum.png',
      photos: ['assets/images/exalumnas/img_ex_alum.png'],
      isRealStory: false,
    },
    {
      id: 'fallback-4',
      nombre: 'Patricia Mendoza',
      promocion: 'Promoción 2018',
      profesion: 'Arquitecta',
      logro: 'Ganadora del Premio Nacional de Arquitectura Sostenible',
      frase:
        'El colegio me inspiró a soñar en grande y trabajar por el desarrollo de nuestra región.',
      imagen: 'assets/images/exalumnas/img_exalum1.png',
      photos: ['assets/images/exalumnas/img_exalum1.png'],
      isRealStory: false,
    },
  ];

  // Combined exalumnas array
  exalumnas = computed<DisplayCard[]>(() => {
    const apiStories = this.stories();
    if (apiStories.length === 0) {
      return this.fallbackExalumnas;
    }

    return apiStories.map((story) => ({
      id: story.id,
      nombre: 'Exalumna Clorindina',
      promocion: 'Historia Compartida',
      profesion: 'Egresada',
      logro: 'Anécdota / Historia de éxito',
      frase: story.description,
      imagen: story.photos && story.photos.length > 0 ? story.photos[0] : undefined,
      photos: story.photos,
      isRealStory: true,
      originalStory: story,
    }));
  });

  currentIndex = 0;

  // Modals state
  isSubmitModalOpen = signal<boolean>(false);
  isDetailModalOpen = signal<boolean>(false);
  selectedCard = signal<DisplayCard | null>(null);

  // Form state
  descriptionInput = signal<string>('');
  selectedFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);
  isSending = signal<boolean>(false);
  sendSuccess = signal<boolean>(false);
  sendError = signal<string | null>(null);

  ngOnInit() {
    this.cargarHistorias();
  }

  ngOnDestroy() {
    this.restoreScroll();
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey() {
    this.cerrarModalRegistro();
    this.cerrarModalDetalle();
  }

  cargarHistorias() {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.exalumnasService.getAprobadas(1, 50).subscribe({
      next: (response) => {
        this.stories.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading exalumnas stories:', err);
        this.loadError.set('No se pudieron cargar las historias.');
        this.isLoading.set(false);
      },
    });
  }

  // Carousel methods
  get exalumnasVisibles() {
    return this.exalumnas().slice(this.currentIndex, this.currentIndex + this.cardsPerPage());
  }

  anterior() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  siguiente() {
    if (this.currentIndex < this.exalumnas().length - this.cardsPerPage()) {
      this.currentIndex++;
    }
  }

  get mostrarAnterior(): boolean {
    return this.currentIndex > 0;
  }

  get mostrarSiguiente(): boolean {
    return this.currentIndex < this.exalumnas().length - this.cardsPerPage();
  }

  // Modal Detail methods
  abrirModalDetalle(card: DisplayCard) {
    this.selectedCard.set(card);
    this.isDetailModalOpen.set(true);
    this.disableScroll();
  }

  cerrarModalDetalle() {
    this.selectedCard.set(null);
    this.isDetailModalOpen.set(false);
    this.restoreScroll();
  }

  // Modal Submission methods
  abrirModalRegistro() {
    this.isSubmitModalOpen.set(true);
    this.disableScroll();
  }

  cerrarModalRegistro() {
    this.isSubmitModalOpen.set(false);
    this.resetForm();
    this.restoreScroll();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }

    const filesArray = Array.from(input.files);
    const totalFiles = this.selectedFiles().length + filesArray.length;

    if (totalFiles > 5) {
      alert('Solo puedes subir un máximo de 5 fotos.');
      return;
    }

    const currentFiles = [...this.selectedFiles(), ...filesArray];
    this.selectedFiles.set(currentFiles);

    // Generate previews
    const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
    this.previewUrls.set([...this.previewUrls(), ...newPreviews]);
  }

  removeFile(index: number) {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(this.previewUrls()[index]);

    const updatedFiles = this.selectedFiles().filter((_, i) => i !== index);
    const updatedPreviews = this.previewUrls().filter((_, i) => i !== index);

    this.selectedFiles.set(updatedFiles);
    this.previewUrls.set(updatedPreviews);
  }

  submitStory() {
    const description = this.descriptionInput().trim();
    if (description.length < 10) {
      this.sendError.set('La descripción debe tener al menos 10 caracteres.');
      return;
    }

    this.isSending.set(true);
    this.sendError.set(null);

    this.exalumnasService.submitHistoria(description, this.selectedFiles()).subscribe({
      next: () => {
        this.isSending.set(false);
        this.sendSuccess.set(true);
        // Reload stories list to include any updates (it will be pending so it won't appear immediately, but good practice)
        this.cargarHistorias();
      },
      error: (err) => {
        console.error('Error submitting story:', err);
        this.isSending.set(false);
        this.sendError.set(err.error?.error?.message || 'Ocurrió un error al enviar tu historia.');
      },
    });
  }

  private resetForm() {
    // Revoke all preview URLs
    this.previewUrls().forEach((url) => URL.revokeObjectURL(url));

    this.descriptionInput.set('');
    this.selectedFiles.set([]);
    this.previewUrls.set([]);
    this.isSending.set(false);
    this.sendSuccess.set(false);
    this.sendError.set(null);
  }

  // Scroll helpers
  private disableScroll() {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  private restoreScroll() {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
}
