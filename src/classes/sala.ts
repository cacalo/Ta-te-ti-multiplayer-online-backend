import { Socket } from "socket.io";
import { SalaJuego } from "../interfaces/salaJuego";
import { JUGADOR_VACIO, Jugador } from "../interfaces/jugador";
import { PosicionTablero } from "../interfaces/tablero";

/** Clase que maneja las funcionalidades de cada sala de juego */
export class Sala {
  /** Estado de la sala de juego actual */
  sala:SalaJuego;
  /** El socket de conexión con los jugadores */
  socket: Socket;
  /** Cantidad de partidas a ganar */
  rondas = 3;
  constructor(id:number,socket:Socket,esPrivada:boolean=false){
    this.sala= {
      id,
      jugador1: {...JUGADOR_VACIO},
      jugador2: {...JUGADOR_VACIO},
      estado: "ESPERANDO_COMPAÑERO",
      tablero: ["","","","","","","","",""],
      jugadorInicial: 1,
      esPrivada: esPrivada
    }
    this.socket = socket;
  }

  /** Devuelve el elemento Sala sin las cosas privadas (el IP de los jugadores) */
  getSalaAnonimizada(){
    const publicSala = {...this.sala};
    delete publicSala.jugador1.ip;
    delete publicSala.jugador2.ip;
    return publicSala;
  }

  agregarJugadorAPosicion(jugador:Jugador,posicion:1|2){
    switch(posicion){
      case 1:
        this.sala.jugador1.nombre = jugador.nombre;
        this.sala.jugador1.ip = jugador.ip;
        break;
      case 2:
        this.sala.jugador2.nombre = jugador.nombre;
        this.sala.jugador2.ip = jugador.ip;
        break;
    }
    //Si están los 2 comienzo el juego
    if(this.sala.jugador1.nombre && this.sala.jugador2.nombre){
      this.sala.estado = "TURNO_P1";
    }
    this.comunicarSala();
  }

  eliminarJugador(posicion:1|2){
    if(posicion === 1){
      this.sala.jugador1 = {...JUGADOR_VACIO};
    } else {
      this.sala.jugador2 = {...JUGADOR_VACIO};
    }
    this.comunicarSala();
  }

  /** La acción de un jugador jugando un turno */
  jugar(posicionJugador:1|2,posicionTablero:PosicionTablero){
    //Reviso si el juego está esperando un input de jugador
    if(this.sala.estado !== "TURNO_P1" && this.sala.estado !== "TURNO_P2") return this.comunicarJugadaIlegal(posicionJugador);
    //Reviso si es el turno de la persona que jugó.
    if((this.sala.estado === "TURNO_P1" && posicionJugador !== 1 ) || 
      (this.sala.estado === "TURNO_P2" && posicionJugador !== 2 ||
      this.sala.tablero[posicionTablero as number] )) return this.comunicarJugadaIlegal(posicionJugador);
    this.sala.tablero[posicionTablero as number] = posicionJugador;
    this.sala.estado = posicionJugador === 1 ? "TURNO_P2" : "TURNO_P1";
    // Reviso si el jugador que jugó hizo terminar la partida
    const fin = this.verificarVictoria();
    switch (fin){
      // Si nadie ganó sigo con el juego normal
      case false: break;
      case "EMPATE":
        // Si hubo un empate cambio el estado de la sala a "empate"
        this.sala.estado="EMPATE"
        break;
        default:
        // En caso de que alguien gane le doy la victoria
        if(posicionJugador === 1 ){
          this.sala.jugador1.victorias++;
          this.sala.estado = this.sala.jugador1.victorias === this.rondas ?  "VICTORIA_FINAL_P1" :  "VICTORIA_P1"
        } else {
          this.sala.jugador2.victorias++
          this.sala.estado = this.sala.jugador2.victorias === this.rondas ?  "VICTORIA_FINAL_P2" : "VICTORIA_P2"
        }
        break;
    }
    //Pase lo que pase, al final de un turno se propaga el estado de la sala final.
    this.comunicarSala();
  }

  /** Inicia una nueva ronda de ta-te-ti */
  nuevaRonda(){
    this.vaciarTablero();
    this.cambiarJugadorInicial();
    if(this.sala.jugador1.victorias === this.rondas || this.sala.jugador2.victorias === this.rondas) {
      //console.log("HUBO UN GANADOR, REINICANDO")
      this.sala.jugador1.victorias = 0;
      this.sala.jugador2.victorias = 0;
    }
    this.sala.estado = this.sala.jugadorInicial === 1 ? "TURNO_P1" : "TURNO_P2";
    this.comunicarSala();
  }

  /** Envía un mensaje por el socket a los jugadores conectados a la sala */
  comunicar(posicionJugador:1|2,exito:boolean,args?:any){
    const nombreJugador:string = posicionJugador === 1 ? this.sala.jugador1.nombre : this.sala.jugador2.nombre;
    global.io.to("sala-"+this.sala.id.toString()).emit(exito?"exito":"",[nombreJugador,args])
  }

  /** Envía el estado de la sala a todos los jugadores de una sala */
  comunicarSala(){
    global.io.to("sala-"+this.sala.id.toString()).emit("sala",this.getSalaAnonimizada());
  }

  /** Comunica que la acción que el server recibió no se puede ejecutar */
  comunicarJugadaIlegal(posicionJugador:1|2){
    this.comunicar(posicionJugador,false,"Jugada ilegal");
  }

  /** Verifico si hubo un ganador de la partida */
  verificarVictoria(){
    const tablero = this.sala.tablero;
    // Reviso filas
    for (let i = 0; i < 9; i+=3) {
        if(tablero[i] && tablero[i] === tablero[i+1] && tablero[i] === tablero[i+2]){
            return ([i,i+1,i+2]);
        }
    }

    // Reviso columnas
    for (let i = 0; i < 3; i++) {
        if(tablero[i] && tablero[i] === tablero[i+3] && tablero[i] === tablero[i+6]){
            return ([i,i+3,i+6]);
        }
    }

    // Reviso oblicuas
    if(tablero[0] && tablero[0] === tablero[4] && tablero[0] === tablero[8]) return [0,4,8];
    if(tablero[2] && tablero[2] === tablero[4] && tablero[2] === tablero[6]) return [2,4,6];

    //Reviso empate
    if(tablero.includes("")) return false;
    return "EMPATE";
  }

  /** Reinicia el estado de una partida y arranca una nueva ronda */
  reiniciar(){
    this.sala.jugador1.victorias = 0;
    this.sala.jugador2.victorias = 0;
    this.nuevaRonda();
  }

  /** Limpia las marcas en el tablero */
  vaciarTablero(){
    this.sala.tablero = ["","","","","","","","",""];
  }

  /** Intercambia que jugador juega primero en la próxima ronda */
  cambiarJugadorInicial(){
    this.sala.jugadorInicial = this.sala.jugadorInicial===1 ? 2 : 1;
  }

  /** Pone a la sala en estado de abandono y comunica al jugador restante */
  jugadorAbandono(){
    this.sala.estado = "ABANDONADO"
    this.comunicarSala();
  }
  
}