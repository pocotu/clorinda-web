import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../core/services';

@Component({
  selector: 'app-nosotros',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nosotros.component.html',
  styleUrl: './nosotros.component.css',
})
export class NosotrosComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Nosotros | IE Emblemática Clorinda Matto de Turner | Cusco',
      description:
        'Conoce la historia, misión, visión y valores de la IE Emblemática Clorinda Matto de Turner en Cusco, Perú. Más de 50 años de excelencia educativa formando ciudadanas íntegras y competentes.',
      keywords:
        'historia Clorinda Matto de Turner, misión visión colegio Cusco, valores institucionales IE Clorinda, educación integral Cusco, institución educativa emblemática historia',
      canonicalPath: '/nosotros',
    });
  }

  readonly sliderImages: string[] = [
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.42 PM.jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.42 PM (1).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.43 PM.jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.43 PM (1).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.43 PM (2).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.43 PM (3).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.43 PM (4).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.44 PM.jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.44 PM (1).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.44 PM (2).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.44 PM (3).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.45 PM.jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.45 PM (1).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.45 PM (2).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.45 PM (3).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.45 PM (4).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.46 PM.jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.46 PM (1).jpeg',
    'assets/images/img-nosotros/WhatsApp Image 2026-04-18 at 4.27.46 PM (2).jpeg',
  ];

  mision =
    'Somos una Institución Educativa que brinda educación de calidad, con estudiantes que logran los estándares educativos establecidos en el CNEB; desarrollando su formación integral a través del arte, deporte, idiomas, ciencia y práctica de valores; para fortalecer el pensamiento crítico, reflexivo, inclusivo e intercultural en entornos seguros, saludables e inclusivos.';

  vision =
    'La Institución Educativa emblemática Clorinda Matto de Turner al año 2027 será líder en calidad educativa con estudiantes, docentes y servidores administrativos competentes y éticos acorde con el avance de la ciencia, tecnología, innovación, conciencia ecológica, inclusiva y práctica de valores que contribuyan a la formación integral de las estudiantes para ser ciudadanas críticas, reflexivas, creativas y solidarias, capaces de aportar al desarrollo sostenible de nuestra sociedad y cultura.';

  principios = [
    {
      nombre: 'Respeto',
      descripcion:
        'Adecua su conducta hacia el respeto de la Constitución y las Leyes, garantizando que en todas las fases del proceso de toma de decisiones o en el cumplimiento de los procedimientos administrativos, se respeten los derechos a la defensa y al debido procedimiento.',
    },
    {
      nombre: 'Probidad',
      descripcion:
        'Actúa con rectitud, honradez y honestidad, procurando satisfacer el interés general y desechando todo provecho o ventaja personal, obtenido por sí o por interpósita persona.',
    },
    {
      nombre: 'Eficiencia',
      descripcion:
        'Brinda calidad en cada una de las funciones a su cargo, procurando obtener una capacitación sólida y permanente.',
    },
    {
      nombre: 'Idoneidad',
      descripcion:
        'Entendida como aptitud técnica, legal y moral, es condición esencial para el acceso y ejercicio de la función pública. El servidor público debe propender a una formación sólida acorde a la realidad, capacitándose permanentemente para el debido cumplimiento de sus funciones.',
    },
    {
      nombre: 'Veracidad',
      descripcion:
        'Se expresa con autenticidad en las relaciones funcionales con todos los miembros de su institución y con la ciudadanía, y contribuye al esclarecimiento de los hechos.',
    },
    {
      nombre: 'Lealtad y Obediencia',
      descripcion:
        'Actúa con fidelidad y solidaridad hacia todos los miembros de su institución, cumpliendo las órdenes que le imparta el superior jerárquico competente, en la medida que reúnan las formalidades del caso y tengan por objeto la realización de actos de servicio que se vinculen con las funciones a su cargo, salvo los supuestos de arbitrariedad o ilegalidad manifiestas, las que deberá poner en conocimiento del superior jerárquico de su institución.',
    },
    {
      nombre: 'Justicia y Equidad',
      descripcion:
        'Tiene permanente disposición para el cumplimiento de sus funciones, otorgando a cada uno lo que le es debido, actuando con equidad en sus relaciones con el Estado, con el administrado, con sus superiores, con sus subordinados y con la ciudadanía en general.',
    },
    {
      nombre: 'Lealtad al Estado de Derecho',
      descripcion:
        'El funcionario de confianza debe lealtad a la Constitución y al Estado de Derecho. Ocupar cargos de confianza en regímenes de facto, es causal de cese automático e inmediato de la función pública.',
    },
  ];
}
