import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * InternalFooterComponent
 *
 * Footer para el área autenticada.
 * Muestra información de contacto y copyright.
 */
@Component({
  selector: 'app-internal-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './internal-footer.component.html',
  styleUrl: './internal-footer.component.css',
})
export class InternalFooterComponent {
  currentYear = new Date().getFullYear();

  contactInfo = {
    direccion: 'Av. De la Cultura 1550, Cusco - Perú',
    telefono: '(084) 232-456',
    email: 'contacto@clorindamatto.edu.pe',
  };
}
