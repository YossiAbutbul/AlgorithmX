import {
  Boxes,
  Gauge,
  GraduationCap,
  Lightbulb,
  MemoryStick,
  Network,
  Play,
  Scale,
  ShieldQuestionMark,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { InfoTooltip } from '../components/InfoTooltip';
import { DijkstraNegativeInsight, FlowIterationInsight } from '../components/InsightBox';
import type { SectionId } from '../components/sections';
import { Quiz } from '../components/Quiz';
import { RunPanel } from '../components/RunPanel';
import { Accordion, Section } from '../components/Section';
import type { AlgorithmModule } from '../algorithms/types';

interface Props {
  module: AlgorithmModule;
  all: AlgorithmModule[];
  section: SectionId;
  onNavigate: (id: string) => void;
  onGoToCompare: (pairId: string) => void;
}

function Badge({ icon: Icon, children, mono }: { icon: LucideIcon; children: string; mono?: boolean }) {
  return (
    <span className="meta-badge">
      <Icon size={14} aria-hidden="true" style={{ color: 'var(--accent)' }} />
      <span className={mono ? 'num' : undefined}>{children}</span>
    </span>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function AlgorithmPage({ module, all, section, onNavigate, onGoToCompare }: Props) {
  const active = section;

  const prereqs = module.requires
    .map((id) => all.find((m) => m.id === id))
    .filter((m): m is AlgorithmModule => !!m);

  return (
    <article className="flex flex-col">
      <header className="flex flex-col gap-3 pb-4 pt-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[length:var(--step-5)]">{module.titleHe}</h1>
          {prereqs.length > 0 && (
            <InfoTooltip label="מה צריך לדעת לפני">
              <p className="mb-2 text-[length:var(--step-1)] font-bold text-ink-soft">
                מה צריך לדעת לפני
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map((p) => (
                  <span key={p.id} className="meta-badge num">
                    {p.shortHe}
                  </span>
                ))}
              </div>
            </InfoTooltip>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge icon={Network}>
            {module.graphKind.flow
              ? 'רשת זרימה'
              : module.graphKind.directed
                ? 'גרף מכוון'
                : 'גרף לא מכוון'}
          </Badge>
          <Badge icon={Scale}>
            {!module.graphKind.weighted
              ? 'בלי משקלים'
              : module.graphKind.flow
                ? 'קיבולים אי שליליים'
                : module.graphKind.allowNegative
                  ? 'תומך במשקלים שליליים'
                  : 'משקלים אי שליליים בלבד'}
          </Badge>
          <Badge icon={Timer} mono>
            {module.content.efficiency.time}
          </Badge>
          <Badge icon={MemoryStick} mono>
            {module.content.efficiency.space}
          </Badge>
          {module.content.structures[0] && (
            <Badge icon={Boxes}>{module.content.structures[0].name}</Badge>
          )}
        </div>
      </header>

      <div
        key={active}
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`sub-${active}`}
        className="panel-in flex flex-col gap-4 pt-4"
      >
        {active === 'idea' && (
          <Section step={1} title="רעיון ומטרה" icon={Lightbulb}>
            <p className="max-w-[68ch] text-[length:var(--step-3)]">{module.content.idea}</p>
            <hr className="hairline" />
            <h3 className="mb-2 text-[length:var(--step-3)]">מתי משתמשים</h3>
            <Bullets items={module.content.whenToUse} />
          </Section>
        )}

        {active === 'run' && (
          <Section step={2} title="הרצה על גרף" subtitle={module.content.determinism} icon={Play}>
            <div className="flex flex-col gap-4">
              <RunPanel module={module} onGoToCompare={onGoToCompare} onNavigate={onNavigate} />
              {module.id === 'dijkstra' && <DijkstraNegativeInsight onNavigate={onNavigate} />}
              {module.id === 'edmonds-karp' && (
                <FlowIterationInsight onCompare={() => onGoToCompare('ff-ek')} />
              )}
            </div>
          </Section>
        )}

        {active === 'structures' && (
          <Section step={3} title="מבני נתונים" icon={Boxes}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {module.content.structures.map((s) => (
                <div key={s.name} className="card-quiet p-3">
                  <h3 className="num mb-1 text-[length:var(--step-3)]">{s.name}</h3>
                  <p className="text-[length:var(--step-2)] text-ink-soft">{s.role}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === 'efficiency' && (
          <Section step={4} title="יעילות" icon={Gauge}>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="card-quiet flex-1 px-4 py-3">
                <p className="text-[length:var(--step-1)] text-ink-soft">זמן</p>
                <p className="num text-[length:var(--step-4)]" style={{ color: 'var(--accent)' }}>
                  {module.content.efficiency.time}
                </p>
              </div>
              <div className="card-quiet flex-1 px-4 py-3">
                <p className="text-[length:var(--step-1)] text-ink-soft">זיכרון</p>
                <p className="num text-[length:var(--step-4)]" style={{ color: 'var(--accent)' }}>
                  {module.content.efficiency.space}
                </p>
              </div>
            </div>
            <Bullets items={module.content.efficiency.notes} />
          </Section>
        )}

        {active === 'pitfalls' && (
          <Section step={5} title="מלכודות ומסקנות" icon={TriangleAlert}>
            <ul className="flex flex-col gap-3">
              {module.content.pitfalls.map((p) => (
                <li key={p.title} className="flex gap-2.5">
                  <TriangleAlert
                    size={17}
                    aria-hidden="true"
                    className="mt-1 shrink-0"
                    style={{ color: 'var(--state-frontier)' }}
                  />
                  <div>
                    <h3 className="text-[length:var(--step-3)]">{p.title}</h3>
                    <p className="text-ink-soft">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <hr className="hairline" />
            <p
              className="rounded-card px-4 py-3 text-[length:var(--step-3)]"
              style={{ background: 'var(--accent-soft)', color: 'var(--ink)' }}
            >
              <b>השורה התחתונה: </b>
              {module.content.bottomLine}
            </p>
            <div className="card-quiet mt-3 bg-sunken p-3">
              <h3 className="mb-1.5 flex items-center gap-2 text-[length:var(--step-3)]">
                <GraduationCap size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} />
                איך זה נשאל במבחן
              </h3>
              <Bullets items={module.content.examTips} />
            </div>
          </Section>
        )}

        {active === 'practice' && (
          <>
            <Accordion summary="למה זה עובד" icon={ShieldQuestionMark}>
              <p className="mb-2">
                <b>האינווריאנטה: </b>
                {module.content.proof.invariant}
              </p>
              {module.content.proof.paragraphs.map((p, i) => (
                <p key={i} className="mb-2 max-w-[70ch] text-ink-soft">
                  {p}
                </p>
              ))}
            </Accordion>

            <Section title="שאלות תרגול" icon={GraduationCap}>
              <Quiz items={module.content.quiz} />
            </Section>
          </>
        )}
      </div>
    </article>
  );
}
