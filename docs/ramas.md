# Flujo de ramas

## Ramas

| Rama                              | Propósito                                                        | Sale de   | Vuelve a             |
| --------------------------------- | ---------------------------------------------------------------- | --------- | -------------------- |
| `main`                            | Versión entregable. Solo recibe releases.                        | —         | —                    |
| `develop`                         | Integración de las fases terminadas.                             | `main`    | `main` (vía release) |
| `feature/fase-1-fundacion`        | Proyecto Expo, estructura, tema, componentes base, sesión demo.  | `develop` | `develop`            |
| `feature/fase-2-app-mobile`       | Pantallas completas con datos ficticios.                         | `develop` | `develop`            |
| `feature/fase-3-supabase-backend` | Esquema, RLS, migraciones, Edge Functions y pruebas.             | `develop` | `develop`            |
| `feature/fase-4-integracion`      | App conectada a Supabase (sin IA) y notificaciones.              | `develop` | `develop`            |
| `feature/fase-5-ia-deepseek`      | Priorización de pacientes y riesgo de inasistencia con DeepSeek. | `develop` | `develop`            |
| `release/v1.0.0`                  | QA y entrega (Fase 6). Solo correcciones.                        | `develop` | `main` y `develop`   |

## Flujo de trabajo

1. Actualizar `develop` y crear la rama de la fase desde ahí:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/fase-N-nombre
   ```
2. Hacer commits pequeños con [Conventional Commits](https://www.conventionalcommits.org/es/) en español:
   ```text
   feat(fase-2): agrega detalle de oferta con aceptar y rechazar
   fix(fase-2): corrige el contraste del badge de expirada
   chore: actualiza dependencias de Expo
   docs: documenta el flujo de notificaciones
   test(fase-3): cubre las políticas RLS de ofertas
   ```
3. Antes de abrir el PR, todo debe pasar:
   ```bash
   npm run typecheck && npm run lint && npm test && npx expo-doctor
   ```
4. Publicar la rama y abrir un Pull Request **hacia `develop`**:
   ```bash
   git push -u origin feature/fase-N-nombre
   ```
5. Revisar el PR (descripción, capturas en Expo Go, checklist de verificación) y
   fusionarlo en `develop`.
6. Fase 6: crear `release/v1.0.0` desde `develop`, hacer QA y corregir errores, y
   abrir los PR `release/v1.0.0 → main` y `release/v1.0.0 → develop`. Etiquetar
   `v1.0.0` en `main`.

## Reglas

- Nunca se hace commit directo en `main` ni en `develop`; todo entra por PR.
- Sin `force push` ni `rebase` sobre ramas publicadas.
- Una rama por fase. Si una fase crece, se divide en PR más pequeños hacia `develop`.
