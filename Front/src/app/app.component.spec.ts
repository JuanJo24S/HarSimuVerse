import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

/*
  Este archivo era el spec que genera `ng new`: comprobaba que el titulo fuera
  'Front' (el nombre del proyecto) y que la plantilla dijera "Hello, Front".
  Nunca se actualizo, asi que fallaba desde el primer cambio real de la app.
  Ahora prueba lo que el componente hace de verdad: el splash que habilita el
  audio.
*/
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('se construye', () => {
    expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();
  });

  it('empieza mostrando el splash', () => {
    // El splash tapa la app hasta el primer click, que es el gesto que el
    // navegador exige para permitir el audio.
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.showSplash()).toBeTrue();
  });

  it('pinta el splash como boton, no como div', () => {
    // Tiene que ser un boton real para que se pueda activar con teclado y lo
    // anuncien los lectores de pantalla.
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    // Se busca por aria-label y no por clase: el estilo son utilidades de
    // Tailwind, que cambian; el nombre accesible es el contrato real.
    const splash = (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Entrar al juego"]'
    );
    expect(splash).withContext('el splash debe ser un <button> con nombre accesible').not.toBeNull();
  });

  it('oculta el splash al entrar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.enterApp();
    expect(fixture.componentInstance.showSplash()).toBeFalse();
  });
});
