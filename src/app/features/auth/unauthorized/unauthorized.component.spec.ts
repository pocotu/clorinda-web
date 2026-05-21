import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UnauthorizedComponent } from './unauthorized.component';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.model';

describe('UnauthorizedComponent', () => {
  let component: UnauthorizedComponent;
  let fixture: ComponentFixture<UnauthorizedComponent>;
  let authService: any;
  let router: any;

  beforeEach(async () => {
    authService = {
      getCurrentUser: jasmine.createSpy('getCurrentUser'),
      logout: jasmine.createSpy('logout'),
    };

    router = {
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [UnauthorizedComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(UnauthorizedComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display current user role when user is authenticated', () => {
    const mockUser: User = {
      id: '123',
      username: 'auxiliar',
      role: 'AUXILIAR',
    };

    authService.getCurrentUser.and.returnValue(mockUser);
    component.currentUser = mockUser;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Auxiliar');
  });

  it('should navigate to home when goToHome is called', () => {
    component.goToHome();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should logout and navigate to login on successful logout', () => {
    authService.logout.and.returnValue(of(void 0));

    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should navigate to login even when logout fails', () => {
    authService.logout.and.returnValue(throwError(() => new Error('Logout failed')));

    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should return correct display name for AUXILIAR role', () => {
    const displayName = component.getRoleDisplayName('AUXILIAR');
    expect(displayName).toBe('Auxiliar');
  });

  it('should return correct display name for ADMIN role', () => {
    const displayName = component.getRoleDisplayName('ADMIN');
    expect(displayName).toBe('Administrador');
  });

  it('should return correct display name for DIRECCION role', () => {
    const displayName = component.getRoleDisplayName('DIRECCION');
    expect(displayName).toBe('Dirección');
  });

  it('should return original role for unknown role', () => {
    const displayName = component.getRoleDisplayName('UNKNOWN');
    expect(displayName).toBe('UNKNOWN');
  });

  it('should display unauthorized message', () => {
    authService.getCurrentUser.and.returnValue(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acceso No Autorizado');
    expect(compiled.textContent).toContain('No tienes permisos para acceder a esta página');
  });

  it('should show logout button when user is authenticated', () => {
    const mockUser: User = {
      id: '123',
      username: 'auxiliar',
      role: 'AUXILIAR',
    };

    authService.getCurrentUser.and.returnValue(mockUser);
    component.currentUser = mockUser;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const logoutButton = compiled.querySelector('button:nth-of-type(2)');
    expect(logoutButton?.textContent).toContain('Cerrar Sesión');
  });

  it('should not show logout button when user is not authenticated', () => {
    authService.getCurrentUser.and.returnValue(null);
    component.currentUser = null;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    expect(buttons.length).toBe(1); // Only "Ir al Inicio" button
  });
});
