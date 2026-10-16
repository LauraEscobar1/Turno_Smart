Problema: los consultorios tienen cancelaciones e inasistencias que dejan espacios vacíos en la agenda, mientras otros pacientes no encuentran disponibilidad.
Solución: TurnoSmart detecta los cupos libres y busca pacientes que puedan aprovecharlos.

Además de lo anterior, se implementará:
- Panel del consultorio (rol staff, en la misma app Expo): registrar cancelaciones e inasistencias, ver cupos liberados, ofertas en curso y métricas de cupos recuperados.
- IA para predecir posibles inasistencias: puntaje de riesgo basado en historial de asistencia y datos de la cita, sin datos clínicos ni sensibles, con explicación y recomendación para el staff.
- Notificaciones de citas de último minuto: dentro de la app (Supabase Realtime) y notificaciones locales compatibles con Expo Go; las push remotas requieren development build (opcional).

Plan de fases y ramas:
- Fase 1 Fundación → feature/fase-1-fundacion
- Fase 2 App mobile con datos ficticios → feature/fase-2-app-mobile
- Fase 3 Supabase y backend → feature/fase-3-supabase-backend
- Fase 4 Integración sin IA + notificaciones → feature/fase-4-integracion
- Fase 5 DeepSeek (priorización + inasistencias) → feature/fase-5-ia-deepseek
- Fase 6 QA y entrega → release/v1.0.0 → main
Todas las feature salen de develop y vuelven a develop por Pull Request.