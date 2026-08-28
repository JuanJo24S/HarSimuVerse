import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

interface Screen {
  title: string;
  description: string;
  image: string;
  alt: string;
}

interface Highlight {
  title: string;
  description: string;
}

/**
 * Presentacion publica del proyecto.
 *
 * A quien va dirigida: alguien que llega desde un perfil o un CV, no un nino.
 * Por eso vive fuera del juego, en /info, y no se le cruza a quien viene a
 * jugar: la unica puerta esta en un enlace discreto de la pantalla de registro.
 *
 * El objetivo es que en un par de minutos se entienda que hace la aplicacion,
 * como esta construida y quien la hizo, sin tener que jugar los seis niveles ni
 * abrir el repositorio.
 */
@Component({
  selector: 'app-info',
  imports: [],
  templateUrl: './info.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoComponent {
  private readonly router = inject(Router);

  readonly linkedinUrl =
    'https://www.linkedin.com/in/juan-jose-valbuena-camacho-848549278';
  readonly githubUrl = 'https://github.com/JuanJo24S';
  readonly repoUrl = 'https://github.com/JuanJo24S/HarSimuVerse';
  readonly email = 'Juanjosecodes24@gmail.com';

  readonly stack = [
    'Angular 19',
    'TypeScript',
    'Tailwind CSS 4',
    'Signals',
    'SweetAlert2',
    'Docker',
    'Vercel',
  ];

  /**
   * Las decisiones que no se ven jugando pero explican como esta hecho.
   *
   * Se cuentan como problema y solucion, no como lista de tecnologias: lo que
   * distingue un proyecto de otro no es que use Angular, sino que decisiones se
   * tomaron y por que.
   */
  readonly highlights: Highlight[] = [
    {
      title: 'Funciona con el dedo, no solo con el ratón',
      description:
        'Los tres niveles de arrastre usaban únicamente la API de drag and drop de HTML5, que los ' +
        'navegadores móviles no implementan: en una tablet no se podía mover ni una pieza. Ahora ' +
        'cada colocación admite dos caminos —arrastrar o tocar origen y destino— que terminan en el ' +
        'mismo punto del código, así que puntúan y validan igual.',
    },
    {
      title: 'Sin servidor, a propósito',
      description:
        'El proyecto tuvo una API en Laravel con PostgreSQL para guardar los puntajes. Vivía en un ' +
        'plan gratuito que se suspende por inactividad y tarda cerca de un minuto en volver, con una ' +
        'cuota mensual que se agota si se mantiene despierto. Mover el ranking a localStorage eliminó ' +
        'esa capa entera; el precio, asumido a conciencia, es que los puntajes son de cada navegador.',
    },
    {
      title: 'El color nunca es la única señal',
      description:
        'Acertar y fallar se distinguen por color, símbolo y movimiento a la vez. Un niño que no ' +
        'diferencia rojo de verde entiende lo mismo que los demás, y el reloj en tiempo bajo no solo ' +
        'cambia de color: crece, se enmarca y late.',
    },
    {
      title: 'Áreas táctiles pensadas para la edad real',
      description:
        'Los 44 px que se citan como mínimo táctil son una referencia para adultos. Aquí los ' +
        'controles suben a 56–64 px y las piezas arrastrables a 116, porque quien juega tiene cuatro ' +
        'años. Están declarados como tokens del tema, no como números sueltos en cada pantalla.',
    },
    {
      title: 'Un solo tema en vez de once hojas de estilo',
      description:
        'El estilo vivía en once archivos CSS escritos a mano, y por eso convivían cuatro paletas ' +
        'distintas en la misma aplicación. Los tokens pasaron a @theme de Tailwind: el CSS de ' +
        'componente bajó de 2.295 a 427 líneas y ninguna pantalla puede inventarse un color sin que ' +
        'se note.',
    },
  ];

  readonly screens: Screen[] = [
    {
      title: 'Crear el héroe',
      description:
        'Solo pide un nombre: sin cuentas, contraseñas ni correo. El usuario tiene cuatro años y ' +
        'puede estar usando la tablet del salón.',
      image: 'assets/screens/register.webp',
      alt: 'Pantalla donde se escribe el nombre del jugador',
    },
    {
      title: 'Elegir la edad',
      description:
        'Dos grupos, cada uno con su rango y con lo que va a encontrar dentro, para que la elección ' +
        'no sea a ciegas.',
      image: 'assets/screens/age-selector.webp',
      alt: 'Selector entre las dificultades Kids y Junior',
    },
    {
      title: 'Kids · Cada nombre a su dibujo',
      description:
        'Doce nombres y doce iconos. La instrucción sigue el estado —"toca un nombre", luego "toca ' +
        'el dibujo"— en lugar de ser un cartel fijo que se lee como decoración.',
      image: 'assets/screens/kids-1-names.webp',
      alt: 'Nivel de asociación entre nombres e iconos',
    },
    {
      title: 'Kids · Encuentra las parejas',
      description:
        'Memoria con las doce piezas del computador. El tablero se reacomoda solo al ancho de la ' +
        'pantalla, así que en una tablet vertical no se sale por los lados.',
      image: 'assets/screens/kids-2-memory.webp',
      alt: 'Tablero de memoria con cartas boca abajo',
    },
    {
      title: 'Kids · Armar el computador',
      description:
        'Los huecos del escritorio están posicionados en porcentajes sobre un contenedor con ' +
        'proporción fija, de modo que escalan igual en cualquier pantalla sin solaparse.',
      image: 'assets/screens/kids-3-assembly.webp',
      alt: 'Escritorio con huecos para monitor, teclado, ratón y torre',
    },
    {
      title: 'Junior · El computador por dentro',
      description:
        'Ocho componentes internos y sus ranuras, en orden distinto para que no se resuelva por ' +
        'posición. Al acertar se marca en verde con un check; al fallar, la ranura se sacude.',
      image: 'assets/screens/junior-1-internals.webp',
      alt: 'Piezas internas del computador y sus ranuras',
    },
    {
      title: 'Junior · Preguntas de repaso',
      description:
        'Cinco preguntas con navegación hacia atrás y adelante, conservando lo ya respondido, y un ' +
        'resumen final que muestra en qué se falló.',
      image: 'assets/screens/junior-2-quiz.webp',
      alt: 'Cuestionario de opción múltiple',
    },
    {
      title: 'Junior · Cinco niveles de preguntas',
      description:
        'Quince preguntas en cinco bloques temáticos, cada una con pista antes de responder y ' +
        'explicación después. Mientras el aviso está abierto el reloj se congela, para que leer no ' +
        'cueste segundos de partida.',
      image: 'assets/screens/junior-3-quiz.webp',
      alt: 'Cuestionario por niveles con pista y explicación',
    },
    {
      title: 'Resultados',
      description:
        'El puesto conseguido y el top 5 de cada dificultad, con la fila propia marcada para no ' +
        'tener que buscarse.',
      image: 'assets/screens/results.webp',
      alt: 'Pantalla de resultados con el ranking',
    },
  ];

  play(): void {
    void this.router.navigate(['/home']);
  }
}
