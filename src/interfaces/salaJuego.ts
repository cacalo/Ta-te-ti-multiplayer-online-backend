import { Jugador } from "./jugador";
import { Marca } from "./tablero";

export interface SalaJuego {
  id: number,
  jugador1: Jugador
  jugador2: Jugador
  estado: EstadoJuego
  tablero: [Marca,Marca,Marca,Marca,Marca,Marca,Marca,Marca,Marca]
  jugadorInicial : 1|2,
  esPrivada: boolean
}


export interface UnirseASalaArgs{
  salaId: number,
  jugador:Jugador,
  esPrivada:boolean
}

export type EstadoJuego = 
  "ESPERANDO_COMPAÑERO" |
  "VICTORIA_P1" |
  "VICTORIA_P2" |
  "EMPATE" |
  "TURNO_P1" |
  "TURNO_P2" |
  "ABANDONADO" |
  "FINALIZADO" |
  "VICTORIA_FINAL_P1" |
  "VICTORIA_FINAL_P2";