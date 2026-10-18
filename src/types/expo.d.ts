// Tipos globales de Expo (process.env, require.context…). Expo también genera
// `expo-env.d.ts` al ejecutar `expo start`, pero ese archivo no se versiona; esta
// referencia garantiza que `npm run typecheck` funcione en un clon limpio o en CI.
/// <reference types="expo/types" />
