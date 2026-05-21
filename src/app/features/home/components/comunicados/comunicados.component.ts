import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComunicadosService } from '../../../../core/services/comunicados.service';
import { Comunicado } from '../../../../core/models/comunicado.model';
import { PostType } from '../../../../core/models/landing.model';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comunicados.component.html',
  styleUrl: './comunicados.component.css',
})
export class ComunicadosComponent implements OnInit {
  comunicados: Comunicado[] = [];
  categoriaSeleccionada: string = 'todos';
  loading: boolean = false;
  error: string | null = null;
  private loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 0;
  total: number = 0;

  constructor(private comunicadosService: ComunicadosService) {}

  ngOnInit() {
    this.cargarComunicados();
  }

  cargarComunicados() {
    this.loading = true;
    this.error = null;
    this.clearLoadingTimeout();
    this.loadingTimeoutId = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'La carga está tardando demasiado. Intenta nuevamente.';
      }
    }, 10000);

    const postType = this.getPostTypeFromCategoria(this.categoriaSeleccionada);

    this.comunicadosService.getComunicados(postType, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.clearLoadingTimeout();
        this.comunicados = response.comunicados;
        this.total = response.total;
        this.totalPages = response.totalPages;
        this.currentPage = response.page;
        this.loading = false;
      },
      error: (err) => {
        this.clearLoadingTimeout();
        console.error('Error loading comunicados:', err);
        this.error = 'No se pudieron cargar los comunicados. Por favor, intenta nuevamente.';
        this.loading = false;
      },
    });
  }

  private clearLoadingTimeout(): void {
    if (this.loadingTimeoutId !== null) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }

  get comunicadosFiltrados() {
    if (this.categoriaSeleccionada === 'todos') {
      return this.comunicados;
    }
    return this.comunicados.filter((c) => c.categoria === this.categoriaSeleccionada);
  }

  filtrarPorCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    this.currentPage = 1; // Reset to first page when filtering
    this.cargarComunicados();
  }

  cargarMas() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cargarComunicados();
    }
  }

  get hayMasComunicados(): boolean {
    return this.currentPage < this.totalPages;
  }

  /**
   * Map frontend categoria to backend PostType
   */
  private getPostTypeFromCategoria(categoria: string): PostType | undefined {
    if (categoria === 'todos') {
      return undefined; // No filter
    }

    const mapping: Record<string, PostType> = {
      academico: 'COMUNICADO',
      deportivo: 'COMUNICADO',
      cultural: 'GALERIA',
      administrativo: 'AVISO',
      apafa: 'COMUNICADO',
    };

    return mapping[categoria];
  }

  getCategoriaColor(categoria: string): string {
    const colores: { [key: string]: string } = {
      academico: '#4A9EE0',
      deportivo: '#28A745',
      cultural: '#F5D547',
      administrativo: '#6C757D',
      apafa: '#001A33',
    };
    return colores[categoria] || '#6C757D';
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
