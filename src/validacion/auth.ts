import { z } from 'zod';

/** Esquemas compartidos por los formularios y el servidor simulado. */

export const LONGITUD_MIN_PASSWORD = 8;

const PATRON_TELEFONO = /^\+?\d[\d\s-]{6,14}\d$/;
const MENSAJE_TELEFONO = 'Ingresa un teléfono válido (solo números, espacios o guiones).';

const campoEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: 'Ingresa tu correo electrónico.' })
  .pipe(z.email({ error: 'Ingresa un correo electrónico válido.' }));

const campoPassword = z
  .string()
  .min(LONGITUD_MIN_PASSWORD, {
    error: `La contraseña debe tener al menos ${LONGITUD_MIN_PASSWORD} caracteres.`,
  })
  .max(72, { error: 'La contraseña no puede tener más de 72 caracteres.' });

const campoNombre = z
  .string()
  .trim()
  .min(3, { error: 'Ingresa tu nombre completo.' })
  .max(80, { error: 'El nombre no puede tener más de 80 caracteres.' });

export const esquemaLogin = z.object({
  email: campoEmail,
  password: campoPassword,
});

/** Datos que recibe el backend para crear un paciente. */
export const esquemaDatosRegistro = z.object({
  nombre: campoNombre,
  email: campoEmail,
  telefono: z.string().trim().regex(PATRON_TELEFONO, { error: MENSAJE_TELEFONO }).nullable(),
  password: campoPassword,
});

/** Formulario de registro: teléfono opcional (texto vacío → null) y confirmación. */
export const esquemaRegistro = z
  .object({
    nombre: campoNombre,
    email: campoEmail,
    telefono: z
      .string()
      .trim()
      .refine((valor) => valor === '' || PATRON_TELEFONO.test(valor), { error: MENSAJE_TELEFONO })
      .transform((valor) => (valor === '' ? null : valor)),
    password: campoPassword,
    confirmacion: z.string().min(1, { error: 'Confirma tu contraseña.' }),
  })
  .refine((datos) => datos.password === datos.confirmacion, {
    error: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  });

export type ValoresLogin = z.input<typeof esquemaLogin>;
export type ValoresRegistro = z.input<typeof esquemaRegistro>;
