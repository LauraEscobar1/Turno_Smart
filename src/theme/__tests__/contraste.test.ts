import { colors } from '@/theme';
import type { TonoEstado } from '@/theme';
import { CONTRASTE_AA_COMPONENTE, CONTRASTE_AA_TEXTO, razonContraste } from '@/utils/contraste';

const fondosDeTexto = {
  background: colors.background,
  surface: colors.surface,
  surfaceMuted: colors.surfaceMuted,
  surfacePressed: colors.surfacePressed,
  // Fondo de las notificaciones no leídas.
  primarySoft: colors.tones.primary.soft,
};

const textos = {
  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
};

const tonos = Object.keys(colors.tones) as TonoEstado[];

describe('contraste de la paleta (WCAG AA)', () => {
  describe.each(Object.entries(textos))('%s', (_nombre, texto) => {
    it.each(Object.entries(fondosDeTexto))('sobre %s es ≥ 4.5', (_fondo, fondo) => {
      expect(razonContraste(texto, fondo)).toBeGreaterThanOrEqual(CONTRASTE_AA_TEXTO);
    });
  });

  it('el texto de los botones primarios es legible en reposo y presionado', () => {
    expect(razonContraste(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(
      CONTRASTE_AA_TEXTO,
    );
    expect(razonContraste(colors.onPrimary, colors.primaryPressed)).toBeGreaterThanOrEqual(
      CONTRASTE_AA_TEXTO,
    );
  });

  it('el texto deshabilitado sigue siendo legible', () => {
    expect(razonContraste(colors.onDisabled, colors.disabled)).toBeGreaterThanOrEqual(
      CONTRASTE_AA_TEXTO,
    );
  });

  it('el borde de los controles se distingue de la superficie (≥ 3)', () => {
    expect(razonContraste(colors.borderStrong, colors.surface)).toBeGreaterThanOrEqual(
      CONTRASTE_AA_COMPONENTE,
    );
  });

  describe.each(tonos)('tono %s', (tono) => {
    const { solid, soft, onSoft } = colors.tones[tono];

    it('texto sobre fondo suave (insignias) es ≥ 4.5', () => {
      expect(razonContraste(onSoft, soft)).toBeGreaterThanOrEqual(CONTRASTE_AA_TEXTO);
    });

    it('texto blanco sobre el color sólido es ≥ 4.5', () => {
      expect(razonContraste(colors.textInverse, solid)).toBeGreaterThanOrEqual(CONTRASTE_AA_TEXTO);
    });

    it('el color sólido como texto sobre superficie es ≥ 4.5', () => {
      expect(razonContraste(solid, colors.surface)).toBeGreaterThanOrEqual(CONTRASTE_AA_TEXTO);
    });
  });
});

describe('razonContraste', () => {
  it('negro sobre blanco es 21', () => {
    expect(razonContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('es simétrica', () => {
    expect(razonContraste('#0B6E6E', '#FFFFFF')).toBe(razonContraste('#FFFFFF', '#0B6E6E'));
  });

  it('rechaza colores con formato inválido', () => {
    expect(() => razonContraste('teal', '#FFFFFF')).toThrow('Color no válido');
  });
});
