import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { provideRouter } from '@angular/router';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show AUXILIAR menu items', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'aux',
      role: 'AUXILIAR',
    });

    fixture.detectChanges();
    const menuItems = component.menuItems();

    expect(menuItems.length).toBeGreaterThan(0);
    expect(menuItems.some((item) => item.label === 'Asistencia')).toBe(true);
    expect(menuItems.some((item) => item.label === 'Historial')).toBe(true);
  });

  it('should show ADMIN menu items', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'admin',
      role: 'ADMIN',
    });

    fixture.detectChanges();
    const menuItems = component.menuItems();

    expect(menuItems.length).toBeGreaterThan(0);
    expect(menuItems.some((item) => item.label === 'Asistencia')).toBe(false);
    expect(menuItems.some((item) => item.label === 'Estudiantes')).toBe(true);
    expect(menuItems.some((item) => item.label === 'Importación')).toBe(true);
    expect(menuItems.some((item) => item.label === 'Landing')).toBe(true);
  });

  it('should show DIRECCION menu items', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'dir',
      role: 'DIRECCION',
    });

    fixture.detectChanges();
    const menuItems = component.menuItems();

    expect(menuItems.length).toBeGreaterThan(0);
    expect(menuItems.some((item) => item.label === 'Historial')).toBe(true);
    expect(menuItems.some((item) => item.label === 'Estudiantes')).toBe(true);
    expect(menuItems.some((item) => item.label === 'Landing')).toBe(true);
  });

  it('should return empty menu when no user', () => {
    mockAuthService.getCurrentUser.and.returnValue(null);

    fixture.detectChanges();
    const menuItems = component.menuItems();

    expect(menuItems.length).toBe(0);
  });

  it('should emit itemSelected event on item click', () => {
    spyOn(component.itemSelected, 'emit');
    component.onItemClick();
    expect(component.itemSelected.emit).toHaveBeenCalled();
  });

  it('should apply collapsed class when collapsed input is true', () => {
    mockAuthService.getCurrentUser.and.returnValue({
      id: '1',
      username: 'admin',
      role: 'ADMIN',
    });

    component.collapsed = true;
    fixture.detectChanges();

    const sidebar = fixture.nativeElement.querySelector('.sidebar');
    expect(sidebar.classList.contains('collapsed')).toBe(true);
  });
});
