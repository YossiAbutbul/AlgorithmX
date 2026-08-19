import type { AuxView } from '../../algorithms/types';
import { ArrayTable } from './ArrayTable';
import { DisjointSetView } from './DisjointSetView';
import { EdgeListView } from './EdgeListView';
import { FlowTable } from './FlowTable';
import { MatrixView } from './MatrixView';
import { PriorityQueueView } from './PriorityQueueView';
import { QueueView } from './QueueView';
import { SetView } from './SetView';
import { StackView } from './StackView';

interface Props {
  views: AuxView[];
  hovered?: string | null;
  onHover?: (id: string | null) => void;
}

function renderView(
  view: AuxView,
  hovered: string | null | undefined,
  onHover: ((id: string | null) => void) | undefined,
) {
  switch (view.kind) {
    case 'queue':
      return <QueueView view={view} onHover={onHover} />;
    case 'stack':
      return <StackView view={view} onHover={onHover} />;
    case 'priorityQueue':
      return <PriorityQueueView view={view} onHover={onHover} />;
    case 'arrayTable':
      return <ArrayTable view={view} hovered={hovered} onHover={onHover} />;
    case 'matrix':
      return <MatrixView view={view} />;
    case 'edgeList':
      return <EdgeListView view={view} />;
    case 'disjointSet':
      return <DisjointSetView view={view} onHover={onHover} />;
    case 'flowTable':
      return <FlowTable view={view} />;
    case 'setView':
      return <SetView view={view} onHover={onHover} />;
    default:
      return null;
  }
}

export function AuxPanel({ views, hovered, onHover }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {views.map((view, i) => (
        <section key={`${view.kind}-${i}`} className="card-quiet p-3">
          <h4 className="mb-2 text-[var(--step-2)] text-ink-soft">{view.title}</h4>
          {renderView(view, hovered, onHover)}
        </section>
      ))}
    </div>
  );
}
