import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, type IconName } from '@/components/ui';
import { colors, layout, radius, shadows, spacing, type TonoEstado } from '@/theme';

export type TipoToast = 'exito' | 'error' | 'info';

interface Toast {
  id: number;
  mensaje: string;
  tipo: TipoToast;
}

interface ToastContextValue {
  mostrar(mensaje: string, tipo?: TipoToast): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 3500;

const ESTILO: Record<TipoToast, { tono: TonoEstado; icono: IconName }> = {
  exito: { tono: 'success', icono: 'checkmark-circle' },
  error: { tono: 'error', icono: 'alert-circle' },
  info: { tono: 'info', icono: 'information-circle' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const contador = useRef(0);
  const insets = useSafeAreaInsets();

  const mostrar = useCallback((mensaje: string, tipo: TipoToast = 'info') => {
    contador.current += 1;
    setToast({ id: contador.current, mensaje, tipo });
    AccessibilityInfo.announceForAccessibility(mensaje);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [toast]);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);
  const estilo = toast ? ESTILO[toast.tipo] : null;
  const tono = estilo ? colors.tones[estilo.tono] : null;

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {toast && estilo && tono ? (
        <View pointerEvents="box-none" style={[styles.capa, { top: insets.top + spacing.sm }]}>
          <Pressable
            key={toast.id}
            onPress={() => setToast(null)}
            accessibilityRole="alert"
            accessibilityLabel={toast.mensaje}
            accessibilityHint="Toca para cerrar"
            style={[styles.toast, { backgroundColor: tono.soft, borderColor: tono.onSoft }]}
            testID="toast"
          >
            <Icon name={estilo.icono} size={22} color={tono.onSoft} />
            <AppText variant="bodyStrong" style={[styles.texto, { color: tono.onSoft }]}>
              {toast.mensaje}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return contexto;
}

const styles = StyleSheet.create({
  capa: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    ...shadows.lg,
  },
  texto: {
    flex: 1,
  },
});
