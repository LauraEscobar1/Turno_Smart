# backend/

Esta carpeta **no contiene un servidor Node**. TurnoSmart no tiene backend propio
desplegado: la persistencia, la autenticación y la lógica del servidor viven en
Supabase (Postgres + RLS + Edge Functions), en la carpeta [`supabase/`](../supabase).

## Propósito

Aquí va el **dominio compartido y sus pruebas**, en TypeScript puro y sin
dependencias de React Native ni de Supabase, para poder usarlo desde:

- las Edge Functions (Deno), por ejemplo `supabase/functions/_shared/`;
- las pruebas de Jest del proyecto.

Contenido previsto:

| Fase | Contenido                                                                                                                                                 |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3    | ✅ Implementadas en Supabase (ver abajo): las reglas que necesitan bloqueo y RLS viven en SQL, y el puntaje en `supabase/functions/_shared/`.             |
| 5    | Validación de la respuesta de la IA (esquema, rangos de puntaje) y la regla final que decide sobre la recomendación. La IA recomienda; el backend decide. |

## Reglas

- Sin acceso a red ni a variables de entorno: funciones puras, fáciles de probar.
- Nada de secretos aquí. `DEEPSEEK_API_KEY` y la service role de Supabase se
  configuran solo como secretos de las Edge Functions (`supabase secrets set`).
- Estado: **vacía a propósito**.

## Fase 3: dónde quedaron las reglas

Las reglas deterministas no quedaron aquí porque dependen de la transacción: filtrar
candidatos, vencer ofertas y cambiar estados exige bloqueos (`FOR UPDATE`) e índices
únicos que solo garantiza Postgres.

- Filtros de candidatos, transiciones de estado, vencimientos y RPC:
  `supabase/migrations/` ([docs/base-de-datos.md](../docs/base-de-datos.md)).
- Puntaje y explicación (TypeScript puro, probado con `deno test`):
  `supabase/functions/_shared/priorizacion.ts`.
- La validación de la respuesta de la IA (Fase 5) puede vivir aquí o en `_shared/`,
  siempre como funciones puras.
