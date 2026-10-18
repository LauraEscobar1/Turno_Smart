/**
 * Edge Function `priorizar-cupo` (Fase 3).
 *
 * POST /functions/v1/priorizar-cupo   { "cupoId": "<uuid>" }   con el JWT de quien llama.
 *
 * 1. Comprueba que quien llama ve el cupo: lo decide RLS (staff del consultorio,
 *    paciente que lo liberó o que recibió una oferta de él) o la service role.
 * 2. Pide a Postgres los candidatos válidos: los filtros obligatorios viven en SQL.
 * 3. Los ordena con la regla determinista de `_shared/priorizacion.ts`.
 * 4. Registra la auditoría (`priorizaciones` + `priorizacion_candidatos`).
 * 5. La RPC `ofrecer_siguiente_candidato` crea la oferta: vuelve a validar cada
 *    candidato bajo bloqueo, así que una propuesta vieja nunca se aplica a ciegas.
 *
 * Idempotente por cupo: si ya hay una oferta vigente responde `ya_ofertado`.
 * La respuesta nunca dice a quién se ofreció el cupo. El cliente no elige
 * destinatarios: solo indica qué cupo priorizar.
 */
import { createClient } from '@supabase/supabase-js';

import { leerCupoId, responderJson, traducirError } from '../_shared/http.ts';
import { type CandidatoValido, priorizarCandidatos } from '../_shared/priorizacion.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SIN_SESION = { auth: { persistSession: false, autoRefreshToken: false } } as const;

interface ResultadoOferta {
  resultado: string;
  estado_cupo: string;
  ronda: number;
}

interface CupoConContexto {
  estado: string;
  especialidad: { nombre: string };
  consultorio: { nombre: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return responderJson(204, null);
  if (req.method !== 'POST') return responderJson(405, { error: 'metodo_no_permitido' });

  const cupoId = leerCupoId(await req.json().catch(() => null));
  if (!cupoId) return responderJson(422, { error: 'validacion' });

  // Con el JWT de quien llama: RLS decide qué cupos puede ver.
  const comoUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...SIN_SESION,
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  // Servidor: lee el contexto y usa las RPC del motor (solo service_role).
  const servidor = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SIN_SESION);

  try {
    const visible = await comoUsuario.from('cupos').select('id').eq('id', cupoId).maybeSingle();
    if (visible.error) throw visible.error;
    if (!visible.data) return responderJson(404, { error: 'no_encontrado' });

    const cupo = await servidor
      .from('cupos')
      .select('estado, especialidad:especialidades(nombre), consultorio:consultorios(nombre)')
      .eq('id', cupoId)
      .single<CupoConContexto>();
    if (cupo.error) throw cupo.error;

    // Atajos sin auditoría: no hay nada que decidir. La RPC vuelve a comprobarlo.
    const vigente = await servidor
      .from('ofertas')
      .select('id')
      .eq('cupo_id', cupoId)
      .eq('estado', 'pendiente')
      .maybeSingle();
    if (vigente.error) throw vigente.error;
    const cerrado = cupo.data.estado === 'asignado' || cupo.data.estado === 'expirado';
    if (cerrado || vigente.data) {
      return responderJson(200, {
        cupoId,
        resultado: cerrado ? 'cupo_cerrado' : 'ya_ofertado',
        estadoCupo: cupo.data.estado,
      });
    }

    const candidatos = await servidor.rpc('candidatos_cupo', { p_cupo_id: cupoId });
    if (candidatos.error) throw candidatos.error;

    const ranking = priorizarCandidatos(
      (candidatos.data ?? []) as CandidatoValido[],
      { especialidad: cupo.data.especialidad.nombre, consultorio: cupo.data.consultorio.nombre },
      new Date(),
    );

    const priorizacion = await servidor.rpc('registrar_priorizacion', {
      p_cupo_id: cupoId,
      p_candidatos: ranking.map(({ pacienteId, explicacion }) => ({ pacienteId, explicacion })),
    });
    if (priorizacion.error) throw priorizacion.error;

    const oferta = await servidor.rpc('ofrecer_siguiente_candidato', {
      p_cupo_id: cupoId,
      p_priorizacion_id: priorizacion.data,
    });
    if (oferta.error) throw oferta.error;

    const resultado = oferta.data as ResultadoOferta;
    return responderJson(200, {
      cupoId,
      resultado: resultado.resultado,
      estadoCupo: resultado.estado_cupo,
      ronda: resultado.ronda,
    });
  } catch (error) {
    const { estado, codigo } = traducirError(error);
    if (estado >= 500) console.error('priorizar-cupo: error inesperado', error);
    return responderJson(estado, { error: codigo });
  }
});
