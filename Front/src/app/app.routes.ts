import { Routes } from '@angular/router';
import { RegisterComponent } from './Components/Screens/register/register.component';
import { TechMemoryComponent } from './Components/Screens/Game/tech-memory/tech-memory.component';
import { Game1Component } from './Components/Screens/Game/game1/game1.component';
import { ComputerAssemblyComponent } from './Components/Screens/Game/computer-assembly/computer-assembly.component';
import { Game2Component } from './Components/Screens/Game/game2/game2.component';
import { Game3Component } from './Components/Screens/Game/game3/game3.component';
import { Game6Component } from './Components/Screens/Game/game6/game6.component';
import { ScoreComponent } from './Components/Screens/score/score.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: RegisterComponent
  },
  {
    path: 'select-level',
    loadComponent: () => import('./Components/Screens/selector/selector.component').then(m => m.SelectorComponent)
  },
  {
    path: 'kids',
    children:[
      {path:'level-1', component: TechMemoryComponent},
      {path:'level-2', component: Game1Component},
      {path:'level-3', component: ComputerAssemblyComponent},
    ]
  },
  {
    path: 'junior',
    children:[
      {path:'level-1', component: Game2Component},
      {path:'level-2', component: Game3Component},
      {path:'level-3', component: Game6Component},
    ]
  },
  {
    path:'score',
    component: ScoreComponent
  }

];
