import { Data, PartialData } from './../Models/data';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class GameDataService {

  private url = `${environment.apiUrl}/score`

  constructor() { }

  private http = inject(HttpClient);

  getScores(): Observable<Data> {
    return this.http.get<Data>(this.url);
  }

  setData(data: PartialData): Observable<PartialData> {
    return this.http.post<PartialData>(this.url, data);
  }
}
