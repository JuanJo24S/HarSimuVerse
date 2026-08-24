import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Subscription } from 'rxjs';

import { Body, Data, PartialData } from '../../../Models/data';
import { AudioService } from '../../../Services/audio.service';
import { GameDataService } from '../../../Services/game-data.service';
import { GameStatusService } from '../../../Services/game-status.service';
import { ServiceStatusBadgeComponent } from '../../Shared/service-status-badge/service-status-badge.component';

@Component({
  selector: 'app-score',
  imports: [TitleCasePipe, ServiceStatusBadgeComponent],
  templateUrl: './score.component.html',
  styleUrl: './score.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreComponent implements OnInit {
  private readonly gameStatus = inject(GameStatusService);
  private readonly gameData = inject(GameDataService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly scores = signal<Data | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** Estado del envio del puntaje de esta partida. */
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /*
    La posicion vive en el servicio (y en sessionStorage), no en un signal
    local. Al refrescar la pantalla de resultados el POST no se repite porque
    `submitted` ya esta a true, asi que un signal local se quedaba en null y la
    plantilla mostraba "esta vez no alcanzo para el top 5" aunque el jugador
    hubiera quedado primero.
  */
  readonly position = this.gameStatus.position;

  /**
   * Las dos tablas del ranking. Antes el bloque de <table> estaba duplicado
   * palabra por palabra en la plantilla, una vez para kids y otra para junior,
   * con solo el color y el titulo cambiados. Cualquier arreglo habia que
   * aplicarlo dos veces.
   */
  readonly boards = [
    { key: 'kids' as const, label: 'Kids', icon: '👶', accent: 'text-pink-400' },
    { key: 'junior' as const, label: 'Junior', icon: '🧠', accent: 'text-sky-400' },
  ];

  /** Cuantos puestos guarda el backend. Lo confirma la respuesta del POST. */
  readonly topLimit = 5;

  readonly nickname = computed(() => this.gameStatus.nickname());
  readonly score = computed(() => this.gameStatus.score());
  readonly difficult = computed(() => this.gameStatus.difficult());
  readonly saved = computed(() => this.gameStatus.submitted());

  /** Peticiones en vuelo, para poder cancelarlas y no solaparlas. */
  private submitSub: Subscription | null = null;
  private rankingSub: Subscription | null = null;

  constructor() {
    /*
      Un solo registro de limpieza. Antes cada llamada a submitScore() y a
      loadRanking() hacia su propio destroyRef.onDestroy(...), asi que cada
      reintento del jugador dejaba otro callback acumulado en el componente.
    */
    this.destroyRef.onDestroy(() => {
      this.submitSub?.unsubscribe();
      this.rankingSub?.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.audio.playDefault();

    /*
      Antes esto era `this.submitScore(); this.loadRanking();`. Los dos salian
      en el mismo tick y, como submitScore() vuelve a pedir el ranking cuando el
      POST responde, quedaban dos GET compitiendo: si el primero (lanzado antes
      de que existiera el puntaje) contestaba de ultimo, la tabla se pintaba sin
      la fila recien guardada y el jugador no se veia en el top.

      Ahora hay un solo camino: si queda algo por enviar, el ranking se pide
      cuando el POST termina (bien o mal); si no, se pide directamente.
    */
    if (this.gameStatus.submitted() || !this.gameStatus.hasActiveRun()) {
      this.loadRanking();
      return;
    }

    /*
      El POST del puntaje vivia duplicado dentro de dos minijuegos
      (computer-assembly y game6). Eso traia tres problemas:

        - Sin feedback: la subscripcion solo hacia console.error, asi que si el
          backend estaba caido el jugador veia su ranking sin su puntaje y
          nunca se enteraba de que no se guardo.
        - Envio doble: la peticion salia justo antes de router.navigate, y
          volver con el boton "atras" y avanzar otra vez repetia el POST.
        - Solo dos de los seis niveles lo enviaban: terminar por otro camino
          dejaba la partida sin registrar.

      Ahora se envia una sola vez desde aqui, con el flag `submitted` como
      guarda, y con boton de reintento si falla.
    */
    this.submitScore();
  }

  /** Envia el puntaje de la partida si aun no se habia enviado. */
  submitScore(): void {
    if (this.gameStatus.submitted() || this.saving()) {
      return;
    }

    if (!this.gameStatus.hasActiveRun()) {
      return;
    }

    const payload: PartialData = {
      difficult: this.difficult(),
      nickname: this.nickname(),
      score: this.score(),
    };

    this.saving.set(true);
    this.saveError.set(null);

    this.submitSub?.unsubscribe();
    this.submitSub = this.gameData.setData(payload).subscribe({
      next: response => {
        // Se marca como enviado antes de recargar el ranking para que un
        // reintento manual no duplique la fila.
        this.gameStatus.setSubmitted(true);
        this.gameStatus.setPosition(response.ranking?.position ?? null);
        this.saving.set(false);
        this.loadRanking();
      },
      error: (error: Error) => {
        this.saveError.set(error.message);
        this.saving.set(false);
        // Aunque el guardado falle, el ranking que ya existe si se puede
        // mostrar: antes un POST fallido dejaba la pantalla sin tablas.
        this.loadRanking();
      },
    });
  }

  loadRanking(): void {
    this.loading.set(true);
    this.loadError.set(null);

    // Cancelar la anterior evita que un reintento y la peticion original
    // compitan por pintar la tabla.
    this.rankingSub?.unsubscribe();
    this.rankingSub = this.gameData.getScores().subscribe({
      next: response => {
        this.scores.set(response);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.loadError.set(error.message);
        this.loading.set(false);
      },
    });
  }

  rowsFor(key: 'kids' | 'junior'): Body[] {
    return this.scores()?.[key] ?? [];
  }

  /**
   * La fila del jugador actual, para resaltarla.
   *
   * Compara tambien la dificultad: sin eso, un jugador llamado igual en la otra
   * tabla salia marcado como si fuera el.
   */
  isMe(item: Body, key: 'kids' | 'junior'): boolean {
    return item.nickname === this.nickname() && this.difficult() === key;
  }

  /** Vuelve a jugar la misma dificultad desde el nivel 1. */
  playAgain(): void {
    const difficulty = this.difficult();
    this.gameStatus.restartRun();
    void this.router.navigate([`/${difficulty}`, 'level-1']);
  }

  /** Empieza de cero: nuevo jugador. */
  goHome(): void {
    this.gameStatus.resetAll();
    void this.router.navigate(['/home']);
  }
}
