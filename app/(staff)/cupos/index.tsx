import { Header, Screen } from '@/components/layout';
import { EmptyState, Notice } from '@/components/ui';
import { CupoCard } from '@/features/panel/components/CupoCard';
import { CUPOS_FICTICIOS } from '@/features/panel/mocks/panel.ficticio';

export default function Cupos() {
  const cupos = CUPOS_FICTICIOS;

  return (
    <Screen scroll>
      <Header
        title="Cupos liberados"
        subtitle="Citas canceladas o con inasistencia que pueden recuperarse."
      />
      <Notice
        tone="info"
        title="Datos ficticios"
        message="El registro de cancelaciones e inasistencias se habilita en la Fase 2."
      />
      {cupos.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="No hay cupos liberados"
          description="Cuando registres una cancelación o inasistencia, el cupo aparecerá aquí."
        />
      ) : (
        cupos.map((cupo) => <CupoCard key={cupo.id} cupo={cupo} />)
      )}
    </Screen>
  );
}
