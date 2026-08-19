import { useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { bellmanCompute } from '../algorithms/bellmanFord';
import { dijkstraCompute } from '../algorithms/dijkstra';
import { bfsAugmenting, dfsAugmenting, maxFlowCompute } from '../algorithms/flow';
import { flowResidual, flowSmall, negativeEdge } from '../graphs/presets';

function Box({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="card-quiet bg-sunken p-3">
      <h3 className="mb-2 text-[var(--step-3)]">{title}</h3>
      {children}
      {action && (
        <button className="btn btn-primary mt-3" onClick={action.onClick}>
          <ArrowLeftRight size={15} aria-hidden="true" />
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Dijkstra: התוצאה השגויה בפועל, לצד הערך הנכון, וקישור ל-Bellman-Ford. */
export function DijkstraNegativeInsight({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { wrong, right } = useMemo(() => {
    const graph = negativeEdge();
    return { wrong: dijkstraCompute(graph, 'S').dist, right: bellmanCompute(graph, 'S').dist };
  }, []);

  const ids = ['S', 'A', 'B'];
  return (
    <Box
      title="מה בדיוק יוצא שגוי בגרף עם המשקל השלילי"
      action={{ label: 'עבור ל-Bellman-Ford', onClick: () => onNavigate('bellman-ford') }}
    >
      <table className="w-full max-w-md border-collapse text-[var(--step-2)]">
        <thead>
          <tr>
            {['צומת', 'Dijkstra', 'האמת'].map((c) => (
              <th
                key={c}
                scope="col"
                className="border-b border-line px-2 py-1 text-start text-[var(--step-1)] text-ink-soft"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const bad = wrong[id] !== right[id];
            return (
              <tr key={id} style={{ background: bad ? 'var(--state-current-fill)' : 'transparent' }}>
                <td className="num border-b border-line px-2 py-1 font-bold">{id}</td>
                <td
                  className="num border-b border-line px-2 py-1"
                  style={{ color: bad ? 'var(--state-current)' : 'var(--ink)' }}
                >
                  {wrong[id]}
                  {bad ? ' (שגוי)' : ''}
                </td>
                <td className="num border-b border-line px-2 py-1">{right[id]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[var(--step-2)] text-ink-soft">
        Dijkstra סוגר את A על 3 לפני שהוא בכלל מסתכל על B, ואינו חוזר לצומת סגור. Bellman-Ford סורק
        את כל הצלעות שוב ולכן מתקן את הערך ל-1.
      </p>
    </Box>
  );
}

/** Edmonds-Karp: מונה איטרציות מול Ford-Fulkerson על אותן רשתות. */
export function FlowIterationInsight({ onCompare }: { onCompare: () => void }) {
  const rows = useMemo(() => {
    const nets = [
      { name: 'רשת 100 מול 1', graph: flowResidual() },
      { name: 'הרשת הקטנה', graph: flowSmall() },
    ];
    return nets.map((net) => {
      const ff = maxFlowCompute(net.graph, 's', 't', dfsAugmenting);
      const ek = maxFlowCompute(net.graph, 's', 't', bfsAugmenting);
      return {
        name: net.name,
        ff: ff.iterations,
        ek: ek.iterations,
        flow: ff.maxFlow,
        same: ff.maxFlow === ek.maxFlow,
      };
    });
  }, []);

  return (
    <Box
      title="מונה איטרציות: Ford-Fulkerson מול Edmonds-Karp"
      action={{ label: 'פתח השוואה זו לצד זו', onClick: onCompare }}
    >
      <table className="w-full max-w-xl border-collapse text-[var(--step-2)]">
        <thead>
          <tr>
            {['רשת', 'Ford-Fulkerson', 'Edmonds-Karp', 'הפרש', 'זרימה מקסימלית'].map((c) => (
              <th
                key={c}
                scope="col"
                className="border-b border-line px-2 py-1 text-start text-[var(--step-1)] text-ink-soft"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="border-b border-line px-2 py-1">{r.name}</td>
              <td className="num border-b border-line px-2 py-1">{r.ff}</td>
              <td
                className="num border-b border-line px-2 py-1"
                style={{ color: 'var(--state-done)', fontWeight: 700 }}
              >
                {r.ek}
              </td>
              <td className="num border-b border-line px-2 py-1">{r.ff - r.ek}</td>
              <td className="num border-b border-line px-2 py-1">
                {r.flow} {r.same ? '(זהה בשניהם)' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[var(--step-2)] text-ink-soft">
        הזרימה המקסימלית זהה תמיד. מה שמשתנה הוא רק מספר האיטרציות, וזה בדיוק מה ש-BFS קונה לנו.
      </p>
    </Box>
  );
}
