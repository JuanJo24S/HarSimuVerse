import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideSweetAlert2 } from '@sweetalert2/ngx-sweetalert2';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Al cambiar de nivel la vista debe empezar arriba, no donde quedo el
      // scroll del nivel anterior.
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      // Vuelve a ejecutar los guards y a recrear el componente cuando se
      // navega a la misma ruta (reintentar el mismo nivel).
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),

    provideSweetAlert2({
      fireOnInit: false,
      dismissOnDestroy: true,
    }),
  ],
};
