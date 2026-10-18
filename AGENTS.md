This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` at the project root — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils, tests) in `src/`. Never create `src/app/`: Expo Router would switch to it as the routes directory.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## TurnoSmart project rules

- Product context: `docs/PROMPT_MAESTRO.md`. Architecture: `docs/arquitectura.md`. Branch flow: `docs/ramas.md`.
- The app must keep running in **Expo Go** (SDK 57): no native dependencies outside the Expo SDK.
- Screens never hard-code colors; use the tokens from `@/theme` (ESLint enforces this in `app/`).
- Navigate with the route group included (`/(paciente)/ofertas`, `/(staff)/ofertas`): both roles share route names.
- Screens depend on `useAuth()` and the contracts in `src/services/`, never on a concrete implementation.
- The AI (DeepSeek) is called only from Supabase Edge Functions. Never put `DEEPSEEK_API_KEY` or the service role key in the app or in `.env`.
- Fake data lives only in `src/services/mock/` (simulated server) and must be labeled as fake. Screens never import from `src/services/mock/`.
- Data flow: screen → hook in `src/features/*/hooks` (react-query) → `useServicios()` → contract in `src/services/`. The implementation is chosen only in `src/services/index.ts`.
- State changes must follow `src/constants/estados.ts` (`puedeTransicionar()`); validation schemas live in `src/validacion/` and are shared by forms and the server.
- In tests, create isolated services with `crearEntornoPrueba()` and render with `renderConProveedores()` (`src/test-utils/`).
