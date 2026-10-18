import { assertEquals } from 'jsr:@std/assert@1.0.19';

import { leerCupoId, responderJson, traducirError } from './http.ts';

const UUID = '4F3A2B1C-0D9E-4F8A-9B7C-6D5E4F3A2B1C';

Deno.test('leerCupoId: acepta solo { cupoId: uuid }', () => {
  assertEquals(leerCupoId({ cupoId: UUID }), UUID.toLowerCase());
  assertEquals(leerCupoId({ cupoId: 'cupo-1' }), null);
  assertEquals(leerCupoId({ cupoId: 7 }), null);
  assertEquals(leerCupoId({}), null);
  assertEquals(leerCupoId([UUID]), null);
  assertEquals(leerCupoId(null), null);
  assertEquals(leerCupoId('texto'), null);
});

Deno.test('traducirError: PTxyz → estado HTTP xyz y código de dominio', () => {
  assertEquals(traducirError({ code: 'PT404', message: 'no_encontrado' }), {
    estado: 404,
    codigo: 'no_encontrado',
  });
  assertEquals(traducirError({ code: 'PT409', message: 'oferta_ya_respondida' }), {
    estado: 409,
    codigo: 'oferta_ya_respondida',
  });
});

Deno.test('traducirError: cualquier otro error es 500 desconocido (sin filtrar detalles)', () => {
  assertEquals(traducirError({ code: '42501', message: 'permission denied for table cupos' }), {
    estado: 500,
    codigo: 'desconocido',
  });
  assertEquals(traducirError(new Error('boom')), { estado: 500, codigo: 'desconocido' });
  assertEquals(traducirError(null), { estado: 500, codigo: 'desconocido' });
});

Deno.test('responderJson: estado, JSON y CORS', async () => {
  const respuesta = responderJson(200, { resultado: 'oferta_creada' });
  assertEquals(respuesta.status, 200);
  assertEquals(respuesta.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assertEquals(respuesta.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(await respuesta.json(), { resultado: 'oferta_creada' });
  assertEquals(responderJson(204, null).body, null);
});
