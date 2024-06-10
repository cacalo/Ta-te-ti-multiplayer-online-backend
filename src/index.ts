import express from 'express';
import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { Sala } from './classes/sala';
import { SalaJuego, UnirseASalaArgs } from './interfaces/salaJuego';

const app = express();
const server = createServer(app);
const io = new Server(server,{cors:{origin:"*"}});
global.io = io;


let salas:Sala[] = []
let idSalaFutura = 0;

/** Verifica si puedo entrar a una sala y me une */
function unirseASala(socket:Socket,args:UnirseASalaArgs,callback:Function){
  //console.log("Viendo si uno a sala",args.salaId)
  if(!salas.length) {
    return callback({exito:false,mensaje:"Sala inexistente"});
  }
  const salaIndex = salas.findIndex(sala => sala.sala.id == args.salaId);
  if(salaIndex === -1) return callback({exito:false, mensaje:"No se encontró la sala "+args.salaId});
  if(salas[salaIndex].sala.jugador1.ip && salas[salaIndex].sala.jugador2.ip){
    return callback({exito:false,mensaje:"Sala llena"});
  }
  //console.log("Agregamos un jugador",args.jugador)
  args.jugador.ip = socket.handshake.address;
  const numeroJugador = !salas[salaIndex].sala.jugador1.nombre ? 1 : 2;
  salas[salaIndex].agregarJugadorAPosicion(args.jugador,numeroJugador);
  //console.log("Uniendo cliente a la sala ",args.salaId.toString())
  socket.join("sala-"+args.salaId.toString());
  return callback({exito:true ,sala:salas[salaIndex].getSalaAnonimizada()});
  }


/** Crea una nueva sala y me une*/
function crearSala(socket:Socket,args:UnirseASalaArgs, callback:Function){
  const nuevaSala:Sala = new Sala(idSalaFutura,socket,args.esPrivada);
  idSalaFutura++;
  salas.push(nuevaSala);
  args.salaId = nuevaSala.sala.id;
  //console.log("Sala creada en back",nuevaSala)
  return unirseASala(socket,args,callback);
}


io.on('connection', (socket) => {
  //console.log('Nueva conexión');
  //socket.emit("conexion");
  socket.on('disconnect', () => {
    //console.log('Usuario desconectado');
  });
  socket.on("disconnecting", () => {
    if(socket.rooms.size < 2) return;
    try{
      const salaId = parseInt([...socket.rooms][1].substring(5))
      const indiceSala = buscarIndiceSala(salaId);
      //console.log("Avisando a la sala ",salas[indiceSala].sala.id,"que esta abandonada");
      salas[indiceSala].jugadorAbandono();
      salas[indiceSala].socket.conn.close()
      //console.log("Eliminando la sala",indiceSala,salas[indiceSala])
      salas = salas.filter(sala => sala.sala.id !== salaId);
      //console.log("Las salas actuales son",salas)
    } catch(err) {
      console.warn("No se pudo avisar de abandono al otro jugador, probablemente también se fue de la sala");
    }
    
  });
  socket.on("crearSala",(args,callback)=> crearSala(socket,args,callback));
  socket.on("unirseASala",(args,callback)=> unirseASala(socket,args,callback));
  socket.on("jugar",(args)=> salas[buscarIndiceSala(args.salaId)].jugar(args.jugador,args.posicion));
  socket.on("nuevaRonda",(salaId)=> {salas[buscarIndiceSala(salaId)].nuevaRonda()});
  socket.on("reiniciarPartida",(salaId)=> {salas[buscarIndiceSala(salaId)].reiniciar()});
  socket.on("encontrarSala",(callback)=> {constBuscarSalaPublica(callback)});
});

server.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});

function constBuscarSalaPublica(callback:Function){
  const salaEncontrada = salas.find(sala => {
    if(!sala.sala.esPrivada && (!sala.sala.jugador1.nombre || !sala.sala.jugador2.nombre)) return true;
  })
  return callback(salaEncontrada ? salaEncontrada.sala.id : null);
}

const buscarIndiceSala = (id:number) => salas.findIndex(sala => sala.sala.id === id);