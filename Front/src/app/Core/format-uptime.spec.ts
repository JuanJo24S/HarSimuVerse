import { describeUptime, formatUptime } from './format-uptime';

describe('formatUptime', () => {
  it('devuelve "desconocido" cuando no hay dato', () => {
    expect(formatUptime(null)).toBe('desconocido');
  });

  it('rechaza valores imposibles en vez de mostrarlos', () => {
    // Un uptime negativo o NaN solo puede venir de un servidor mal configurado
    // o de una respuesta corrupta. Mostrar "-3 minutos" seria peor que admitir
    // que no se sabe.
    expect(formatUptime(-1)).toBe('desconocido');
    expect(formatUptime(NaN)).toBe('desconocido');
    expect(formatUptime(Infinity)).toBe('desconocido');
  });

  describe('primer minuto', () => {
    it('trata el cero como menos de un minuto', () => {
      expect(formatUptime(0)).toBe('menos de un minuto');
    });

    it('sigue por debajo del minuto en el segundo 59', () => {
      expect(formatUptime(59_000)).toBe('menos de un minuto');
    });

    it('cambia justo al llegar al minuto', () => {
      expect(formatUptime(60_000)).toBe('1 minuto');
    });

    it('usa singular solo en el minuto 1', () => {
      expect(formatUptime(60_000)).toBe('1 minuto');
      expect(formatUptime(120_000)).toBe('2 minutos');
    });
  });

  describe('minutos exactos por debajo de la hora', () => {
    it('no redondea: es la escala que distingue un arranque en frio', () => {
      expect(formatUptime(7 * 60_000)).toBe('7 minutos');
      expect(formatUptime(43 * 60_000)).toBe('43 minutos');
    });

    it('trunca los segundos sobrantes hacia abajo', () => {
      // 5 min 59 s siguen siendo 5 minutos: nunca se redondea hacia arriba,
      // porque exagerar el uptime da una falsa sensacion de servicio asentado.
      expect(formatUptime(5 * 60_000 + 59_000)).toBe('5 minutos');
    });

    it('aguanta en minutos hasta el ultimo antes de la hora', () => {
      expect(formatUptime(59 * 60_000)).toBe('59 minutos');
    });
  });

  describe('cambio a horas', () => {
    it('pasa a horas justo al cumplirse la primera', () => {
      expect(formatUptime(60 * 60_000)).toBe('más de 1 hora');
    });

    it('redondea hacia abajo a partir de la hora', () => {
      // 3 h 59 min son "mas de 3 horas": a esta escala el minuto exacto no
      // cambia ninguna decision.
      expect(formatUptime(3 * 3_600_000 + 59 * 60_000)).toBe('más de 3 horas');
    });

    it('usa singular solo en la primera hora', () => {
      expect(formatUptime(3_600_000)).toBe('más de 1 hora');
      expect(formatUptime(2 * 3_600_000)).toBe('más de 2 horas');
    });

    it('aguanta en horas hasta el ultimo momento antes del dia', () => {
      expect(formatUptime(23 * 3_600_000 + 59 * 60_000)).toBe('más de 23 horas');
    });
  });

  describe('cambio a dias', () => {
    it('pasa a dias al cumplirse el primero', () => {
      expect(formatUptime(24 * 3_600_000)).toBe('más de 1 día');
    });

    it('redondea hacia abajo en dias', () => {
      expect(formatUptime(9 * 24 * 3_600_000 + 5 * 3_600_000)).toBe('más de 9 días');
    });
  });
});

describe('describeUptime', () => {
  it('no dice nada cuando no hay dato', () => {
    expect(describeUptime(null)).toBeNull();
    expect(describeUptime(NaN)).toBeNull();
  });

  it('atribuye el arranque a la visita cuando lleva poco encendido', () => {
    expect(describeUptime(0)).toBe('probablemente lo despertó esta visita');
    expect(describeUptime(45_000)).toBe('probablemente lo despertó esta visita');
  });

  it('cambia de lectura al pasar los dos minutos', () => {
    // El limite importa: por debajo, lo mas probable es que el arranque en frio
    // lo haya provocado quien esta mirando la pantalla.
    expect(describeUptime(119_999)).toBe('probablemente lo despertó esta visita');
    expect(describeUptime(120_000)).toBe('ya estaba en marcha');
  });

  it('da el servicio por asentado cuando lleva horas', () => {
    expect(describeUptime(5 * 3_600_000)).toBe('ya estaba en marcha');
  });
});
