/** Un puntaje tal como lo devuelve la API. */
export interface Body {
  id: number;
  difficult: string;
  nickname: string;
  score: number;
  /** ISO 8601. `updated_at` ya no se expone: no lo usa el front. */
  created_at: string | null;
}

/** Respuesta de GET /api/score: top 5 por dificultad. */
export interface Data {
  kids: Body[];
  junior: Body[];
}

/** Cuerpo de POST /api/score. */
export type PartialData = Pick<Body, 'difficult' | 'nickname' | 'score'>;

/** Respuesta de POST /api/score. */
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
