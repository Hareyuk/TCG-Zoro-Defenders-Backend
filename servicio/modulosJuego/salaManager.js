export async function inicializarSala(persistencia, constructor ) { //Constructor es true o false
  //para saber si es cuando se inicia el servidor o no.
  let sala;
  if(!constructor) sala = await persistencia.cargarSala()
  if (!sala) {
    sala = {
      id: 'sala-unica',
      jugadores: [],
      comenzado: false,
      ronda: 1,
      finalizada: false,
      resultado: null,
      estado: 'esperando-jugadores'
    }
    await persistencia.guardarSala(sala)
  }
  return sala
}

// Generar ID de sala único y random
export function generarIdSala() {
  // Generar un ID random basado en timestamp + random
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 8)
  return `sala_${timestamp}${randomPart}`
}

// Verificar que el ID de sala no existe ya
export async function verificarSalaNoExiste(persistencia, idSala) {
  const salasExistentes = await persistencia.listarSalas()
  return !salasExistentes.some(sala => sala.id === idSala)
}

// Generar un ID de sala único con reintentos en caso de colisión
export async function generarIdSalaUnico(persistencia, reintentos = 5) {
  for (let i = 0; i < reintentos; i++) {
    const idSala = generarIdSala()
    const noExiste = await verificarSalaNoExiste(persistencia, idSala)
    if (noExiste) {
      return idSala
    }
    console.warn(`Colisión detectada en intento ${i + 1}, reintentando...`)
  }
  throw new Error('No se pudo generar un ID de sala único después de varios intentos')
}

// Crear una nueva sala en archivo
export async function crearNuevaSala(persistencia, nombreSala) {
  const idSala = await generarIdSalaUnico(persistencia)
  const nuevaSala = {
    id: idSala,
    nombre: nombreSala,
    jugadores: [],
    comenzado: false,
    ronda: 1,
    finalizada: false,
    resultado: null,
    estado: 'esperando-jugadores',
    ganador: null,
    createdAt: new Date().toISOString()
  }
  await persistencia.guardarSala(nuevaSala)
  return nuevaSala
}
