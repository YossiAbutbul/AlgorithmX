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

/**
 * A queue or a set is as tall as what it holds. A table or a matrix can be
 * taller than the rail, so those are the ones that take the leftover height and
 * scroll inside themselves, instead of the whole card scrolling and carrying
 * every heading off the top with it.
 */
const FILLS_COLUMN: Record<AuxView['kind'], boolean> = {
  queue: false,
  stack: false,
  priorityQueue: false,
  setView: false,
  arrayTable: true,
  matrix: true,
  edgeList: true,
  disjointSet: true,
  flowTable: true,
};

export function AuxPanel({ views, hovered, onHover }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {views.map((view, i) => {
        const fills = FILLS_COLUMN[view.kind];
        return (
          <section
            key={`${view.kind}-${i}`}
            className={`panel-in card-quiet flex flex-col p-3 ${
              fills ? 'min-h-0 flex-1' : 'flex-none'
            }`}
          >
            {/* A label for the panel, not a heading competing with the run. */}
            <h4 className="mb-2 flex-none text-(length:--step-1) font-medium text-ink-soft">
              {view.title}
            </h4>
            <div className={fills ? 'flex min-h-0 flex-1 flex-col' : undefined}>
              {renderView(view, hovered, onHover)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
