# Arquitectura de TurnoSmart

TurnoSmart recupera cupos médicos liberados por cancelaciones o inasistencias y los
ofrece a pacientes compatibles de la lista de espera. Esta guía describe cómo se
conectan las piezas y qué decide cada una.

## Diagrama

```text
┌──────────────────────────────────────────────┐
│ App Expo (una sola app, dos roles)           │
│  · Paciente: ofertas, citas, avisos, perfil  │
│  · Staff: panel, agenda, cupos, ofertas      │
│  Solo conoce EXPO_PUBLIC_SUPABASE_URL y la   │
│  anon key (públicas).                        │
└──────────────┬───────────────────────────────┘
               │ supabase-js (HTTPS + JWT del usuario)
               │ Realtime (avisos de cupos en la app)
               ▼
┌──────────────────────────────────────────────┐
│ Supabase                                     │
│  · Auth: sesiones y rol (paciente | staff)   │
│  · Postgres + RLS: cada rol ve solo sus datos│
│  · Realtime: cambios en ofertas y avisos     │
└──────────────┬───────────────────────────────┘
               │ invocación con el JWT del usuario
               ▼
┌──────────────────────────────────────────────┐
│ Edge Functions (Deno)                        │
│  · Reglas deterministas (backend/ compartido)│
│  · Valida la respuesta de la IA y DECIDE     │
│  · Secretos: DEEPSEEK_API_KEY, service role  │
└──────────────┬───────────────────────────────┘
               │ HTTPS (solo servidor → IA)
               ▼
┌──────────────────────────────────────────────┐
│ DeepSeek API                                 │
│  · Prioriza candidatos para un cupo          │
│  · Estima riesgo de inasistencia             │
│  Recibe datos mínimos, sin datos clínicos.   │
└──────────────────────────────────────────────┘
```

La app **nunca** llama a DeepSeek ni usa la service role. Si un secreto llegara a la
app, cualquier persona podría extraerlo del bundle.

## Roles

| Rol      | Qué hace                                                                                         | Rutas         |
| -------- | ------------------------------------------------------------------------------------------------ | ------------- |
| Paciente | Recibe ofertas de cupos, las acepta o rechaza, ve sus citas, avisos y preferencias.              | `(paciente)/` |
| Staff    | Registra cancelaciones e inasistencias, ve cupos liberados, ofertas en curso, métricas y riesgo. | `(staff)/`    |

La separación se aplica en dos capas:

1. **App (experiencia):** el layout raíz usa `Stack.Protected` para que cada grupo
   de rutas exista solo para su rol; cada grupo además verifica el rol en su
   `_layout.tsx`. La prueba `src/__tests__/navegacion-por-rol.test.tsx` lo verifica
   con las rutas reales.
2. **Supabase (seguridad real, Fase 3):** políticas RLS por rol. La protección en
   la app no sustituye a RLS; solo evita mostrar pantallas que no corresponden.

## Principios

- **La IA recomienda; el backend decide.** DeepSeek devuelve un orden de
  candidatos o un puntaje de riesgo con su explicación. La Edge Function valida la
  respuesta (esquema y rangos), aplica las reglas deterministas y toma la decisión.
  Si la IA falla o responde algo inválido, se usa una regla de respaldo sin IA.
- **El staff tiene la última palabra** sobre las acciones derivadas del riesgo de
  inasistencia (recordatorio, confirmación, sobreagenda). La app muestra la
  explicación y la recomendación; nunca actúa sola.
- **Datos mínimos.** A la IA se envían solo atributos operativos (especialidad,
  franja, historial de asistencia agregado, anticipación). Nunca diagnósticos,
  documentos de identidad ni datos de contacto.
- **Contratos antes que implementaciones.** Las pantallas dependen de hooks y
  contextos (`useAuth()`), y estos de las interfaces de `src/services/`. Pasar del
  servidor simulado a Supabase (Fase 4) solo cambia `src/services/index.ts`.
- **Compatible con Expo Go.** Nada de dependencias nativas fuera del SDK. Las
  notificaciones son en la app (Realtime) y locales; las push remotas requieren un
  development build y son opcionales.

## Capa de datos (desde la Fase 2)

```text
Pantalla (app/)            solo compone: hooks + componentes + estados de la consulta
  └─ hook (features/*/hooks)    useQuery / useMutation, claves e invalidación de caché
       └─ useServicios()        contexto con la implementación elegida
            └─ contrato (src/services/*.ts)     interfaz tipada + ServiceError
                 ├─ Fase 2: src/services/mock   servidor simulado en memoria
                 └─ Fase 4: Supabase            supabase-js + Edge Functions
```

- **Punto único de selección:** `src/services/index.ts` crea el conjunto de
  servicios. Las pruebas inyectan uno propio con `ServiciosProvider`.
- **Servidor simulado:** imita el backend: cada operación recibe a quien la ejecuta
  (como el JWT) y devuelve solo lo que le corresponde (como RLS); aplica las máquinas
  de estado de `src/constants/estados.ts`; vence las ofertas antes de cada petición
  (como un cron); simula latencia y fallos de red, y devuelve copias de los datos.
- **react-query:** la caché se limpia al cerrar sesión; tras cada mutación se
  invalidan las consultas afectadas; solo los errores de red se reintentan; las
  consultas se refrescan al volver la app a primer plano.
- **Validación compartida:** los esquemas zod de `src/validacion/` validan los
  formularios y, de nuevo, el servidor. El backend nunca confía en el cliente.
- **Errores tipados:** cada implementación traduce sus errores a `ServiceError` con
  un código; la interfaz muestra `mensajeDeError()` en español. Ver
  [flujos.md](flujos.md#errores-tipados).

## Estructura del código

```text
app/                     Rutas (Expo Router). Solo componen pantallas.
  _layout.tsx            Proveedores + Stack.Protected por rol
  index.tsx              Redirección inicial según la sesión
  (auth)/                login, registro
  (paciente)/            Tabs: ofertas, citas, notificaciones, perfil
  (staff)/               Tabs: panel, agenda, cupos, ofertas, perfil
src/
  components/ui/         Componentes base accesibles
  components/layout/     Screen, Header
  components/form/       Campos conectados a react-hook-form
  context/               Servicios, consultas, sesión, toasts
  features/<dominio>/    hooks/ (datos) y components/ de cada dominio
  services/              Contratos, errores, claves de caché, selección de implementación
  services/mock/         Servidor simulado y datos ficticios (solo modo demo)
  validacion/            Esquemas zod compartidos
  theme/                 Tokens: colors, spacing, radius, typography, shadows
  constants/             Máquinas de estado, reglas de negocio, entorno
  types/ utils/ hooks/ test-utils/
backend/                 Dominio compartido y pruebas (sin servidor Node)
supabase/                migrations/, functions/, tests/ (desde la Fase 3)
```

### Rutas con el mismo nombre en ambos roles

Los grupos `(paciente)` y `(staff)` no forman parte de la URL, y los dos tienen
`ofertas` y `perfil`. Por eso la URL `/ofertas` es ambigua. Dentro de la app se
navega siempre con el grupo explícito (`/(paciente)/ofertas`, `/(staff)/ofertas`;
ver `src/features/auth/rutas.ts`). Los enlaces profundos de la Fase 4 deben
apuntar a rutas sin ambigüedad, como `/ofertas/[id]`, que solo existe para el
paciente.

## Variables de entorno

| Variable                        | Dónde vive                 | Pública |
| ------------------------------- | -------------------------- | ------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | `.env` de la app           | Sí      |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` de la app           | Sí      |
| `DEEPSEEK_API_KEY`              | Secretos de Edge Functions | **No**  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Secretos de Edge Functions | **No**  |

`src/constants/env.ts` valida las variables públicas. Si faltan, lo informa una vez
en la terminal de Metro y la app sigue en modo demo, sin fallar.
