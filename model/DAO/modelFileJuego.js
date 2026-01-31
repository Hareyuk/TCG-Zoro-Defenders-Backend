import fs from 'fs/promises'
import path from 'path'

const defaultRoom =
{
  "id": "sala-unica",
  "jugadores": [
  ],
  "comenzado": false,
  "ronda": 1,
  "finalizada": false,
  "resultado": null,
  "estado": "esperando-jugadores",
  "ganador": null
};

class JuegoPersistenciaArchivo {
  constructor(rutaArchivo = './data/salas/') {
    this.rutaArchivo = rutaArchivo
  }

  async cargarSala() {
    try {
      const data = await fs.readFile(this.rutaArchivo + `sala-unica.out`, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  async guardarSala(sala) {
    await fs.writeFile(this.rutaArchivo + `${sala.id}.out`, JSON.stringify(sala, null, 2))
  }

  async reiniciarSala()
  {
    await this.guardarSala(defaultRoom);
    return defaultRoom;
  }

  // Guardar una nueva sala en data/salas/{salaId}.out
  async guardarNuevaSala(idSala, sala) {
    const salasDir = './data/salas'
    const rutaSala = path.join(salasDir, `${idSala}.out`)
    
    try {
      // Asegurarse que la carpeta exists
      await fs.mkdir(salasDir, { recursive: true })
      // Guardar el archivo de la sala
      await fs.writeFile(rutaSala, JSON.stringify(sala, null, 2))
      console.log(`Nueva sala creada: ${rutaSala}`)
      return true
    } catch (error) {
      console.error(`Error al guardar sala ${idSala}:`, error)
      throw error
    }
  }

  // Cargar una sala específica por ID
  async cargarSalaPorId(idSala) {
    const salasDir = './data/salas'
    const rutaSala = path.join(salasDir, `${idSala}.out`)
    
    try {
      const data = await fs.readFile(rutaSala, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  // Actualizar una sala específica
  async actualizarSalaPorId(idSala, sala) {
    const salasDir = './data/salas'
    const rutaSala = path.join(salasDir, `${idSala}.out`)
    
    try {
      await fs.writeFile(rutaSala, JSON.stringify(sala, null, 2))
    } catch (error) {
      console.error(`Error al actualizar sala ${idSala}:`, error)
      throw error
    }
  }

  // Listar todas las salas disponibles
  async listarSalas() {
    const salasDir = './data/salas'
    
    try {
      const archivos = await fs.readdir(salasDir)
      const salas = []
      
      for (const archivo of archivos) {
        if (archivo.endsWith('.out')) {
          const rutaSala = path.join(salasDir, archivo)
          const data = await fs.readFile(rutaSala, 'utf-8')
          salas.push(JSON.parse(data))
        }
      }
      
      return salas
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }
}

export default JuegoPersistenciaArchivo
