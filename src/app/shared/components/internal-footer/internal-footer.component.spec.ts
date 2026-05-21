import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InternalFooterComponent } from './internal-footer.component';

describe('InternalFooterComponent', () => {
  let component: InternalFooterComponent;
  let fixture: ComponentFixture<InternalFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalFooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InternalFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display current year', () => {
    const currentYear = new Date().getFullYear();
    expect(component.currentYear).toBe(currentYear);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(currentYear.toString());
  });

  it('should display contact information', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain(component.contactInfo.direccion);
    expect(compiled.textContent).toContain(component.contactInfo.telefono);
    expect(compiled.textContent).toContain(component.contactInfo.email);
  });

  it('should have contact info object with required fields', () => {
    expect(component.contactInfo.direccion).toBeDefined();
    expect(component.contactInfo.telefono).toBeDefined();
    expect(component.contactInfo.email).toBeDefined();
  });

  it('should render footer with proper structure', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.internal-footer')).toBeTruthy();
    expect(compiled.querySelector('.footer-info')).toBeTruthy();
    expect(compiled.querySelector('.copyright')).toBeTruthy();
  });
});
