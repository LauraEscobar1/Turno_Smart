import { z } from 'zod';

import { DIAS_SEMANA } from '@/constants/estados';
import { OPCIONES_ANTELACION_HORAS, OPCIONES_DISTANCIA_KM } from '@/constants/reglas';
import type { DiaSemana } from '@/types';
import { esHoraValida, franjasSeSolapan, horaAMinutos } from '@/utils/fechas';

const campoHora = z.string().refine(esHoraValida, { error: 'Usa el formato HH:mm.' });

export const esquemaFranja = z
  .object({
    diaSemana: z.literal([0, 1, 2, 3, 4, 5, 6], { error: 'Elige un día de la semana.' }),
    horaInicio: campoHora,
    horaFin: campoHora,
  })
  .refine(
    (franja) =>
      !esHoraValida(franja.horaInicio) ||
      !esHoraValida(franja.horaFin) ||
      horaAMinutos(franja.horaInicio) < horaAMinutos(franja.horaFin),
    { error: 'La hora de inicio debe ser anterior a la de fin.', path: ['horaFin'] },
  );

export const esquemaPreferencias = z.object({
  especialidadIds: z
    .array(z.string().min(1))
    .max(10, { error: 'Elige como máximo 10 especialidades.' })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: 'Hay especialidades repetidas.',
    }),
  franjas: z
    .array(esquemaFranja)
    .max(21, { error: 'Puedes registrar como máximo 21 franjas.' })
    .superRefine((franjas, ctx) => {
      franjas.forEach((franja, i) => {
        const anterior = franjas.slice(0, i).findIndex((otra) => {
          try {
            return franjasSeSolapan(franja, otra);
          } catch {
            return false; // Las horas inválidas ya tienen su propio error.
          }
        });
        if (anterior >= 0) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'horaInicio'],
            message: `Se cruza con otra franja del ${DIAS_SEMANA[franja.diaSemana as DiaSemana].largo.toLowerCase()}.`,
          });
        }
      });
    }),
  distanciaMaxKm: z
    .number()
    .nullable()
    .refine((km) => OPCIONES_DISTANCIA_KM.includes(km), {
      error: 'Elige una de las distancias disponibles.',
    }),
  antelacionMinHoras: z.number().refine((horas) => OPCIONES_ANTELACION_HORAS.includes(horas), {
    error: 'Elige una de las antelaciones disponibles.',
  }),
});

export type ValoresPreferencias = z.input<typeof esquemaPreferencias>;
export type DatosPreferencias = z.output<typeof esquemaPreferencias>;
