import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

/**
 * ClickOutsideDirective
 *
 * Directiva que emite un evento cuando se hace click fuera del elemento.
 * Útil para cerrar dropdowns y modales.
 *
 * Uso:
 * <div (clickOutside)="closeDropdown()">...</div>
 */
@Directive({
  selector: '[clickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
