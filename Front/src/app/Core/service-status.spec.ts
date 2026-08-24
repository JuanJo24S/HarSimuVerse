import { ServiceHealth, WAKING_GRACE_MS, deriveServiceState, parseHealth } from './service-status';

describe('deriveServiceState', () => {
  const START = 1_000_000;

  it('dice "online" en cuanto hubo una respuesta', () => {
    expect(deriveServiceState(START + 500, START, START + 1_000)).toBe('online');
  });

  it('sigue "online" aunque el contacto sea antiguo', () => {
    // El watchdog del cliente se encarga de reconectar; mientras hubo contacto,
    // afirmar "caido" seria inventar.
    expect(deriveServiceState(START, START, START + 10 * 60_000)).toBe('online');
  });

  describe('sin ninguna respuesta todavia', () => {
    it('dice "waking" al principio, no "offline"', () => {
      // Esta es la distincion que evita mentir: durante el arranque en frio lo
      // mas probable es que el servicio este despertando, no caido.
      expect(deriveServiceState(null, START, START)).toBe('waking');
      expect(deriveServiceState(null, START, START + 30_000)).toBe('waking');
    });

    it('aguanta en "waking" hasta el ultimo instante del margen', () => {
      expect(deriveServiceState(null, START, START + WAKING_GRACE_MS - 1)).toBe('waking');
    });

    it('pasa a "offline" justo al agotarse el margen', () => {
      expect(deriveServiceState(null, START, START + WAKING_GRACE_MS)).toBe('offline');
    });

    it('sigue "offline" mucho despues', () => {
      expect(deriveServiceState(null, START, START + 10 * 60_000)).toBe('offline');
    });

    it('cuenta el margen desde el primer intento, no desde el reloj cero', () => {
      // Si la red tardo en levantarse, el margen tiene que empezar cuando de
      // verdad se empezo a preguntar.
      const firstAttempt = START + 60_000;
      expect(deriveServiceState(null, firstAttempt, firstAttempt + 1_000)).toBe('waking');
    });
  });
});

describe('parseHealth', () => {
  const valid: ServiceHealth = {
    status: 'online',
    database: 'connected',
    uptimeMs: 843_000,
    timestamp: '2026-01-01T00:00:00+00:00',
  };

  it('acepta una respuesta completa', () => {
    expect(parseHealth(valid)).toEqual(valid);
  });

  it('acepta que falte database', () => {
    // Un proyecto sin base de datos omite el campo; no se inventa un valor.
    const parsed = parseHealth({ status: 'online', uptimeMs: 1_000, timestamp: 'x' });
    expect(parsed).not.toBeNull();
    expect(parsed!.database).toBeUndefined();
  });

  it('acepta database desconectada', () => {
    expect(parseHealth({ ...valid, database: 'disconnected' })!.database).toBe('disconnected');
  });

  it('descarta un database con un valor que no reconoce', () => {
    // Se ignora el campo en vez de propagar basura al estado.
    expect(parseHealth({ ...valid, database: 'quizas' })!.database).toBeUndefined();
  });

  it('rellena timestamp si no vino o no es texto', () => {
    expect(parseHealth({ status: 'online', uptimeMs: 0 })!.timestamp).toBeTruthy();
    expect(parseHealth({ ...valid, timestamp: 12345 })!.timestamp).toBeTruthy();
  });

  describe('rechaza lo que no puede usar', () => {
    it('null y tipos primitivos', () => {
      expect(parseHealth(null)).toBeNull();
      expect(parseHealth(undefined)).toBeNull();
      expect(parseHealth('online')).toBeNull();
      expect(parseHealth(42)).toBeNull();
    });

    it('un objeto vacio', () => {
      expect(parseHealth({})).toBeNull();
    });

    it('un status que no es "online"', () => {
      // El servidor solo se anuncia en linea. Cualquier otro valor es una
      // respuesta que no sabemos interpretar.
      expect(parseHealth({ status: 'offline', uptimeMs: 0 })).toBeNull();
      expect(parseHealth({ status: 'degraded', uptimeMs: 0 })).toBeNull();
    });

    it('un uptime que no es un numero usable', () => {
      expect(parseHealth({ status: 'online', uptimeMs: '843000' })).toBeNull();
      expect(parseHealth({ status: 'online', uptimeMs: -1 })).toBeNull();
      expect(parseHealth({ status: 'online', uptimeMs: NaN })).toBeNull();
      expect(parseHealth({ status: 'online', uptimeMs: Infinity })).toBeNull();
      expect(parseHealth({ status: 'online' })).toBeNull();
    });

    it('una trama del socket que no es JSON de objeto', () => {
      // Es el caso que llega por el canal en vivo: si un mensaje viene roto, el
      // parseo devuelve null y quien llama conserva el ultimo estado bueno, que
      // es mejor informacion que un estado en blanco.
      expect(parseHealth([])).toBeNull();
      expect(parseHealth('{"status":"online"}')).toBeNull();
    });
  });
});
