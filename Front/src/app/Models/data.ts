/** Un puntaje guardado. */
export interface Body {
  id: number;
  difficult: string;
  nickname: string;
  score: number;
  /** ISO 8601. */
  created_at: string | null;
}

/** El ranking completo: top 5 por dificultad, guardado en este navegador. */
export interface Data {
  kids: Body[];
  junior: Body[];
}

/** Lo que se necesita para registrar un puntaje. */
export type PartialData = Pick<Body, 'difficult' | 'nickname' | 'score'>;

/** Resultado de registrar un puntaje, con el puesto conseguido. */
export interface StoreScoreResponse {
  mensaje: string;
  score: Body;
  ranking: {
    /** Puesto 1-indexado, o null si el puntaje no entro al top. */
    position: number | null;
    in_top: boolean;
    top_limit: number;
  };
}
