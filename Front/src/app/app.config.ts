import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideSweetAlert2 } from '@sweetalert2/ngx-sweetalert2';

import { routes } from './app.routes';
import { ServiceStatusService } from './Services/service-status.service';

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
    provideHttpClient(withFetch()),

    /*
      Arranca el cliente de estado una sola vez, al cargar la aplicacion.

      NO devuelve promesa a proposito. Si se esperara aqui a la respuesta, con el
      servidor dormido la aplicacion no pintaria nada durante el minuto largo que
      tarda en despertar: justo la pantalla en blanco que este sistema existe
      para eliminar. Lo que hace falta es que la peticion SALGA cuanto antes
      —empieza a despertar el servicio— mientras la interfaz se pinta y muestra
      que esta despertando.
    */
    provideAppInitializer(() => {
      inject(ServiceStatusService).start();
    }),
    provideSweetAlert2({
      fireOnInit: false,
      dismissOnDestroy: true,
    }),
  ],
};
