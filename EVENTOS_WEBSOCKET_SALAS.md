# Eventos WebSocket para Salas Dinámicas

Este documento describe los nuevos eventos WebSocket para crear y gestionar salas dinámicas.

## Eventos del Frontend al Backend

### 1. Crear una nueva sala
**Evento:** `CREATE_ROOM`
**Envío desde frontend:**
```javascript
socket.emit('CREATE_ROOM', {
  nombreSala: 'Sala de Prueba',
  usuario: {
    id: 'id_del_usuario',
    usuario: 'nombre_usuario',
    // ... otros datos del usuario
  }
});
```

**IMPORTANTE:** El usuario que crea la sala se une automáticamente.

**Respuesta del backend - FLUJO COMPLETO:**
1. **`SALA_CREADA`** - Emitido al cliente que creó la sala (contiene la sala con el usuario creador ya dentro)
2. **`LISTA_SALAS_ACTUALIZADA`** - Emitido a TODOS los clientes para que vean la nueva sala
3. **`ESTADO_SALA_ACTUALIZADO`** - Emitido al cliente que creó la sala (para mostrar la sala en espera)

```json
{
  "success": true,
  "sala": {
    "id": "sala_qa7frc9a8b2",
    "nombre": "Sala de Prueba",
    "jugadores": [
      {
        "id": "id_del_usuario",
        "usuario": "nombre_usuario",
        "socketId": "socket_id_del_cliente",
        "cartas": [],
        "cartasOrdenadas": false
      }
    ],
    "comenzado": false,
    "ronda": 1,
    "finalizada": false,
    "resultado": null,
    "estado": "esperando-jugadores",
    "ganador": null,
    "createdAt": "2026-01-31T05:36:39.000Z"
  }
}
```

### 1.5 Unirse a una sala existente
**Evento:** `UNIRSE_JUEGO`
**Envío desde frontend:**
```javascript
socket.emit('UNIRSE_JUEGO', {
  idSala: 'sala_qa7frc9a8b2',  // ID de la sala a la que se quiere unir
  usuario: {
    id: 'id_del_usuario',
    usuario: 'nombre_usuario',
    // ... otros datos del usuario
  }
});
```

**Respuesta del backend - FLUJO COMPLETO:**
1. **`ESTADO_SALA_ACTUALIZADO`** - Emitido a TODOS los clientes en esa sala (ambos jugadores verán la sala con 2 jugadores)
2. **`LISTA_SALAS_ACTUALIZADA`** - Emitido a TODOS los clientes para actualizar lista (la sala ahora tiene 2 jugadores)

**Respuesta del backend:**
- Si es exitoso: `SALA_CREADA` con los datos de la sala creada **y el jugador creador ya agregado**
```json
{
  "success": true,
  "sala": {
    "id": "sala_qa7frc9a8b2",
    "nombre": "Sala de Prueba",
    "jugadores": [
      {
        "id": "id_del_usuario",
        "usuario": "nombre_usuario",
        "socketId": "socket_id_del_cliente",
        "cartas": [],
        "cartasOrdenadas": false
      }
    ],
    "comenzado": false,
    "ronda": 1,
    "finalizada": false,
    "resultado": null,
    "estado": "esperando-jugadores",
    "ganador": null,
    "createdAt": "2026-01-31T05:36:39.000Z"
  }
}
```
- Si hay error: `ERROR` con mensaje de error

### 2. Solicitar lista de salas disponibles
**Evento:** `SOLICITAR_SALAS`
**Envío desde frontend:**
```javascript
socket.emit('SOLICITAR_SALAS');
```

**Respuesta del backend:** `LISTA_SALAS_ACTUALIZADA`
```json
{
  "salas": [
    {
      "id": "sala_qa7frc9a8b2",
      "nombre": "Sala de Prueba",
      "jugadores": 1,
      "maxJugadores": 2,
      "estado": "esperando-jugadores",
      "createdAt": "2026-01-31T05:36:39.000Z",
      "listaJugadores": [
        {
          "id": "usuario_123",
          "usuario": "Juan"
        }
      ]
    },
    {
      "id": "sala_abc123def456",
      "nombre": "Otra Sala",
      "jugadores": 2,
      "maxJugadores": 2,
      "estado": "cartas-ordenadas",
      "createdAt": "2026-01-31T05:36:45.000Z",
      "listaJugadores": [
        {
          "id": "usuario_456",
          "usuario": "María"
        },
        {
          "id": "usuario_789",
          "usuario": "Pedro"
        }
      ]
    }
  ]
}
```

**Nota:** Se muestran TODAS las salas, incluso las que ya tienen 2 jugadores (en juego).

## Eventos Automáticos desde el Backend

### Cuando se crea una nueva sala
**Evento:** `LISTA_SALAS_ACTUALIZADA`
Se emite a TODOS los clientes conectados cuando alguien crea una nueva sala, para que todos actualicen su lista de salas disponibles.

```json
{
  "salas": [...lista de todas las salas con detalles...]
}
```

### Cuando alguien se une a una sala
**Evento:** `LISTA_SALAS_ACTUALIZADA`
Se emite a TODOS los clientes conectados cuando alguien se une a una sala existente, para que todos vean la sala actualizada (cambio de 1 jugador a 2 jugadores, cambio de estado, etc.).

```json
{
  "salas": [...lista de todas las salas con detalles actualizados...]
}
```

## Próximas Funcionalidades (Paso 2 en adelante)
- Unirse a una sala específica por ID
- Listar salas con filtros (estado, jugadores, etc.)
- Eliminar salas vacías
- Obtener detalles específicos de una sala

## Estructura del archivo de sala (.out)
```json
{
  "id": "sala000001",
  "nombre": "Nombre de la Sala",
  "jugadores": [],
  "comenzado": false,
  "ronda": 1,
  "finalizada": false,
  "resultado": null,
  "estado": "esperando-jugadores",
  "ganador": null,
  "createdAt": "2026-01-31T05:36:39.000Z"
}
```

Los archivos se guardan en: `data/salas/sala000001.out`, `data/salas/sala000002.out`, etc.
