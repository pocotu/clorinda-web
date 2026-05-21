import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InternalNavbarComponent } from './internal-navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('InternalNavbarComponent', () => {
  let component: InternalNavbarComponent;
  let fixture: ComponentFixture<InternalNavbarComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'logout']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [InternalNavbarComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InternalNavbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get current user from auth service', () => {
    const mockUser = { id: '1', username: 'testuser', role: 'ADMIN' as const };
    mockAuthService.getCurrentUser.and.returnValue(mockUser);

    expect(component.currentUser).toEqual(mockUser);
  });

  it('should return correct role name for AUXILIAR', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'aux',
      role: 'AUXILIAR',
    });
    expect(component.roleName).toBe('Auxiliar');
  });

  it('should return correct role name for ADMIN', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'admin',
      role: 'ADMIN',
    });
    expect(component.roleName).toBe('Administrador');
  });

  it('should return correct role name for DIRECCION', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'dir',
      role: 'DIRECCION',
    });
    expect(component.roleName).toBe('Dirección');
  });

  it('should emit toggleSidebar event', () => {
    spyOn(component.toggleSidebar, 'emit');
    component.onToggleSidebar();
    expect(component.toggleSidebar.emit).toHaveBeenCalled();
  });

  it('should toggle user menu', () => {
    expect(component.userMenuOpen).toBe(false);
    component.toggleUserMenu();
    expect(component.userMenuOpen).toBe(true);
    component.toggleUserMenu();
    expect(component.userMenuOpen).toBe(false);
  });

  it('should close user menu', () => {
    component.userMenuOpen = true;
    component.closeUserMenu();
    expect(component.userMenuOpen).toBe(false);
  });

  it('should logout and navigate to login on success', () => {
    mockAuthService.logout.and.returnValue(of(void 0));

    component.logout();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should navigate to login even on logout error', () => {
    mockAuthService.logout.and.returnValue(throwError(() => new Error('Logout failed')));

    component.logout();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
