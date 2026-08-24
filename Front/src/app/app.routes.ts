import { Routes } from '@angular/router';

import { gameSessionGuard, scoreScreenGuard } from './Core/game-session.guard';

/**
 * Todas las pantallas se cargan con loadComponent.
 *
 * Antes solo el selector era lazy y los seis minijuegos se importaban de forma
 * estatica, asi que el bundle inicial arrastraba los seis (con sus preguntas,
 * listas de piezas y CSS) solo para mostrar el formulario de registro.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'HarSimuVerse — Crea tu heroe',
    loadComponent: () =>
      import('./Components/Screens/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'select-level',
    title: 'HarSimuVerse — Elige tu edad',
    loadComponent: () =>
      import('./Components/Screens/selector/selector.component').then(m => m.SelectorComponent),
  },
  {
    path: 'kids',
    canActivate: [gameSessionGuard],
    children: [
      {
        path: 'level-1',
        title: 'Kids — Nivel 1',
        loadComponent: () =>
          import('./Components/Screens/Game/tech-memory/tech-memory.component').then(
            m => m.TechMemoryComponent
          ),
      },
      {
        path: 'level-2',
        title: 'Kids — Nivel 2',
        loadComponent: () =>
          import('./Components/Screens/Game/game1/game1.component').then(m => m.Game1Component),
      },
      {
        path: 'level-3',
        title: 'Kids — Nivel 3',
        loadComponent: () =>
          import('./Components/Screens/Game/computer-assembly/computer-assembly.component').then(
            m => m.ComputerAssemblyComponent
          ),
      },
      { path: '', redirectTo: 'level-1', pathMatch: 'full' },
    ],
  },
  {
    path: 'junior',
    canActivate: [gameSessionGuard],
    children: [
      {
        path: 'level-1',
        title: 'Junior — Nivel 1',
        loadComponent: () =>
          import('./Components/Screens/Game/game2/game2.component').then(m => m.Game2Component),
      },
      {
        path: 'level-2',
        title: 'Junior — Nivel 2',
        loadComponent: () =>
          import('./Components/Screens/Game/game3/game3.component').then(m => m.Game3Component),
      },
      {
        path: 'level-3',
        title: 'Junior — Nivel 3',
        loadComponent: () =>
          import('./Components/Screens/Game/game6/game6.component').then(m => m.Game6Component),
      },
      { path: '', redirectTo: 'level-1', pathMatch: 'full' },
    ],
  },
  {
    path: 'score',
    title: 'HarSimuVerse — Resultados',
    canActivate: [scoreScreenGuard],
    loadComponent: () =>
      import('./Components/Screens/score/score.component').then(m => m.ScoreComponent),
  },
  {
    // Comodin: antes una URL inexistente dejaba la pantalla en blanco sin
    // ningun mensaje ni forma de volver.
    path: '**',
    redirectTo: 'home',
  },
];
