import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

import { colors } from '@/theme';

/**
 * Pull-to-refresh. Solo muestra el indicador cuando la persona arrastra, no en
 * los refrescos automáticos de fondo.
 */
export function useRefrescoManual(refetch: () => Promise<unknown>) {
  const [refrescando, setRefrescando] = useState(false);

  const alRefrescar = useCallback(async () => {
    setRefrescando(true);
    try {
      await refetch();
    } finally {
      setRefrescando(false);
    }
  }, [refetch]);

  return (
    <RefreshControl
      refreshing={refrescando}
      onRefresh={alRefrescar}
      tintColor={colors.primary}
      colors={[colors.primary]}
      accessibilityLabel="Desliza hacia abajo para actualizar"
    />
  );
}
