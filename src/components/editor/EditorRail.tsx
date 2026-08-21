import { Trash2 } from 'lucide-react';
import type { AlgorithmModule, NodeId } from '../../algorithms/types';
import { edgeLabel } from '../../algorithms/engine';
import type { GraphDraft } from './useGraphDraft';

interface Props {
  module: AlgorithmModule;
  draft: GraphDraft;
  source?: NodeId;
  sink?: NodeId;
  onSource: (id: NodeId) => void;
  onSink: (id: NodeId) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-(length:--step-1)">
      <span className="text-ink-soft">{label}</span>
      <b className="num">{value}</b>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h4 className="text-(length:--step-2) text-ink-soft">{children}</h4>;
}

/**
 * The editor's inspector. It takes the column the data structures use during a
 * run, so opening the editor never changes the shape of the page: whatever is
 * selected on the canvas is described and edited here.
 */
export function EditorRail({ module, draft, source, sink, onSource, onSink }: Props) {
  const { graph, selection } = draft;
  const weighted = module.graphKind.weighted || graph.flow;
  const weightLabel = graph.flow ? 'קיבול' : 'משקל';

  if (selection?.type === 'node') {
    const node = graph.nodes.find((n) => n.id === selection.id);
    if (!node) return null;
    const touching = graph.edges.filter((e) => e.from === node.id || e.to === node.id);

    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
        <Title>צומת {node.id}</Title>
        <section className="card-quiet flex flex-col gap-1.5 p-3">
          <Row label="מיקום" value={`${node.x}, ${node.y}`} />
          <Row label="צלעות" value={String(touching.length)} />
        </section>

        {module.needsSource && (
          <button
            className="btn w-full justify-center"
            disabled={source === node.id}
            onClick={() => onSource(node.id)}
          >
            {source === node.id ? 'זה צומת המקור' : 'הפוך לצומת המקור'}
          </button>
        )}
        {module.needsSink && (
          <button
            className="btn w-full justify-center"
            disabled={sink === node.id}
            onClick={() => onSink(node.id)}
          >
            {sink === node.id ? 'זה הבור' : 'הפוך לבור'}
          </button>
        )}

        <button className="btn btn-danger w-full justify-center" onClick={draft.deleteSelection}>
          <Trash2 size={15} aria-hidden="true" />
          מחק צומת {node.id}
        </button>
        {touching.length > 0 && (
          <p className="text-(length:--step-1) text-ink-faint">
            המחיקה תוריד גם {touching.length} צלעות שנוגעות בו.
          </p>
        )}
      </div>
    );
  }

  if (selection?.type === 'edge') {
    const edge = graph.edges.find((e) => e.id === selection.id);
    if (!edge) return null;

    return (
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
        <Title>
          צלע <span className="num">{edgeLabel(graph, edge)}</span>
        </Title>

        <section className="card-quiet flex flex-col gap-2 p-3">
          {weighted ? (
            <label className="flex items-center justify-between gap-2 text-(length:--step-1)">
              <span className="text-ink-soft">{weightLabel}</span>
              <input
                className="num w-24 rounded-md border border-line bg-surface px-2 py-1 text-center"
                type="number"
                value={edge.weight}
                onFocus={draft.beginChange}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  draft.setWeight(edge.id, Number.isFinite(v) ? v : 0);
                }}
              />
            </label>
          ) : (
            <p className="text-(length:--step-1) text-ink-faint">
              האלגוריתם הזה רץ בלי משקלים, ולכן אין לצלע ערך לערוך.
            </p>
          )}
        </section>

        {graph.directed && (
          <button className="btn w-full justify-center" onClick={() => draft.flipEdge(edge.id)}>
            הפוך את כיוון הצלע
          </button>
        )}

        <button className="btn btn-danger w-full justify-center" onClick={draft.deleteSelection}>
          <Trash2 size={15} aria-hidden="true" />
          מחק צלע
        </button>
      </div>
    );
  }

  const orphans = graph.nodes.filter(
    (n) => !graph.edges.some((e) => e.from === n.id || e.to === n.id),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <Title>הגרף</Title>
      <section className="card-quiet flex flex-col gap-1.5 p-3">
        <Row label="צמתים" value={String(graph.nodes.length)} />
        <Row label="צלעות" value={String(graph.edges.length)} />
        <Row label="כיווניות" value={graph.directed ? 'מכוון' : 'לא מכוון'} />
        <Row label="משקלים" value={weighted ? 'כן' : 'לא'} />
      </section>

      {(module.needsSource || module.needsSink) && (
        <>
          <Title>נקודות הקצה</Title>
          <section className="card-quiet flex flex-col gap-2 p-3">
            {module.needsSource && (
              <label className="flex items-center justify-between gap-2 text-(length:--step-1)">
                <span className="text-ink-soft">מקור</span>
                <select
                  className="btn btn-sm num"
                  value={source ?? ''}
                  onChange={(e) => onSource(e.target.value)}
                >
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {module.needsSink && (
              <label className="flex items-center justify-between gap-2 text-(length:--step-1)">
                <span className="text-ink-soft">בור</span>
                <select
                  className="btn btn-sm num"
                  value={sink ?? ''}
                  onChange={(e) => onSink(e.target.value)}
                >
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        </>
      )}

      {orphans.length > 0 && (
        <p className="text-(length:--step-1) text-ink-faint">
          בלי צלעות: <span className="num">{orphans.map((n) => n.id).join(', ')}</span>. ההרצה לא
          תגיע לשם.
        </p>
      )}

      <p className="text-(length:--step-1) text-ink-faint">
        בחר צומת או צלע על הגרף כדי לערוך אותם. כל שינוי ניתן לביטול.
      </p>
    </div>
  );
}
