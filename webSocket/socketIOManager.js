import { obtenerPaisPorIP } from "../util/geolocalizacion.js";

export class SocketIOManager {
    #io;
    #juegoServicio;
    #usuarioServicio;

    constructor(ioServer, juegoServicio, usuarioServicio) {
        this.#io = ioServer;
        this.#juegoServicio = juegoServicio;
        this.#usuarioServicio = usuarioServicio;
        // Configura los listeners para el servidor Socket.IO
        this.#setupSocketIOListeners();
        this.#setupOyentesDelServicio();

        console.log('SocketIOManager inicializado y listo para manejar eventos.');
    }


    #setupSocketIOListeners() {
        this.#io.on('connection', async(socket) => {
            console.log(`Nuevo Cliente Socket.IO conectado. ID: ${socket.id}. Total conectados: ${this.#io.engine.clientsCount}`);

            const ip = socket.handshake.address;
            console.log('-1 socket: ' , socket.handshake);
            
            console.log('0-IP recibido del socket: ', ip);
            
            socket.ip = ip;

            try {
                const pais = await obtenerPaisPorIP(ip);
                socket.pais = pais;
                console.log(`Cliente conectado desde ${pais?.nombre}`);

                socket.emit('PAIS_DETECTADO', { nombre: pais?.nombre, codigo: pais?.country_code });
            } catch (e) {
                console.error("Error obteniendo país por IP:", e.message);
                socket.emit('PAIS_DETECTADO', { error: "No se pudo detectar el país" });
            }

            this.#juegoServicio.obtenerSala()
                .then(salaInicial => {
                    if (salaInicial) {
                        socket.emit('ESTADO_SALA_ACTUALIZADO', salaInicial);
                    }
                })
                .catch(error => {
                    console.error(`Error al enviar estado inicial al cliente ${socket.id}:`, error);
                    socket.emit('ERROR', { mensaje: 'Error al cargar estado inicial de la sala.' });
                });

            socket.on('SOLICITAR_SALA_INICIAL', async () => {
            console.log(`Cliente ${socket.id} solicita estado inicial`);
                try {
                    const salaInicial = await this.#juegoServicio.obtenerSala();
                    if (salaInicial) {
                        socket.emit('ESTADO_SALA_ACTUALIZADO', salaInicial);
                    } else {
                        // If no default room exists yet
                        socket.emit('ESTADO_SALA_ACTUALIZADO', { 
                            jugadores: [], 
                            estado: 'esperando-jugadores', 
                            id: 'sala-unica' 
                        });
                    }
                } catch (error) {
                    console.error(`Error al enviar estado inicial al cliente ${socket.id}:`, error);
                    socket.emit('ERROR', { mensaje: 'Error al cargar estado inicial de la sala.' });
                }
            });

            // Escuchar solicitud de crear una nueva sala
            socket.on('CREATE_ROOM', async (data) => {
                console.log(`Evento CREATE_ROOM recibido del cliente (${socket.id}):`, data);
                let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

                if (!parsedData.nombreSala) {
                    socket.emit('ERROR', { mensaje: 'El nombre de la sala es requerido.' });
                    return;
                }

                try {
                    const nuevaSala = await this.#juegoServicio.crearSalaDinamica(parsedData.nombreSala);
                    socket.emit('SALA_CREADA', { success: true, sala: nuevaSala });
                    // Emitir a todos los clientes para actualizar lista de salas disponibles
                    this.#io.emit('LISTA_SALAS_ACTUALIZADA', { salas: await this.#juegoServicio.obtenerTodasLasSalas() });
                } catch (error) {
                    console.error(`Error al crear sala: ${error.message}`);
                    socket.emit('ERROR', { mensaje: `Error al crear sala: ${error.message}` });
                }
            });

            // Escuchar solicitud de obtener lista de salas disponibles
            socket.on('SOLICITAR_SALAS', async () => {
                console.log(`Cliente ${socket.id} solicita lista de salas`);
                try {
                    const salas = await this.#juegoServicio.obtenerTodasLasSalas();
                    socket.emit('LISTA_SALAS_ACTUALIZADA', { salas });
                } catch (error) {
                    console.error(`Error al obtener lista de salas: ${error.message}`);
                    socket.emit('ERROR', { mensaje: 'Error al obtener lista de salas.' });
                }
            });


            // --- Aca reemplaza el router y el controlador y pasa derecho al servicio ---
            
            socket.on('UNIRSE_JUEGO', async (data) => {
                console.log(`Evento UNIRSE_JUEGO recibido del cliente (${socket.id}):`, data);
                let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

                if (!parsedData.usuario || !parsedData.usuario.id || !parsedData.usuario.usuario) {
                    socket.emit('ERROR', { mensaje: 'Datos de usuario incompletos para unirse (faltan id o nombre de usuario).' });
                    return;
                }
                try {
                    await this.#juegoServicio.unirseOSumarJugador(parsedData.usuario.id, parsedData.usuario, socket.id)
                } catch (e) {
                    console.error(`Error al procesar UNIRSE_JUEGO para ${socket.id}: ${e.message}`);
                    socket.emit('ERROR', { mensaje: `Error al unirse al juego: ${e.message}` });
                }
            });

            socket.on('CARTAS_ORDENADAS_ENVIADO', async (data) => {
                console.log(`Evento CARTAS_ORDENADAS_ENVIADO recibido del cliente (${socket.id}):`, data);
                let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

                if (!parsedData.nuevoOrden || !Array.isArray(parsedData.nuevoOrden)) {
                    socket.emit('ERROR', { mensaje: 'Formato de orden de cartas inválido.' });
                    return;
                }
                if (!parsedData.id) {
                    socket.emit('ERROR', { mensaje: 'ID de usuario para ordenar cartas incompleto o inválido.' });
                    return;
                }
                try {
                    console.log('Registrar orden de cartas');
                    await this.#juegoServicio.registrarOrdenCartas(parsedData.id, parsedData.nuevoOrden);
                } catch (e) {
                    console.error(`Error al procesar ORDENAR_CARTAS para ${socket.id}: ${e.message}`);
                    socket.emit('ERROR', { mensaje: `Error al ordenar cartas: ${e.message}` });
                }
            });

            socket.on('ENFRENTAR_CARTAS', async () => {
                console.log(`Evento ENFRENTAR_CARTAS recibido del cliente (${socket.id})`);
                try {
                    await this.#juegoServicio.enfrentarCartas();
                    
                } catch (e) {
                    console.error(`Error al procesar ENFRENTAR_CARTAS para ${socket.id}: ${e.message}`);
                    socket.emit('ERROR', { mensaje: `Error al enfrentar cartas: ${e.message}` });
                }
            });

            socket.on('AVANZAR_RONDA', async () => {
                console.log(`Evento AVANZAR_RONDA recibido del cliente (${socket.id})`);
                try {
                    await this.#juegoServicio.avanzarRonda();

                } catch (e) {
                    console.error(`Error al procesar AVANZAR_RONDA para ${socket.id}: ${e.message}`);
                    socket.emit('ERROR', { mensaje: `Error al avanzar de ronda: ${e.message}` });
                }
            });

            socket.on('SALIR_SALA', async ({ idLeft }) => {
                await this.#juegoServicio.echarJugadoresDeSala();
            });

            // --- Escucha cuando un cliente se desconecta ---
            socket.on('disconnect', (reason) => {
                console.log(`Cliente Socket.IO desconectado. ID: ${socket.id}. Razón: ${reason}`);
                this.#juegoServicio.manejarDesconexionJugador(socket.id)
                    .catch(error => {
                        console.error(`Error al manejar la desconexión del jugador ${socket.id}:`, error);
                    });
            });
        });
    }

    #setupOyentesDelServicio() {
        this.#juegoServicio.on('estadoActualizado', (sala) => {
            console.log(`Evento 'estadoActualizado', ${sala.estado}, recibido de JuegoServicio para sala ID: ${sala.id}`);
            this.#io.emit('ESTADO_SALA_ACTUALIZADO', sala);
        })
        this.#juegoServicio.on('batallaRonda', async (sala) =>
        {
            console.log('Emitir batalla sala, depende de front si ya están ambos o juegan');
            this.#io.emit('BATALLA_RONDA', sala);
            if(sala.estado == 'partida-finalizada') //Mover este IF al llamado correspondiente de fin de partida luego en la limpieza
            {
                //Partida terminó
                console.log('Partida terminada: ', sala);
                if(sala.estado != "empate")
                {
                    const idGanador = sala.ganador == sala.jugadores[0].id ? sala.jugadores[0].id : sala.jugadores[1].id
                    const idPerdedor = idGanador == sala.jugadores[0].id ? sala.jugadores[1].id : sala.jugadores[0].id
                    console.log('ID ganador', idGanador);
                    console.log('ID perdedor', idPerdedor); 
                    await this.#usuarioServicio.actualizarEstadisticas(idPerdedor, {losses: 1})
                    await this.#usuarioServicio.actualizarEstadisticas(idGanador, {wins: 1})
                }
                else
                {
                    const idU1 = sala.jugadores[0].id;
                    const idU2 = sala.jugadores[1].id;
                    await this.#usuarioServicio.actualizarEstadisticas(idU1, {draws: 1})
                    await this.#usuarioServicio.actualizarEstadisticas(idU2, {draws: 1})
                }
            }
        })
        this.#juegoServicio.on('finDePartida', async () => {
            this.#io.emit('FIN_DE_PARTIDA');
        });
    }
}