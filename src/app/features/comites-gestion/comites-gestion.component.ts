import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Comite {
  id: string;
  nombre: string;
  descripcion: string;
  funciones: string[];
  integrantes: string[];
  color: string;
}

@Component({
  selector: 'app-comites-gestion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comites-gestion.component.html',
  styleUrl: './comites-gestion.component.css',
})
export class ComitesGestionComponent implements OnInit {
  comites: Comite[] = [
    {
      id: '1',
      nombre: 'Comité de Condiciones Operativas',
      descripcion:
        'Responsable de garantizar el mantenimiento, seguridad y funcionamiento óptimo de la infraestructura y recursos del colegio. (DS. 004-2021- MINEDU)',
      funciones: [
        'Participar en la elaboración, actualización, implementación y evaluación de los instrumentos de gestión de la institución educativa, contribuyendo al sostenimiento del servicio educativo.',
        'Implementar los procesos de recepción, registro, almacenamiento, distribución e inventario de los recursos educativos de la institución educativa, así como aquellos otorgados por entidades externas.',
        'Elaborar, implementar y evaluar el Plan de Gestión del Riesgo de Desastres según la normativa vigente, así como la implementación de simulacros sectoriales programados o inopinados.',
        'Reportar los incidentes sobre afectación y/o exposición de la IE por peligro inminente, emergencia y/o desastre, así como las necesidades y las acciones ejecutadas a las instancias correspondientes.',
        'Realizar el diagnóstico de necesidades de infraestructura del local educativo, incluyendo las de mantenimiento, acondicionamiento, así como aquellas relacionadas al Plan de Gestión de Riesgos de Desastres.',
        'Realizar la programación y ejecución de las acciones de mantenimiento y acondicionamiento priorizadas bajo la modalidad de subvenciones, según la normativa vigente.',
        'Registrar la información en los sistemas informáticos referidos a la gestión de condiciones operativas a fin de cumplir con las funciones a cargo del Comité.',
        'Formular e incorporar en el Plan Anual de Trabajo, las acciones, presupuesto asociado, personal a cargo y otros aspectos vinculados a la gestión de recursos propios y actividades productivas.',
        'Rendir cuentas sobre los recursos financieros obtenidos o asignados a la IE, ante el CONEI, la comunidad educativa y/o la UGEL, de forma semestral o según la normativa vigente.',
        'Implementar el proceso de adjudicación de quioscos, cafeterías y comedores escolares, garantizando la transparencia del proceso en conformidad con las bases establecidas.',
        'Supervisar el funcionamiento de los quioscos, cafeterías y comedores escolares, la calidad del servicio ofrecido, la administración financiera del mismo.',
        'Implementar el proceso de racionalización a nivel de la institución educativa para plazas de personal docente, directivo, jerárquico, auxiliar de educación y administrativo.',
        'Formular la propuesta del cuadro de horas pedagógicas de acuerdo al número de secciones aprobado y a los criterios de la normativa vigente.',
        'Implementar las actividades establecidas para el proceso de contratación de personal administrativo y profesionales de la salud en la institución educativa.',
        'Promover el desarrollo de las prácticas de gestión asociadas al Compromiso de Gestión Escolar 3.',
      ],
      integrantes: [
        'Directora: Mag. Elsa Huaracha Cobarrucias',
        'Subdirectoras de Primaria: Dra. Gladis Nancy Huacac Guzmán, Mag. Esther Chile Lelona',
        'Subdirectoras de Secundaria: Dra. Sandra Carola Maldonado Ortega, Dr. Marco Antonio Mendoza Peña, Mag. Alejandro Roque Mamani Rivera',
        'Estudiante',
        'CONEI - Primaria: Prof. Rider Tony Pacheco Cárdenas',
        'CONEI - Secundaria: Prof. Henry Arias Castillo',
        'Docente-Primaria: Prof. Nilsa Carlota Villafuerte Mancilla',
        'Docente - Secundaria: Prof. Josefina Antonia Chira Carpio',
        'Padre de familia: Sr. Ronal Gallegos Quispe',
        'APAFA: Sr. Agustín Salazar Contreras',
        'Administrativo: Tap. María Lourdes Malpartida Loayza',
        'Personal docente: Prof. Nilsa Carlota Villafuerte Mancilla',
        'Personal docente: Prof. Josefina Tomasa Chira',
        'Alcaldesa de estudiantes',
        'Gestión de riesgo y desastre: Dr. Marco Antonio Mendoza Peña',
        'Tesorera institucional: Tap. María Cristina Warthon Valenzuela',
        'Patrimonio: Tap. Lorena Alvarez Arias',
      ],
      color: '#001A33',
    },
    {
      id: '2',
      nombre: 'Comité de Gestión Pedagógica',
      descripcion:
        'Encargado de planificar, implementar y evaluar las estrategias pedagógicas para garantizar la calidad educativa. (DS. 006-2021- MINEDU)',
      funciones: [
        'Participar en la elaboración, actualización, implementación y evaluación de los instrumentos de gestión de la institución educativa, contribuyendo a orientar la gestión de la IE al logro de los aprendizajes previstos en el CNEB.',
        'Propiciar la generación de Comunidades de Aprendizaje para fortalecer las prácticas pedagógicas y de gestión, considerando las necesidades y características de los estudiantes y el contexto donde se brinda el servicio educativo.',
        'Generar espacios de promoción de la lectura, de interaprendizaje (entre pares) y de participación voluntaria en los concursos y actividades escolares promovidos por el Minedu, asegurando la accesibilidad para todas y todos los estudiantes.',
        'Desarrollar los procesos de convalidación, revalidación, prueba de ubicación de estudiantes, reconocimiento de estudios independientes, y supervisar las acciones para la recuperación pedagógica, tomando en cuenta la atención a la diversidad.',
        'Promover el uso pedagógico de los recursos y materiales educativos, monitoreando la realización de las adaptaciones necesarias para garantizar su calidad y pertinencia a los procesos pedagógicos y la atención de la diversidad.',
        'Promover Proyectos Educativos Ambientales Integrados (PEAI) que contengan las acciones orientadas a la mejora del entorno educativo y al logro de aprendizajes, en atención a la diversidad, asegurando su incorporación en los Instrumentos de Gestión.',
        'Promover el desarrollo de las prácticas de gestión asociadas al Compromiso de Gestión Escolar 4.',
      ],
      integrantes: [
        'Directora: Mag. Elsa Huaracha Cobarrubias',
        'Subdirectora del nivel primario: Dra. Gladis Nancy Huacac Guzmán',
        'Subdirectora del nivel primario: Mag. Esther Chile Letona',
        'Subdirector del nivel secundario: Dra. Sandra Carola Maldonado Ortega',
        'Subdirector del nivel secundario: Dr. Marco Antonio Mendoza Peña',
        'Subdirector del nivel secundario: Mag. Alejandro Roque Mamani Rivera',
        'CONEI - Primaria: Prof. Rider Tony Pacheco Cárdenas',
        'CONEI - Secundaria: Prof. Henry Arias Castillo',
        'Representante de las estudiantes',
        'Representante de la APAFA: Sr. Agustín Salazar Contreras',
        'Docente del III ciclo del nivel primario: Prof. Norma Beatriz Urrutia Mendoza',
        'Docente del IV ciclo del nivel primario: Prof. Marleny Villafuerte Pino',
        'Docente del V ciclo del nivel primario: Prof. Maria Segovia Flores',
        'Coordinadora del nivel secundario: Prof. Bilma Libia Pareja Moscoso',
        'Coordinadora del nivel secundario: Prof. Delia Eliana Aguirre Mauleón',
        'Coordinadora del nivel secundario: Prof. Doris Alanoca Puma',
        'Coordinadora del nivel secundario: Prof. Maritza Huayllani Puma',
        'Administrativo: Tap. Maria Lourdes Malpartida Loayza',
      ],
      color: '#001A33',
    },
    {
      id: '3',
      nombre: 'Comité de Gestión de Bienestar',
      descripcion:
        'Dedicado a promover el bienestar físico, emocional y social de todos los miembros de la comunidad educativa. (DS. 006-2021- MINEDU)',
      funciones: [
        'Participar en la elaboración, actualización, implementación y evaluación de los instrumentos de gestión de la institución educativa, contribuyendo a una gestión del bienestar escolar que promueva el desarrollo integral de las y los estudiantes.',
        'Elaborar, ejecutar y evaluar las acciones de Tutoría, Orientación Educativa y Convivencia Escolar, las cuales se integran a los Instrumentos de Gestión.',
        'Desarrollar actividades y promover el uso de materiales educativos de orientación a la comunidad educativa relacionados a la promoción del bienestar escolar, de la Tutoría, Orientación Educativa y Convivencia Escolar democrática e intercultural.',
        'Contribuir en el desarrollo de acciones de prevención y atención oportuna de casos de violencia escolar y otras situaciones de vulneración de derechos considerando las orientaciones y protocolos de atención y seguimiento propuesto por el Sector.',
        'Promover reuniones de trabajo colegiado y grupos de interaprendizaje para planificar, implementar y evaluar las acciones de Tutoría, Orientación Educativa y Convivencia Escolar con las y los tutores, docentes, auxiliares de educación y actores socioeducativos.',
        'Articular acciones con instituciones públicas y privadas, autoridades comunales y locales, con el fin de consolidar una red de apoyo a la Tutoría y Orientación Educativa y a la promoción de la convivencia escolar.',
        'Promover el ejercicio de la disciplina, ciudadanía y la sana convivencia, basado en un enfoque de derechos y de interculturalidad, garantizando que no se apliquen castigos físicos o humillantes, ni actos discriminatorios.',
        'Conformar brigadas con los integrantes de la comunidad educativa con el fin de implementar acciones que promuevan la atención de las y los estudiantes en aquellas situaciones que afecten su bienestar (peligro inminente, incidentes, emergencias, desastres u otros).',
        'Promover el desarrollo de las prácticas de gestión asociadas al Compromiso de Gestión Escolar 5.',
      ],
      integrantes: [
        'Directora: Mag. Elsa Huaracha Cobarrubias',
        'Responsable de convivencia: Dra. Katia Roció Canasl Muniz',
        'Coordinador de tutoría: Prof. Rosa Arias Castillo',
        'Coordinador de tutoría: Prof. Sonia',
        'Subdirectora del nivel primario: Prof. Gladis Nancy Huacac Guzmán',
        'Subdirectora del nivel secundario: Mag. Mamani Rivera Alejandro Roque',
        'Responsable de Inclusión: Prof. Gloria Pisango Izuisa',
        'Representante de la APAFA: Sr. Ronal Gallegos Quispe',
        'Representante de los estudiantes',
        'Administrativo: Tap. María Lourdes Malpartida Loayza',
        'Psicólogo: Ps. Hayllin Velasco Costilla',
      ],
      color: '#001A33',
    },
  ];

  comiteSeleccionado: Comite | null = null;

  ngOnInit() {
    // Seleccionar el primer comité por defecto
    if (this.comites.length > 0) {
      this.comiteSeleccionado = this.comites[0];
    }
  }

  seleccionarComite(comite: Comite) {
    this.comiteSeleccionado = comite;
  }
}
