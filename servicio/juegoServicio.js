import { EventEmitter } from 'events'
//import ModelFactory from '../model/DAO/factory.js'
import { inicializarSala, crearNuevaSala } from './modulosJuego/salaManager.js'
import { agregarJugador, ordenarCartas } from './modulosJuego/jugadoresManager.js'
import { repartirCartas } from './modulosJuego/cartasManager.js'
import { enfrentarCartas } from './modulosJuego/rondaManager.js'

class JuegoServicio extends EventEmitter {
  #persistencia
  #usuarioServicio
  #sala = null


  constructor(juegoPersistencia, usuarioServicio) {
    super()
    this.#persistencia = juegoPersistencia;
    this.#usuarioServicio= usuarioServicio;
    this.init()
  }

  init = async () => {
    // Ya no se inicializa la sala única, ahora usamos salas dinámicas
    // this.#sala = await inicializarSala(this.#persistencia, true)
    // this.#emitirEstadoActualizado()
  }


  unirseOSumarJugador = async (id, usuario, socketId) => {
    const resultado = await agregarJugador(this.#sala, id, usuario, socketId, this.#persistencia)
    this.#emitirEstadoActualizado()
    return resultado
  }

  registrarOrdenCartas = async (id, nuevoOrden) => {
    const resultado = await ordenarCartas(this.#sala, id, nuevoOrden, this.#persistencia)
    
    if (this.#sala.estado === 'cartas-ordenadas') {
        await this.enfrentarCartas(); // Esto actualizará sala y emitirá estado
    }
    this.#emitirBatallaRonda();
    return resultado;
  }

  enfrentarCartas= async () => {
    if (this.#sala.estado !== 'cartas-ordenadas') {
      throw new Error('La sala no está lista para jugar')
    }

    const resultado = await enfrentarCartas(this.#sala, this.#persistencia, this.#usuarioServicio)
    //this.#emitirEstadoActualizado()
    //this.#emitirFinPartida();
    return resultado
  }

  // avanzarRonda = async() => {
  //   if (this.#sala.estado !== 'partida-finalizada') {
  //     throw new Error('No se puede avanzar: la partida no terminó.')
  //   }

  //   const resultado = await avanzarRonda(this.#sala, this.#persistencia, repartirCartas)
  //   this.#emitirEstadoActualizado()
  //   return resultado
  // }

    obtenerSala = async() => {
    return this.#sala
  }

  // Crear una nueva sala dinámicamente
  crearSalaDinamica = async (nombreSala) => {
    try {
      const nuevaSala = await crearNuevaSala(this.#persistencia, nombreSala)
      console.log(`Nueva sala creada: ${nuevaSala.id} - ${nuevaSala.nombre}`)
      this.#emitirSalaCreada(nuevaSala)
      return nuevaSala
    } catch (error) {
      console.error(`Error al crear sala dinámica: ${error.message}`)
      throw error
    }
  }

  // Crear una nueva sala dinámicamente Y agregar el jugador creador automáticamente
  crearSalaDinamicaYAgregarJugador = async (nombreSala, idJugador, datosJugador, socketId) => {
    try {
      // Primero crear la sala
      const nuevaSala = await crearNuevaSala(this.#persistencia, nombreSala)
      console.log(`Nueva sala creada: ${nuevaSala.id} - ${nuevaSala.nombre}`)
      
      // Luego agregar el jugador creador automáticamente
      const salaConJugador = await agregarJugador(nuevaSala, idJugador, datosJugador, socketId, this.#persistencia)
      console.log(`Jugador ${datosJugador.usuario} agregado automáticamente a la sala ${nuevaSala.id}`)
      
      this.#emitirSalaCreada(salaConJugador)
      return salaConJugador
    } catch (error) {
      console.error(`Error al crear sala dinámica con jugador: ${error.message}`)
      throw error
    }
  }

  // Obtener todas las salas disponibles
  obtenerTodasLasSalas = async () => {
    try {
      const salas = await this.#persistencia.listarSalas()
      return salas
    } catch (error) {
      console.error(`Error al obtener salas: ${error.message}`)
      throw error
    }
  }

  // Obtener todas las salas con detalles (para mostrar en el lobby)
  obtenerSalasConDetalles = async () => {
    try {
      const salas = await this.#persistencia.listarSalas()
      // Mapear cada sala con información útil para el lobby
      const salasConDetalles = salas.map(sala => ({
        id: sala.id,
        nombre: sala.nombre,
        jugadores: sala.jugadores.length,
        maxJugadores: 2,
        estado: sala.estado,
        createdAt: sala.createdAt,
        listaJugadores: sala.jugadores.map(j => ({
          id: j.id,
          usuario: j.usuario
        }))
      }))
      return salasConDetalles
    } catch (error) {
      console.error(`Error al obtener salas con detalles: ${error.message}`)
      throw error
    }
  }

  // Obtener una sala específica por ID
  obtenerSalaPorId = async (idSala) => {
    try {
      const sala = await this.#persistencia.cargarSalaPorId(idSala)
      return sala
    } catch (error) {
      console.error(`Error al obtener sala ${idSala}: ${error.message}`)
      throw error
    }
  }

  // Unirse a una sala dinámica específica por ID
  unirseASalaDinamica = async (idSala, idJugador, datosJugador, socketId) => {
    try {
      // Cargar la sala específica
      const sala = await this.#persistencia.cargarSalaPorId(idSala)
      
      if (!sala) {
        throw new Error(`La sala ${idSala} no existe`)
      }

      // Agregar jugador a la sala
      const salaActualizada = await agregarJugador(sala, idJugador, datosJugador, socketId, this.#persistencia)
      
      console.log(`Jugador ${datosJugador.usuario} agregado a la sala ${idSala}`)
      return salaActualizada
    } catch (error) {
      console.error(`Error al unirse a sala dinámica: ${error.message}`)
      throw error
    }
  }

  // Actualizar una sala específica
  actualizarSala = async (sala) => {
    try {
      await this.#persistencia.actualizarSalaPorId(sala.id, sala)
      console.log(`Sala ${sala.id} actualizada`)
      return sala
    } catch (error) {
      console.error(`Error al actualizar sala: ${error.message}`)
      throw error
    }
  }

  async echarJugadoresDeSala() {
    this.#emitirEcharJugadores();
    const sala = await this.#persistencia.reiniciarSala();
    this.#sala = await this.#persistencia.cargarSala();
    this.#emitirEstadoActualizado();
  }

  #emitirFinPartida() //Para enviar señal de que se terminó la partida al jugador que queda
  {
    this.emit('finDePartida', this.#sala);
    console.log(`JuegoServicio emitió 'finDePartida'.`);
  }

  #emitirBatallaRonda()
  {
    this.emit('batallaRonda', this.#sala);
  }

  #emitirEcharJugadores()
  {
    this.emit('finDePartida');
  }

  #emitirSalaCreada(sala) {
    this.emit('salaCreada', sala);
    console.log(`JuegoServicio emitió 'salaCreada'. Sala: ${sala.id} (${sala.nombre})`);
  }

  //metodo modularizado para emitir el estado
  #emitirEstadoActualizado() {

    this.emit('estadoActualizado', this.#sala);
    console.log(`JuegoServicio emitió 'estadoActualizado'. Estado actual: ${this.#sala.estado}`);
  }  

  async reiniciarSala() {
  if (await this.#persistencia.reiniciarSala()) {
    this.#sala = await this.#persistencia.cargarSala();
    this.#emitirFinPartida();
  }
}

  async manejarDesconexionJugador(disconnectedSocketId) {
    const jugadorDesconectado = this.#sala.jugadores.find(j => j.socketId === disconnectedSocketId);

    if (jugadorDesconectado) {
      console.log(`Jugador ${jugadorDesconectado.usuario} se ha desconectado.`);


      if (this.#sala.jugadores.length === 2 && this.#sala.estado !== 'juego-finalizado') {
        const jugadorRestante = this.#sala.jugadores.find(j => j.id !== jugadorDesconectado.id);
        if (jugadorRestante) {
          this.#sala.estado = 'juego-finalizado';
          this.#sala.ganador = jugadorRestante.id;
          this.#sala.finalizada = true;
          console.log(`El jugador ${jugadorRestante.usuario}  ha ganado por desconexión.`);
        
          // ---Bloque para actualizar nuevos atributos por desconexion ---
          try {
            // Incrementa 'wins' para el jugador restante
            await this.#persistencia.actualizarEstadisticas(jugadorRestante.id, { $inc: { wins: 1 } });
            // Incrementa 'losses' para el jugador desconectado
            await this.#persistencia.actualizarEstadisticas(jugadorDesconectado.id, { $inc: { losses: 1 } });
            console.log(`Estadísticas actualizadas por desconexión: ${jugadorRestante.usuario} (win), ${jugadorDesconectado.usuario} (loss).`);
          } catch (error) {
            console.error(`Error al actualizar estadísticas por desconexión para ${jugadorRestante.usuario} o ${jugadorDesconectado.usuario}:`, error);
          }
          
        }
      }
      this.#sala.jugadores = this.#sala.jugadores.filter(j => j.id !== jugadorDesconectado.id);
      console.log(`Jugador ${jugadorDesconectado.usuario} removido de la sala.`);
      await this.#persistencia.reiniciarSala(this.#sala);
      this.#emitirFinPartida();
    } else {
      console.log(`Socket ID ${disconnectedSocketId} desconectado, pero no corresponde a un jugador activo en la sala.`);
    }
  }
}

export default JuegoServicio

