import { signal } from '@angular/core';

/**
 * Alternativa tactil al arrastrar y soltar: tocar la pieza y luego tocar el
 * hueco.
 *
 * Los tres juegos de arrastre (tech-memory, computer-assembly y game2) usaban
 * unicamente la API HTML5 de drag and drop, que los navegadores moviles no
 * implementan: en tablet o telefono no se podia mover ni una pieza. Como el
 * juego es para ninos de 4 a 12 anos, la tablet es justamente el dispositivo
 * mas probable.
 *
 * Esta clase mantiene la pieza seleccionada y se combina con el drag and drop
 * de escritorio, que se conserva intacto: las dos formas terminan llamando al
 * mismo metodo de colocacion.
 */
export class DragDropSelection {
  /** Identificador de la pieza tocada, o null si no hay ninguna. */
  readonly selected = signal<string | null>(null);

  /** Toca una pieza. Volver a tocar la misma la deselecciona. */
  select(id: string): void {
    this.selected.set(this.selected() === id ? null : id);
  }

  /**
   * Deja una pieza seleccionada sin alternar.
   *
   * Para el arrastre de escritorio hay que usar esto y no select(): al empezar
   * a arrastrar una pieza que ya estaba tocada, el toggle de select() la
   * DESELECCIONABA justo al iniciar el arrastre. Solo funcionaba de milagro
   * porque el id tambien viaja en dataTransfer; en cuanto el navegador no lo
   * entrega (algunos casos de arrastre entre marcos), la pieza se soltaba en el
   * vacio.
   */
  arm(id: string): void {
    this.selected.set(id);
  }

  isSelected(id: string): boolean {
    return this.selected() === id;
  }

  clear(): void {
    this.selected.set(null);
  }

  /**
   * Devuelve el origen de una colocacion.
   *
   * @param dropped Lo que traiga el evento de drop (dataTransfer). Si viene
   *   vacio se asume que la interaccion fue por toque.
   */
  resolveSource(dropped?: string | null): string | null {
    const source = dropped && dropped.length > 0 ? dropped : this.selected();
    return source && source.length > 0 ? source : null;
  }
}

/**
 * Lee el identificador arrastrado de un evento de drop.
 * Centralizado porque cada juego lo hacia con un `!` distinto y sin comprobar
 * que dataTransfer existiera.
 */
export function readDraggedId(event: DragEvent): string {
  return event.dataTransfer?.getData('text/plain') ?? '';
}

/** Marca un evento de dragstart con el identificador de la pieza. */
export function writeDraggedId(event: DragEvent, id: string): void {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
  }
}

/** Permite el drop sobre el elemento. Sin esto el navegador lo rechaza. */
export function allowDrop(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}
