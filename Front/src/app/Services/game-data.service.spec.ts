import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { GameDataService } from './game-data.service';

describe('GameDataService (localStorage)', () => {
  let service: GameDataService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameDataService);
  });

  afterEach(() => localStorage.clear());

  it('empieza sin puntajes', async () => {
    expect(await firstValueFrom(service.getScores())).toEqual({ kids: [], junior: [] });
  });

  it('guarda un puntaje y lo devuelve', async () => {
    await firstValueFrom(service.setData({ difficult: 'kids', nickname: 'ana', score: 100 }));

    const scores = await firstValueFrom(service.getScores());
    expect(scores.kids.length).toBe(1);
    expect(scores.kids[0].nickname).toBe('ana');
    expect(scores.kids[0].score).toBe(100);
  });

  it('sobrevive a recargar (persiste en localStorage)', async () => {
    await firstValueFrom(service.setData({ difficult: 'kids', nickname: 'ana', score: 100 }));

    // Una instancia nueva simula la siguiente carga de la pagina.
    const other = new GameDataService();
    expect((await firstValueFrom(other.getScores())).kids.length).toBe(1);
  });

  it('ordena de mayor a menor', async () => {
    for (const [nickname, score] of [['ana', 100], ['beto', 300], ['caro', 200]] as const) {
      await firstValueFrom(service.setData({ difficult: 'kids', nickname, score }));
    }

    const kids = (await firstValueFrom(service.getScores())).kids;
    expect(kids.map(k => k.nickname)).toEqual(['beto', 'caro', 'ana']);
  });

  it('conserva como maximo 5 por dificultad', async () => {
    for (let i = 1; i <= 8; i++) {
      await firstValueFrom(service.setData({ difficult: 'kids', nickname: `jugador${i}`, score: i * 10 }));
    }

    expect((await firstValueFrom(service.getScores())).kids.length).toBe(5);
  });

  it('no mezcla las dos dificultades', async () => {
    await firstValueFrom(service.setData({ difficult: 'kids', nickname: 'ana', score: 100 }));
    await firstValueFrom(service.setData({ difficult: 'junior', nickname: 'beto', score: 200 }));

    const scores = await firstValueFrom(service.getScores());
    expect(scores.kids.map(k => k.nickname)).toEqual(['ana']);
    expect(scores.junior.map(j => j.nickname)).toEqual(['beto']);
  });

  describe('posicion devuelta', () => {
    it('informa el puesto conseguido', async () => {
      await firstValueFrom(service.setData({ difficult: 'kids', nickname: 'alto', score: 500 }));

      const res = await firstValueFrom(
        service.setData({ difficult: 'kids', nickname: 'medio', score: 200 })
      );

      expect(res.ranking.position).toBe(2);
      expect(res.ranking.in_top).toBeTrue();
    });

    it('devuelve null si no alcanzo el top', async () => {
      for (let i = 0; i < 5; i++) {
        await firstValueFrom(service.setData({ difficult: 'kids', nickname: `alto${i}`, score: 900 }));
      }

      const res = await firstValueFrom(
        service.setData({ difficult: 'kids', nickname: 'ultimo', score: 1 })
      );

      expect(res.ranking.position).toBeNull();
      expect(res.ranking.in_top).toBeFalse();
    });
  });

  describe('validacion (la que antes hacia el backend)', () => {
    it('rechaza una dificultad desconocida', async () => {
      await expectAsync(
        firstValueFrom(service.setData({ difficult: 'imposible', nickname: 'ana', score: 10 }))
      ).toBeRejected();
    });

    it('rechaza un nickname demasiado corto', async () => {
      await expectAsync(
        firstValueFrom(service.setData({ difficult: 'kids', nickname: 'a', score: 10 }))
      ).toBeRejected();
    });

    it('normaliza espacios del nickname', async () => {
      await firstValueFrom(
        service.setData({ difficult: 'kids', nickname: '  juan   perez  ', score: 10 })
      );

      expect((await firstValueFrom(service.getScores())).kids[0].nickname).toBe('juan perez');
    });

    it('acota un puntaje negativo o absurdo', async () => {
      await firstValueFrom(service.setData({ difficult: 'kids', nickname: 'ana', score: -50 }));
      await firstValueFrom(service.setData({ difficult: 'junior', nickname: 'beto', score: 9_999_999 }));

      const scores = await firstValueFrom(service.getScores());
      expect(scores.kids[0].score).toBe(0);
      expect(scores.junior[0].score).toBe(100_000);
    });
  });

  describe('almacen corrupto', () => {
    it('no rompe si el JSON es ilegible', async () => {
      // Mejor un ranking vacio que una excepcion en la pantalla de resultados.
      localStorage.setItem('harsimuverse:scores', 'esto no es json');

      expect(await firstValueFrom(service.getScores())).toEqual({ kids: [], junior: [] });
    });

    it('descarta entradas con forma inesperada', async () => {
      localStorage.setItem(
        'harsimuverse:scores',
        JSON.stringify({ kids: [{ id: 1, nickname: 'ok', score: 10 }, { roto: true }, null], junior: 'no-es-lista' })
      );

      const scores = await firstValueFrom(service.getScores());
      expect(scores.kids.length).toBe(1);
      expect(scores.junior).toEqual([]);
    });
  });

  it('clear() vacia el ranking', async () => {
    await firstValueFrom(service.setData({ difficult: 'kids', nickname: 'ana', score: 100 }));
    service.clear();

    expect((await firstValueFrom(service.getScores())).kids).toEqual([]);
  });
});
