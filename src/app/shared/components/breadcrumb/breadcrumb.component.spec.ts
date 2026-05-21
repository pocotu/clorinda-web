import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BreadcrumbComponent } from './breadcrumb.component';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { provideRouter } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let mockRouter: any;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();

    mockRouter = {
      events: routerEventsSubject.asObservable(),
      url: '/asistencia/sesion',
      // Required by RouterLink directive when rendering [routerLink] bindings
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue('/'),
      navigate: jasmine.createSpy('navigate'),
    };

    const mockActivatedRoute = {
      root: {
        children: [],
        snapshot: { url: [] },
      },
    };

    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent, RouterTestingModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize breadcrumbs on init', () => {
    fixture.detectChanges();
    expect(component.breadcrumbs).toBeDefined();
  });

  it('should update breadcrumbs on navigation', () => {
    fixture.detectChanges();

    routerEventsSubject.next(new NavigationEnd(1, '/estudiantes', '/estudiantes'));

    expect(component.breadcrumbs).toBeDefined();
  });

  it('should map route segments to readable labels', () => {
    const label = (component as any).getRouteLabel('asistencia');
    expect(label).toBe('Asistencia');
  });

  it('should capitalize unknown routes', () => {
    const label = (component as any).getRouteLabel('unknown');
    expect(label).toBe('Unknown');
  });

  it('should not show breadcrumb for UUID segments', () => {
    const label = (component as any).getRouteLabel('123e4567-e89b-12d3-a456-426614174000');
    expect(label).toBe('');
  });

  it('should not show breadcrumb for numeric ID segments', () => {
    const label = (component as any).getRouteLabel('12345');
    expect(label).toBe('');
  });

  it('should render breadcrumb items', fakeAsync(() => {
    fixture.detectChanges(); // trigger constructor/ngOnInit
    component.breadcrumbs = [
      { label: 'Asistencia', url: '/asistencia' },
      { label: 'Sesión Actual', url: '/asistencia/sesion' },
    ];
    // RouterTestingModule provides a real createUrlTree so [routerLink] works.
    // Use componentRef.changeDetectorRef.detectChanges() to avoid NG0100.
    fixture.componentRef.changeDetectorRef.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const breadcrumbItems = compiled.querySelectorAll('.breadcrumb-item');

    // +1 for home item
    expect(breadcrumbItems.length).toBe(3);
  }));

  it('should not render breadcrumb when empty', () => {
    component.breadcrumbs = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.breadcrumb-container')).toBeFalsy();
  });
});
