import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  contactInfo = {
    direccion: 'Av. De la Cultura 1550, Cusco - Perú',
    telefono: '(084) 232-456',
    email: 'contacto@clorindamatto.edu.pe',
    horario: 'Lunes a Viernes: 8:00 AM - 5:00 PM',
  };

  socialLinks = [
    { name: 'Facebook', url: '#', icon: 'facebook' },
    { name: 'Instagram', url: '#', icon: 'instagram' },
    { name: 'YouTube', url: '#', icon: 'youtube' },
  ];
}
