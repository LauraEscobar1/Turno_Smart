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
| 3    | Reglas de negocio deterministas: compatibilidad paciente–cupo, expiración de ofertas, transiciones de estado (`liberado → ofertado → recuperado`).        |
| 5    | Validación de la respuesta de la IA (esquema, rangos de puntaje) y la regla final que decide sobre la recomendación. La IA recomienda; el backend decide. |

## Reglas

- Sin acceso a red ni a variables de entorno: funciones puras, fáciles de probar.
- Nada de secretos aquí. `DEEPSEEK_API_KEY` y la service role de Supabase se
  configuran solo como secretos de las Edge Functions (`supabase secrets set`).
- Estado en la Fase 1: **vacía a propósito**; solo se documenta su propósito.
