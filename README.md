# TurnoSmart

Los consultorios pierden citas por cancelaciones e inasistencias, mientras otros
pacientes no encuentran disponibilidad. **TurnoSmart** detecta los cupos que quedan
libres y los ofrece a pacientes compatibles de la lista de espera, para que esas
citas no se pierdan.

Es una sola app Expo con dos roles:

- **Paciente:** recibe ofertas de cupos de último minuto, las acepta o rechaza, y
  consulta sus citas, avisos y preferencias.
- **Staff del consultorio:** registra cancelaciones e inasistencias, ve los cupos
  liberados y recuperados, las ofertas en curso y el riesgo de inasistencia.

La IA (DeepSeek, Fase 5) prioriza a los pacientes con más probabilidad de aceptar un
cupo y estima el riesgo de inasistencia. Corre solo en el backend: **la IA recomienda
y el backend decide.** Ver [docs/arquitectura.md](docs/arquitectura.md).

## Stack

| Capa        | Tecnología                                                                      |
| ----------- | ------------------------------------------------------------------------------- |
| App         | Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript 6 (strict)            |
| Navegación  | Expo Router 57 (rutas por archivos, `Stack.Protected` por rol, rutas tipadas)   |
| Datos       | @tanstack/react-query 5 (caché, mutaciones, invalidación, refresco)             |
| Formularios | react-hook-form 7 + zod 4 (`@hookform/resolvers`)                               |
| Sesión      | AsyncStorage 2.2 (persistencia de la sesión demo; compatible con Expo Go)       |
| Calidad     | ESLint (`eslint-config-expo`) + Prettier · Jest (`jest-expo`) + Testing Library |
| Backend     | Supabase: Auth, Postgres + RLS, Realtime, Edge Functions (desde la Fase 3)      |
| IA          | DeepSeek, invocada solo desde Edge Functions (Fase 5)                           |

### Versión de Expo SDK: 57

Se eligió **SDK 57** y no la 58, aunque la 58 ya es `latest` en npm:

- Expo publicó la SDK 58 el 15 de octubre de 2026 y avisa que _"Expo Go for SDK 58
  on the Apple App Store and Google Play Store will be released within a few
  weeks"_. Hasta entonces, la app Expo Go de las tiendas sigue en la SDK 57, y
  `npx create-expo-app` crea proyectos SDK 57.
- Un proyecto SDK 58 hoy solo correría en un development build, y el proyecto
  necesita funcionar en **Expo Go**.

Cuando Expo Go para SDK 58 esté en las tiendas, la actualización es
`npx expo install expo@^58.0.0 --fix` (ver [changelog de la SDK 58](https://expo.dev/changelog/sdk-58)).

## Requisitos

- **Node.js 24 LTS** (React Native 0.86 acepta `^20.19.4 || ^22.13.0 || ^24.3.0 || >=25`;
  Node 20 ya no recibe soporte).
- **npm** (incluido con Node).
- **Expo Go** en el teléfono (App Store o Google Play), en su versión actual (SDK 57).
- El computador y el teléfono en la **misma red Wi-Fi**.

## Instalación

```bash
git clone https://github.com/LauraEscobar1/Turno_Smart.git
cd Turno_Smart
npm install
cp .env.example .env   # opcional hasta la Fase 4: sin .env la app funciona en MODO DEMO
```

> Para agregar dependencias usa siempre `npx expo install <paquete>`, que elige la
> versión compatible con el SDK. `npm install <paquete>` puede instalar versiones
> de otro SDK.

## Abrir en Expo Go

```bash
npm start
```

1. Se abre la terminal de Metro con un código QR.
2. **Android:** abre Expo Go → _Scan QR code_. **iPhone:** escanea el QR con la
   cámara y toca el aviso de Expo Go.
3. En la pantalla de inicio elige **Entrar como paciente demo** o **Entrar como
   staff demo** (o inicia sesión con una de las [cuentas demo](#cuentas-demo)).

Si el teléfono no conecta (redes de universidad o con aislamiento de clientes),
usa `npx expo start --tunnel`.

## Scripts

| Script                 | Qué hace                                              |
| ---------------------- | ----------------------------------------------------- |
| `npm start`            | Inicia Metro para abrir la app en Expo Go             |
| `npm run android`      | Inicia Metro y abre un emulador o dispositivo Android |
| `npm run ios`          | Inicia Metro y abre el simulador de iOS (solo macOS)  |
| `npm run typecheck`    | Verificación de tipos (`tsc --noEmit`)                |
| `npm run lint`         | ESLint + Prettier (`expo lint`)                       |
| `npm run format`       | Formatea el código con Prettier                       |
| `npm run format:check` | Comprueba el formato sin modificar archivos           |
| `npm test`             | Pruebas con Jest                                      |
| `npm run test:watch`   | Pruebas en modo observación                           |
| `npm run db:start`     | Levanta Supabase local (Docker)                       |
| `npm run db:reset`     | Aplica migraciones y datos ficticios (`seed.sql`)     |
| `npm run test:db`      | Pruebas pgTAP de la base de datos                     |
| `npm run test:deno`    | Pruebas de las Edge Functions (requiere Deno 2)       |

Diagnóstico del proyecto: `npx expo-doctor`.

## Estructura

```text
app/                    Rutas de Expo Router (solo componen pantallas)
  _layout.tsx           Proveedores y protección de rutas por rol
  index.tsx             Redirección inicial según la sesión
  (auth)/               login, registro
  (paciente)/           Tabs: ofertas (+ detalle, historial, lista de espera),
                        citas, notificaciones, perfil (+ preferencias)
  (staff)/              Tabs: panel, agenda, cupos (+ detalle), ofertas, perfil
  +not-found.tsx
src/
  components/ui/        Componentes base accesibles (Button, TextField, ConfirmDialog,
                        SelectorUnico/Múltiple, Stepper, ContenidoConsulta…)
  components/layout/    Screen, Header
  components/form/      CampoTexto (TextField + react-hook-form)
  context/              Servicios, consultas (react-query), sesión, toasts
  features/<dominio>/   hooks/ (datos) y components/ de auth, ofertas, listaEspera,
                        preferencias, citas, notificaciones, panel, demo
  services/             Contratos, errores tipados, claves de caché y el punto único
                        de selección de la implementación (index.ts)
  services/mock/        Servidor simulado, datos ficticios y reglas de simulación
  validacion/           Esquemas zod compartidos (formularios y servidor)
  theme/                Tokens tipados: colors, spacing, radius, typography, shadows
  constants/            Máquinas de estado, reglas de negocio, entorno
  types/ utils/ hooks/ test-utils/
backend/                Dominio compartido y pruebas (sin servidor Node)
supabase/               migrations/ (esquema, RLS, RPC, cron), seed.sql (ficticio),
                        functions/ (priorizar-cupo y _shared/), tests/ (pgTAP)
docs/                   PROMPT_MAESTRO.md, arquitectura.md, flujos.md, ramas.md,
                        base-de-datos.md, api.md
```

## Flujo de ramas

`main` ← `release/v1.0.0` ← `develop` ← `feature/fase-N-*`. Cada fase sale de
`develop` y vuelve a `develop` por Pull Request. Detalle en [docs/ramas.md](docs/ramas.md).

## Estado de las fases

| Fase | Rama                              | Contenido                                            | Estado        |
| ---- | --------------------------------- | ---------------------------------------------------- | ------------- |
| 1    | `feature/fase-1-fundacion`        | Proyecto, estructura, tema, componentes, sesión demo | ✅ Completada |
| 2    | `feature/fase-2-app-mobile`       | App completa con datos ficticios                     | ✅ Completada |
| 3    | `feature/fase-3-supabase-backend` | Supabase: esquema, RLS, Edge Functions               | ✅ Completada |
| 4    | `feature/fase-4-integracion`      | Integración sin IA + notificaciones                  | ⏳ Pendiente  |
| 5    | `feature/fase-5-ia-deepseek`      | Priorización y riesgo de inasistencia con DeepSeek   | ⏳ Pendiente  |
| 6    | `release/v1.0.0` → `main`         | QA y entrega                                         | ⏳ Pendiente  |

### Fase 2: qué incluye

La app funciona de punta a punta con **datos ficticios** servidos por un
**servidor simulado** en memoria (`src/services/mock/`), con latencia de 300–800 ms,
errores simulables y las mismas reglas que tendrá el backend. Las pantallas consumen
servicios tipados a través de hooks; en la Fase 4 se cambia la implementación en
`src/services/index.ts` por Supabase sin tocar las pantallas.

- Login y registro con validación (react-hook-form + zod); la sesión se guarda y se
  restaura al abrir la app.
- Paciente: ofertas con cuenta regresiva en vivo, aceptar o rechazar con
  confirmación, "¿Por qué recibí esta oferta?", lista de espera, preferencias,
  citas (próximas e historial) con cancelación, historial de ofertas y
  notificaciones con contador.
- Staff: métricas, agenda con riesgo de inasistencia (estimación ficticia), registro
  de cancelaciones e inasistencias, cupos con línea de tiempo y ofertas en curso.
- Cada pantalla con datos tiene estados de carga, error con reintento, vacío y éxito.

Detalle de los flujos, las máquinas de estado y las reglas: [docs/flujos.md](docs/flujos.md).

### Fase 3: backend en Supabase (local)

El backend replica las reglas del servidor simulado en Postgres: tablas con
restricciones y máquinas de estado validadas por triggers, RLS en todas las tablas,
RPC transaccionales (cancelar, responder, expirar, ofrecer), priorización
determinista auditada (SQL + Edge Function `priorizar-cupo`) y pg_cron cada minuto.
La app todavía usa el servidor simulado; se conecta en la Fase 4.

```bash
npm run db:start    # requiere Docker y la CLI de Supabase
npm run db:reset    # migraciones + datos ficticios con las mismas cuentas demo
npm run test:db     # pgTAP: esquema, RLS, RPC, priorización y concurrencia
```

Todo es local: no se enlaza un proyecto remoto ni se usan secretos. Modelo y seguridad
en [docs/base-de-datos.md](docs/base-de-datos.md); RPC y Edge Functions en
[docs/api.md](docs/api.md).

### Cuentas demo

Todas usan la contraseña `demo1234`. Las personas y sedes son ficticias.

| Cuenta                           | Rol                      | Para qué sirve                                                                   |
| -------------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| `paciente@demo.turnosmart.co`    | Paciente (Mariana Rojas) | Botón **Entrar como paciente demo**. Tiene una oferta pendiente al abrir la app. |
| `carlos@demo.turnosmart.co`      | Paciente (Carlos Pérez)  | Comprobar que un paciente no ve las ofertas de otro.                             |
| `staff@demo.turnosmart.co`       | Staff, Sede Centro       | Botón **Entrar como staff demo**.                                                |
| `staff.norte@demo.turnosmart.co` | Staff, Sede Norte        | Comprobar que el staff solo ve su consultorio.                                   |

También puedes **crear una cuenta de paciente** desde el login: empieza sin datos
(útil para ver los estados vacíos). Las mismas cuentas existen en el Supabase local
(`supabase/seed.sql`), con la misma contraseña.

### Cómo probar los flujos en Expo Go

**Paciente** (Entrar como paciente demo):

1. **Ofertas:** la oferta de Medicina general muestra la cuenta regresiva (15 min).
   Tócala para ver el detalle y "¿Por qué recibí esta oferta?".
2. **Aceptar cupo** → confirma → aparece "Cita confirmada". Toca **Ver mis citas**: la
   cita tiene la insignia "Cupo recuperado". (O **Rechazar**: el cupo pasa al
   siguiente paciente.)
3. **Lista de espera** (desde Ofertas): únete a Pediatría o sal de una lista.
4. **Perfil → Preferencias:** agrega franjas. Prueba una franja con el inicio igual
   al fin o dos franjas que se crucen el mismo día: la validación lo impide.
5. **Citas:** cancela la cita próxima de Medicina general (con confirmación).
6. **Avisos:** el contador de la pestaña muestra las no leídas; marca todas como leídas.

**Staff** (Entrar como staff demo):

1. **Panel:** métricas de la Sede Centro.
2. **Agenda:** riesgo por cita (estimación ficticia). **Registrar cancelación** en una
   cita futura y luego mira **Cupos**: aparece el cupo nuevo ofreciéndose. Hay una cita
   que ya comenzó para **Registrar inasistencia**.
3. **Cupos:** filtra por estado y abre un cupo para ver la línea de tiempo de rondas.
4. **Ofertas:** ofertas pendientes con su tiempo restante.

**Errores y datos** (Perfil → Herramientas de desarrollo, en ambos roles):

- **Simular fallos de conexión:** "Siempre" hace fallar todas las peticiones (verás los
  estados de error con **Reintentar**); "Intermitentes" falla ~30 %.
- **Restablecer datos de demostración:** vuelve al escenario inicial.

### Limitaciones del modo demo

- Los datos viven en memoria: al cerrar la app se regeneran. La sesión de las cuentas
  demo se restaura; las cuentas creadas con el registro se pierden.
- La priorización de pacientes y el riesgo de inasistencia son **reglas de
  simulación** documentadas, no la lógica final (Fases 3 y 5).
- Las notificaciones son dentro de la app (se consultan cada 15 s); las notificaciones
  locales y Realtime llegan en la Fase 4.

## Seguridad

- En `.env` solo van variables `EXPO_PUBLIC_*`, que son públicas.
- `DEEPSEEK_API_KEY` y la service role de Supabase **nunca** van en la app ni en el
  repositorio: son secretos de las Edge Functions.
- La seguridad real la da el backend: RLS en todas las tablas, el cliente solo lee, y
  todo cambio de estado pasa por RPC que validan quién llama. Ningún cliente crea
  ofertas ni elige a quién se ofrece un cupo.
