import { useEffect, useState } from 'react';
import { Download, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { edgeIdOf } from '../algorithms/engine';
import type { AlgorithmModule, GraphModel, NodeId } from '../algorithms/types';
import { cloneGraph } from '../graphs/presets';
import { exportGraph, importGraph } from '../graphs/storage';
import { GraphCanvas } from './GraphCanvas';

interface Props {
  module: AlgorithmModule;
  graph: GraphModel;
  onSave: (graph: GraphModel) => void;
  onReset: () => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function nextId(graph: GraphModel): NodeId {
  const used = new Set(graph.nodes.map((n) => n.id));
  for (const l of LETTERS) if (!used.has(l)) return l;
  return `N${graph.nodes.length + 1}`;
}

export function GraphEditor({ module, graph, onSave, onReset }: Props) {
  const [draft, setDraft] = useState<GraphModel>(() => cloneGraph(graph));
  const [selected, setSelected] = useState<NodeId[]>([]);
  const [weight, setWeight] = useState('1');
  const [io, setIo] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setDraft(cloneGraph(graph));
    setSelected([]);
  }, [graph]);

  const weighted = module.graphKind.weighted || draft.flow;
  const weightLabel = draft.flow ? 'קיבול' : 'משקל';

  function addNode(x: number, y: number) {
    const tooClose = draft.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 46);
    if (tooClose) return;
    setDraft((g) => ({ ...g, nodes: [...g.nodes, { id: nextId(g), x, y }] }));
    setMsg('נוסף צומת. לחיצה על שני צמתים מוסיפה ביניהם צלע.');
  }

  function toggleSelect(id: NodeId) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));
  }

  function addEdge() {
    if (selected.length !== 2) return;
    const [from, to] = selected;
    const w = Number(weight);
    if (!Number.isFinite(w)) {
      setMsg('המשקל חייב להיות מספר.');
      return;
    }
    const id = edgeIdOf(draft.directed, from, to);
    if (draft.edges.some((e) => e.id === id)) {
      setDraft((g) => ({
        ...g,
        edges: g.edges.map((e) => (e.id === id ? { ...e, weight: w } : e)),
      }));
      setMsg('הצלע כבר קיימת, ולכן רק המשקל שלה עודכן.');
    } else {
      setDraft((g) => ({ ...g, edges: [...g.edges, { id, from, to, weight: w }] }));
      setMsg(`נוספה צלע ${from} ל-${to} ב${weightLabel} ${w}.`);
    }
    setSelected([]);
  }

  function removeNode(id: NodeId) {
    setDraft((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    setSelected((s) => s.filter((x) => x !== id));
  }

  return (
    <div className="card-quiet flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[var(--step-3)]">עורך הגרף</h3>
        <p className="text-[var(--step-1)] text-ink-soft">
          לחיצה על שטח ריק מוסיפה צומת, גרירה מזיזה אותו, ולחיצה על שני צמתים בוחרת אותם לצלע.
          הכיווניות נקבעת לפי האלגוריתם: {module.graphKind.directed ? 'גרף מכוון' : 'גרף לא מכוון'}.
        </p>
      </div>

      <div className="card-quiet bg-sunken p-2">
        <GraphCanvas
          graph={draft}
          selectedNodes={selected}
          onNodeClick={toggleSelect}
          onCanvasClick={addNode}
          onNodeDrag={(id, x, y) =>
            setDraft((g) => ({
              ...g,
              nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
            }))
          }
          compact
          ariaLabel="עריכת הגרף"
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <span className="text-[var(--step-2)]">
          נבחרו: <b className="num">{selected.join(' , ') || 'אף אחד'}</b>
        </span>
        {weighted && (
          <label className="flex items-center gap-1.5 text-[var(--step-2)]">
            <span className="text-ink-soft">{weightLabel}</span>
            <input
              className="btn w-24"
              value={weight}
              inputMode="numeric"
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
        )}
        <button className="btn" onClick={addEdge} disabled={selected.length !== 2}>
          <Plus size={15} aria-hidden="true" />
          הוסף צלע
        </button>
        <button
          className="btn"
          disabled={selected.length !== 1}
          onClick={() => selected[0] && removeNode(selected[0])}
        >
          <Trash2 size={15} aria-hidden="true" />
          מחק צומת
        </button>
      </div>

      {draft.edges.length > 0 && (
        <div className="scroll-x">
          <table className="w-full border-collapse text-[var(--step-2)]">
            <thead>
              <tr>
                {['צלע', weightLabel, ''].map((c, i) => (
                  <th
                    key={i}
                    className="border-b border-line px-2 py-1 text-start text-[var(--step-1)] text-ink-soft"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.edges.map((e) => (
                <tr key={e.id}>
                  <td className="num border-b border-line px-2 py-1">
                    {e.from} {draft.directed ? '->' : '-'} {e.to}
                  </td>
                  <td className="border-b border-line px-2 py-1">
                    <input
                      className="num w-20 rounded-md border border-line px-1.5 py-0.5"
                      value={e.weight}
                      inputMode="numeric"
                      onChange={(ev) => {
                        const w = Number(ev.target.value);
                        setDraft((g) => ({
                          ...g,
                          edges: g.edges.map((x) =>
                            x.id === e.id ? { ...x, weight: Number.isFinite(w) ? w : 0 } : x,
                          ),
                        }));
                      }}
                    />
                  </td>
                  <td className="border-b border-line px-2 py-1">
                    <button
                      className="btn"
                      onClick={() =>
                        setDraft((g) => ({ ...g, edges: g.edges.filter((x) => x.id !== e.id) }))
                      }
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => onSave(draft)}>
          <Save size={15} aria-hidden="true" />
          שמור את הגרף שלי
        </button>
        <button className="btn" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          חזור לגרף המוכן
        </button>
        <button className="btn" onClick={() => setIo(exportGraph(draft))}>
          <Download size={15} aria-hidden="true" />
          ייצוא JSON
        </button>
        <button
          className="btn"
          onClick={() => {
            const g = importGraph(io);
            if (g) {
              setDraft(g);
              setMsg('הגרף יובא בהצלחה.');
            } else {
              setMsg('ה-JSON אינו תקין.');
            }
          }}
        >
          <Upload size={15} aria-hidden="true" />
          ייבוא JSON
        </button>
      </div>

      <textarea
        className="num h-24 w-full rounded-lg border border-line bg-sunken p-2 text-[var(--step-1)]"
        dir="ltr"
        placeholder='{"nodes":[...],"edges":[...]}'
        value={io}
        onChange={(e) => setIo(e.target.value)}
      />

      {msg && (
        <p aria-live="polite" className="text-[var(--step-1)] text-ink-soft">
          {msg}
        </p>
      )}
    </div>
  );
}
