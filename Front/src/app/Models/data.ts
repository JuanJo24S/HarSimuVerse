export interface Data {
  kids:   Body[];
  junior: Body[];
}

export interface Body {
  id:         number;
  difficult:  string;
  nickname:   string;
  score:      number;
  created_at: Date;
  updated_at: Date;
}

export type PartialData = Pick<Body, "difficult" | "nickname" | "score">;
