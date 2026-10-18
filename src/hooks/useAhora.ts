import { useEffect, useState } from 'react';

/** Fecha actual que se actualiza cada `intervaloMs` (por defecto, cada segundo). */
export function useAhora(intervaloMs = 1000, activo = true): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs, activo]);

  return ahora;
}
