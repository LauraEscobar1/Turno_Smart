# API del backend

Contrato que usará la app en la Fase 4 (`crearServiciosSupabase()`). El modelo y la
seguridad están en [base-de-datos.md](base-de-datos.md).

## Convenciones

- **Autenticación:** Supabase Auth (correo y contraseña). Cada llamada lleva el JWT de
  la sesión; las funciones identifican a quien llama con `auth.uid()`.
- **Lecturas:** consultas directas a las tablas con supabase-js. RLS devuelve solo lo
  que le corresponde a quien llama (ver la tabla de RLS).
- **Escrituras:** solo por RPC (`supabase.rpc('nombre', { p_… })`). La única escritura
  directa permitida es marcar avisos como leídos.
- **Respuestas:** `jsonb` con claves en `snake_case`, como las columnas. La explicación
  de una oferta conserva la forma de `ExplicacionPrioridad` (camelCase).
- **Errores:** `message` es un código de `src/services/errores.ts` y `code` es
  `PTxyz`, que PostgREST convierte en el estado HTTP `xyz`:

| `code`  | HTTP | `message` posibles                                                                                                                                  |
| ------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PT401` | 401  | `no_autenticado`                                                                                                                                    |
| `PT403` | 403  | `prohibido`                                                                                                                                         |
| `PT404` | 404  | `no_encontrado` (también lo ajeno: otro paciente u otro consultorio)                                                                                |
| `PT422` | 422  | `validacion`                                                                                                                                        |
| `PT409` | 409  | `transicion_invalida`, `oferta_expirada`, `oferta_ya_respondida`, `cupo_no_disponible`, `solicitud_duplicada`, `cita_ya_comenzo`, `cita_no_comenzo` |
| `42501` | 403  | Sin permiso sobre la tabla o la función (por ejemplo, un paciente que llama al motor)                                                               |

Ejemplo (Fase 4):

```ts
const { data, error } = await supabase.rpc('responder_oferta', {
  p_oferta_id: id,
  p_respuesta: 'aceptar',
});
// error.message es el código (p. ej. 'oferta_expirada'): se traduce a ServiceError.
```

## RPC para la app (`authenticated`)

| RPC                                                                                               | Quién                                     | Devuelve                                                                                             | Errores                                                                                                     |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `cancelar_cita(p_cita_id)`                                                                        | Paciente (suyas) o staff (su consultorio) | `{ cita, cupo_id, requiere_priorizacion }`                                                           | `no_encontrado`, `transicion_invalida`, `cita_ya_comenzo`                                                   |
| `registrar_inasistencia(p_cita_id)`                                                               | Staff                                     | La cita                                                                                              | `prohibido`, `no_encontrado`, `cita_no_comenzo`, `transicion_invalida`                                      |
| `responder_oferta(p_oferta_id, p_respuesta)` (`'aceptar'` \| `'rechazar'`)                        | Paciente                                  | `{ oferta, cupo_id, cita_id, requiere_priorizacion }`                                                | `prohibido`, `validacion`, `no_encontrado`, `oferta_expirada`, `oferta_ya_respondida`, `cupo_no_disponible` |
| `unirse_lista_espera(p_especialidad_id)`                                                          | Paciente                                  | La solicitud                                                                                         | `prohibido`, `no_encontrado`, `solicitud_duplicada`                                                         |
| `salir_lista_espera(p_solicitud_id)`                                                              | Paciente                                  | `{ solicitud, cupos_por_priorizar }`                                                                 | `prohibido`, `no_encontrado`, `transicion_invalida`                                                         |
| `obtener_preferencias()`                                                                          | Paciente                                  | `{ paciente_id, especialidad_ids, franjas, distancia_max_km, antelacion_min_horas, actualizado_en }` | `prohibido`                                                                                                 |
| `guardar_preferencias(p_especialidad_ids, p_franjas, p_distancia_max_km, p_antelacion_min_horas)` | Paciente                                  | Las preferencias guardadas                                                                           | `prohibido`, `validacion`                                                                                   |
| `referencias_pacientes(p_paciente_ids default null)`                                              | Staff                                     | `(paciente_id, codigo, iniciales)` de pacientes de su consultorio                                    | `prohibido`                                                                                                 |

Detalles:

- **`cancelar_cita`** libera un cupo solo si faltan al menos 30 minutos
  (`cupo_id = null` en otro caso) y nunca dos para la misma cita. Si cancela el staff,
  el paciente recibe un aviso `cita_cancelada`. **No elige candidato:** ver
  [cuándo se prioriza un cupo](#cuándo-se-prioriza-un-cupo).
- **`responder_oferta`** es la decisión final del servidor. Aceptar crea la cita
  (`confirmada`, origen `cupo_recuperado`), asigna el cupo, marca como atendida la
  solicitud de esa especialidad y avisa al paciente. Si el plazo venció, responde
  `oferta_expirada` aunque el cron aún no la haya cerrado.
- **`unirse_lista_espera`** y **`guardar_preferencias`** vuelven a intentar los cupos
  disponibles en la misma transacción: si ya hay uno compatible, se ofrece de inmediato.
- **`salir_lista_espera`**: si ya no le interesa la especialidad, cancela su oferta
  pendiente de ella y devuelve ese cupo en `cupos_por_priorizar`.
- **`guardar_preferencias`** aplica las reglas de `esquemaPreferencias`: hasta 10
  especialidades existentes y sin repetir; hasta 21 franjas
  `{ dia_semana, hora_inicio: "HH:mm", hora_fin: "HH:mm" }` sin solapes; distancia y
  antelación entre las opciones de la app.

### Lecturas y escrituras directas

| Necesidad de la app                      | Consulta                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Perfil                                   | `perfiles` (solo el propio)                                                                      |
| Catálogo                                 | `especialidades`, `consultorios`, `profesionales`                                                |
| Ofertas y su detalle (paciente)          | `ofertas` + `cupos` (+ `especialidades`, `profesionales`, `consultorios`)                        |
| Citas, lista de espera, avisos           | `citas`, `solicitudes_espera`, `notificaciones`                                                  |
| Agenda, cupos y ofertas en curso (staff) | `citas`, `cupos`, `ofertas`, `eventos_oferta`, `riesgo_inasistencia` + `referencias_pacientes()` |
| Marcar avisos como leídos                | `update notificaciones set leida = true` (solo esa columna, solo los propios)                    |

Entre `citas` y `cupos` hay varias FK (`cita_origen_id`, `cita_asignada_id`,
`cupo_origen_id`): al embeber con PostgREST hay que nombrar la relación, por ejemplo
`cupos!cupos_cita_origen_id_fkey(...)`.

## Motor de ofertas (solo `service_role` y cron)

| Función                                                                             | Qué hace                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ofrecer_siguiente_candidato(p_cupo_id, p_priorizacion_id default null)`            | Bloquea el cupo y crea la oferta de la siguiente ronda. Con `p_priorizacion_id` usa el ranking registrado y revalida cada candidato; si ninguno sirve (o la ronda cambió) usa la regla SQL. Sin él, usa la regla SQL. Devuelve `{ resultado, cupo_id, estado_cupo, ronda, oferta_id, priorizacion_id }` con `resultado` ∈ `oferta_creada`, `ya_ofertado`, `sin_candidatos`, `cupo_cerrado`. |
| `expirar_ofertas()`                                                                 | Cierra los cupos a menos de 30 minutos (cancela su oferta) y vence las ofertas sin respuesta (avisa al paciente). `{ cupos_expirados, ofertas_expiradas }`                                                                                                                                                                                                                                  |
| `avanzar_cupos(p_especialidad_id default null)`                                     | Ofrece al siguiente candidato cada cupo abierto sin oferta vigente (regla SQL), los más próximos primero. Devuelve cuántas ofertas creó.                                                                                                                                                                                                                                                    |
| `candidatos_cupo(p_cupo_id)`                                                        | Candidatos que pasan los filtros obligatorios, con los datos del puntaje (nunca nombre, contacto ni coordenadas).                                                                                                                                                                                                                                                                           |
| `registrar_priorizacion(p_cupo_id, p_candidatos, p_fuente default 'regla_backend')` | Guarda un ranking `[{ pacienteId, explicacion }]` y devuelve el id de la priorización.                                                                                                                                                                                                                                                                                                      |

## Edge Function `priorizar-cupo`

```http
POST /functions/v1/priorizar-cupo
Authorization: Bearer <JWT de la sesión>
Content-Type: application/json

{ "cupoId": "<uuid>" }
```

1. Comprueba que quien llama **ve el cupo** con su propio JWT, es decir, que RLS lo
   permite: staff del consultorio, paciente que liberó el cupo o que recibió una
   oferta de él. La service role también puede llamarla.
2. Si el cupo está cerrado o ya tiene oferta vigente, responde sin hacer nada.
3. Pide a Postgres los candidatos válidos (`candidatos_cupo`).
4. Los ordena con `_shared/priorizacion.ts` y explica cada puntaje.
5. Registra la auditoría (`registrar_priorizacion`).
6. Llama a `ofrecer_siguiente_candidato` con esa priorización: **el backend decide**.

| Estado | Cuerpo                                                          |
| ------ | --------------------------------------------------------------- |
| 200    | `{ cupoId, resultado, estadoCupo, ronda? }`                     |
| 401    | Sin JWT válido (lo responde el gateway: `verify_jwt = true`)    |
| 404    | `{ error: 'no_encontrado' }`: el cupo no existe o no es visible |
| 422    | `{ error: 'validacion' }`: el cuerpo no es `{ cupoId: uuid }`   |
| 500    | `{ error: 'desconocido' }` (el detalle queda solo en los logs)  |

La respuesta nunca dice a quién se ofreció el cupo, y el cliente no puede elegir
destinatarios: solo indica qué cupo priorizar. La función usa las variables que
Supabase inyecta (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`);
no necesita secretos propios. En la Fase 5 aquí se agrega DeepSeek: la IA propone el
ranking, `ofrecer_siguiente_candidato` lo valida y, si falla, se usa la regla SQL.

### Cuándo se prioriza un cupo

| Evento                                         | Quién dispara                                                                | Regla      |
| ---------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| Se cancela una cita y queda un cupo            | La app invoca `priorizar-cupo` con el `cupo_id` que devolvió `cancelar_cita` | TypeScript |
| El paciente rechaza una oferta                 | La app invoca `priorizar-cupo` con el `cupo_id` de `responder_oferta`        | TypeScript |
| El paciente sale de la lista con una oferta    | La app invoca `priorizar-cupo` por cada cupo de `cupos_por_priorizar`        | TypeScript |
| Vence una oferta o la app no invocó la función | **pg_cron cada minuto:** `expirar_ofertas()` y luego `avanzar_cupos()`       | SQL        |
| Aparece un candidato (lista o preferencias)    | `unirse_lista_espera` / `guardar_preferencias` llaman a `avanzar_cupos()`    | SQL        |

```mermaid
sequenceDiagram
  participant App
  participant RPC as Postgres (RPC)
  participant EF as Edge Function priorizar-cupo
  participant Cron as pg_cron (cada minuto)
  App->>RPC: cancelar_cita(cita)
  RPC-->>App: { cupo_id, requiere_priorizacion: true }
  App->>EF: POST { cupoId }
  EF->>RPC: candidatos_cupo → registrar_priorizacion → ofrecer_siguiente_candidato
  RPC-->>EF: { resultado: oferta_creada, ronda: 1 }
  Note over RPC: Oferta + aviso al paciente (Realtime)
  Cron->>RPC: expirar_ofertas(); avanzar_cupos()
  Note over Cron,RPC: Si la oferta venció o nadie invocó la función,<br/>el cupo pasa al siguiente con la regla SQL
```

Las dos reglas son la misma (pesos, redondeo, desempate y textos) y las dos rutas son
idempotentes: si la Edge Function y el cron coinciden, una crea la oferta y la otra
responde `ya_ofertado`. Ningún cupo queda sin intentarse más de un minuto aunque la app
no invoque la función.

**Producción (Fase 4 en adelante):** el mismo esquema funciona en el proyecto remoto
(`supabase db push` y `supabase functions deploy priorizar-cupo`). Si se quiere que
todas las rondas usen la Edge Function (por ejemplo, con IA), se puede agregar un
Database Webhook o `pg_net` desde el cron con la clave guardada en Vault; no se hace en
local para no manejar secretos.

## Realtime

`ofertas` y `notificaciones` están en la publicación `supabase_realtime`. Realtime
aplica las mismas políticas RLS: cada paciente solo recibe sus propios cambios.
