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

| Capa       | Tecnología                                                                      |
| ---------- | ------------------------------------------------------------------------------- |
| App        | Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript 6 (strict)            |
| Navegación | Expo Router 57 (rutas por archivos, `Stack.Protected` por rol, rutas tipadas)   |
| Calidad    | ESLint (`eslint-config-expo`) + Prettier · Jest (`jest-expo`) + Testing Library |
| Backend    | Supabase: Auth, Postgres + RLS, Realtime, Edge Functions (desde la Fase 3)      |
| IA         | DeepSeek, invocada solo desde Edge Functions (Fase 5)                           |

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
cp .env.example .env   # opcional en la Fase 1: sin .env la app funciona en MODO DEMO
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
   staff demo**.

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

Diagnóstico del proyecto: `npx expo-doctor`.

## Estructura

```text
app/                    Rutas de Expo Router (solo componen pantallas)
  _layout.tsx           Providers y protección de rutas por rol
  index.tsx             Redirección inicial según la sesión
  (auth)/               login, registro
  (paciente)/           Tabs: ofertas, citas, notificaciones, perfil
  (staff)/              Tabs: panel, cupos, ofertas, perfil
  +not-found.tsx
src/
  components/ui/        Button, TextField, Card, Badge, Avatar, Divider, Notice,
                        ListItem, LoadingState, EmptyState, ErrorState, AppText, Icon
  components/layout/    Screen, Header
  context/              AuthContext (sesión simulada en la Fase 1)
  features/             auth, ofertas, citas, pacientes, preferencias, panel,
                        notificaciones (componentes y mocks/ ficticios)
  services/             Contratos de servicios (interfaces)
  theme/                Tokens tipados: colors, spacing, radius, typography, shadows
  constants/ types/ utils/ hooks/
backend/                Dominio compartido y pruebas (sin servidor Node)
supabase/               functions/_shared, migrations, tests (desde la Fase 3)
docs/                   PROMPT_MAESTRO.md, arquitectura.md, ramas.md
```

## Flujo de ramas

`main` ← `release/v1.0.0` ← `develop` ← `feature/fase-N-*`. Cada fase sale de
`develop` y vuelve a `develop` por Pull Request. Detalle en [docs/ramas.md](docs/ramas.md).

## Estado de las fases

| Fase | Rama                              | Contenido                                            | Estado        |
| ---- | --------------------------------- | ---------------------------------------------------- | ------------- |
| 1    | `feature/fase-1-fundacion`        | Proyecto, estructura, tema, componentes, sesión demo | ✅ Completada |
| 2    | `feature/fase-2-app-mobile`       | App completa con datos ficticios                     | ⏳ Pendiente  |
| 3    | `feature/fase-3-supabase-backend` | Supabase: esquema, RLS, Edge Functions               | ⏳ Pendiente  |
| 4    | `feature/fase-4-integracion`      | Integración sin IA + notificaciones                  | ⏳ Pendiente  |
| 5    | `feature/fase-5-ia-deepseek`      | Priorización y riesgo de inasistencia con DeepSeek   | ⏳ Pendiente  |
| 6    | `release/v1.0.0` → `main`         | QA y entrega                                         | ⏳ Pendiente  |

### Fase 1: qué incluye

- Sesión **simulada** (MODO DEMO) con dos accesos: paciente y staff. No hay cuentas
  reales ni datos persistentes.
- Cada rol solo puede abrir sus propias rutas (`Stack.Protected` y una verificación
  en el layout de cada grupo).
- Las pantallas muestran datos **ficticios** marcados como tales
  (`src/features/*/mocks`).
- Sin Supabase ni IA todavía.

## Seguridad

- En `.env` solo van variables `EXPO_PUBLIC_*`, que son públicas.
- `DEEPSEEK_API_KEY` y la service role de Supabase **nunca** van en la app ni en el
  repositorio: son secretos de las Edge Functions.
