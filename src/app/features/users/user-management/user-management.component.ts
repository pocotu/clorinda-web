import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserListItem } from '../../../core/models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Signals
  users = signal<UserListItem[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Selection & Modal Signals
  confirmingUserId = signal<string | null>(null);
  showCreateModal = signal<boolean>(false);
  showPasswordModal = signal<boolean>(false);
  selectedUser = signal<UserListItem | null>(null);

  // Forms
  createForm!: FormGroup;
  passwordForm!: FormGroup;

  // Get current logged-in user
  currentUser = computed(() => this.authService.getCurrentUser());

  ngOnInit(): void {
    this.initForms();
    this.loadUsers();
  }

  private initForms(): void {
    this.createForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-z0-9_-]+$/),
        ],
      ],
      role: ['AUXILIAR', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.usersService.getUsers().subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error.set('No se pudieron cargar los usuarios del sistema.');
        this.isLoading.set(false);
      },
    });
  }

  // Modals management
  openCreateModal(): void {
    this.createForm.reset({ role: 'AUXILIAR' });
    this.error.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  openPasswordModal(user: UserListItem): void {
    this.selectedUser.set(user);
    this.passwordForm.reset();
    this.error.set(null);
    this.showPasswordModal.set(true);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.selectedUser.set(null);
  }

  // Form Validation Helpers
  isFieldInvalid(form: FormGroup, field: string): boolean {
    const control = form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
    if (!control) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo es requerido.';
    }
    if (control.hasError('minlength')) {
      const min = control.errors?.['minlength'].requiredLength;
      return `Debe tener al menos ${min} caracteres.`;
    }
    if (control.hasError('maxlength')) {
      const max = control.errors?.['maxlength'].requiredLength;
      return `No puede exceder los ${max} caracteres.`;
    }
    if (control.hasError('pattern')) {
      return 'Solo letras minúsculas, números, guiones (-) y guiones bajos (_).';
    }
    return '';
  }

  passwordsMatch(form: FormGroup): boolean {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password === confirm;
  }

  // Actions
  onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    if (!this.passwordsMatch(this.createForm)) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const { username, role, password } = this.createForm.value;

    this.usersService.createUser({ username, role, password }).subscribe({
      next: () => {
        this.closeCreateModal();
        this.showSuccess('Usuario creado exitosamente.');
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error creating user:', err);
        const backendMsg = err.error?.error?.message;
        this.error.set(backendMsg || 'Error al crear el usuario. Inténtelo de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (!this.passwordsMatch(this.passwordForm)) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    const user = this.selectedUser();
    if (!user) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const { password } = this.passwordForm.value;

    this.usersService.updatePassword(user.id, password).subscribe({
      next: () => {
        this.closePasswordModal();
        this.showSuccess(`Contraseña cambiada exitosamente para ${user.username}.`);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error updating password:', err);
        const backendMsg = err.error?.error?.message;
        this.error.set(backendMsg || 'Error al cambiar la contraseña.');
        this.isLoading.set(false);
      },
    });
  }

  // Toggle status with inline confirmation
  askToggleActive(userId: string): void {
    this.confirmingUserId.set(userId);
    this.error.set(null);
  }

  cancelToggleActive(): void {
    this.confirmingUserId.set(null);
  }

  confirmToggleActive(user: UserListItem): void {
    const nextState = !user.isActive;
    this.confirmingUserId.set(null);
    this.isLoading.set(true);
    this.error.set(null);

    this.usersService.toggleActive(user.id, nextState).subscribe({
      next: () => {
        const action = nextState ? 'activado' : 'desactivado';
        this.showSuccess(`Usuario ${user.username} ${action} correctamente.`);
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error toggling active status:', err);
        const backendMsg = err.error?.error?.message;
        this.error.set(backendMsg || 'Error al cambiar el estado del usuario.');
        this.isLoading.set(false);
      },
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 4000);
  }

  // Formatter Date Helper
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
