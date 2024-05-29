export interface Jugador {
  ip?: string,
  nombre: string
  victorias: number
}

export const JUGADOR_VACIO: Jugador = {
  nombre: "",
  victorias: 0
}