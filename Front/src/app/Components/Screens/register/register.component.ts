import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule} from '@angular/forms';
import { Router } from '@angular/router';
import { GameStatusService } from '../../../Services/game-status.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  constructor(private gameStatus: GameStatusService, private router: Router) { }

  nickname: string = '';

  onSubmit(form: any) {
    if (form.valid) {
      console.log('Formulario enviado:', this.nickname);
      this.gameStatus.setNickname(this.nickname);
      this.router.navigate(['/select-level']);
    } else {
      console.log('Formulario inválido');
    }
  }
}
