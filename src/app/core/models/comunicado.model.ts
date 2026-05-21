export interface Comunicado {
  id: string;
  titulo: string;
  descripcion: string;
  contenido: string;
  categoria: 'academico' | 'deportivo' | 'cultural' | 'administrativo' | 'apafa';
  fecha: Date;
  autor: string;
  imagen?: string;
  destacado: boolean;
}

export interface ComunicadoCategoria {
  id: string;
  nombre: string;
  color: string;
  icono: string;
}
