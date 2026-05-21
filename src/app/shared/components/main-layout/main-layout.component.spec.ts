import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainLayoutComponent } from './main-layout.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with sidebar not collapsed', () => {
    expect(component.sidebarCollapsed()).toBe(false);
  });

  it('should toggle sidebar state', () => {
    const initialState = component.sidebarCollapsed();
    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBe(!initialState);

    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBe(initialState);
  });

  it('should collapse sidebar', () => {
    component.sidebarCollapsed.set(false);
    component.collapseSidebar();
    expect(component.sidebarCollapsed()).toBe(true);
  });

  it('should render navbar, sidebar, and breadcrumb', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-internal-navbar')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-breadcrumb')).toBeTruthy();
  });

  it('should render router-outlet', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
