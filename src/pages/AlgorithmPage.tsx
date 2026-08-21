import {
  Boxes,
  ChevronLeft,
  Gauge,
  GraduationCap,
  Lightbulb,
  Play,
  ShieldQuestionMark,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { InfoTooltip } from '../components/InfoTooltip';
import { DijkstraNegativeInsight, FlowIterationInsight } from '../components/InsightBox';
import { SECTIONS, type SectionId } from '../components/sections';
import { Quiz } from '../components/Quiz';
import { RunPanel } from '../components/RunPanel';
import { Accordion, Section } from '../components/Section';
import type { AlgorithmModule } from '../algorithms/types';

interface Props {
  module: AlgorithmModule;
  all: AlgorithmModule[];
  section: SectionId;
  onSelectSection: (id: SectionId) => void;
  onNavigate: (id: string) => void;
  onGoToCompare: (pairId: string) => void;
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

/** A quiet line of facts, shown where they are relevant rather than on every section. */
function Facts({ module }: { module: AlgorithmModule }) {
  const graphKind = module.graphKind.flow
    ? 'רשת זרימה'
    : module.graphKind.directed
      ? 'גרף מכוון'
      : 'גרף לא מכוון';
  const weights = !module.graphKind.weighted
    ? 'בלי משקלים'
    : module.graphKind.flow
      ? 'קיבולים אי שליליים'
      : module.graphKind.allowNegative
        ? 'תומך במשקלים שליליים'
        : 'משקלים אי שליליים בלבד';
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-soft" style={{ fontSize: 'var(--step-1)' }}>
      <span>{graphKind}</span>
      <span aria-hidden="true">&middot;</span>
      <span>{weights}</span>
      <span aria-hidden="true">&middot;</span>
      <span className="flex items-center gap-1">
        <Timer size={13} aria-hidden="true" />
        <span className="num">{module.content.efficiency.time}</span>
      </span>
      {module.content.structures[0] && (
        <>
          <span aria-hidden="true">&middot;</span>
          <span className="flex items-center gap-1">
            <Boxes size={13} aria-hidden="true" />
            {module.content.structures[0].name}
          </span>
        </>
      )}
    </p>
  );
}

export function AlgorithmPage({
  module,
  all,
  section,
  onSelectSection,
  onNavigate,
  onGoToCompare,
}: Props) {
  const active = section;
  const isRun = active === 'run';

  const prereqs = module.requires
    .map((id) => all.find((m) => m.id === id))
    .filter((m): m is AlgorithmModule => !!m);

  const i = SECTIONS.findIndex((s) => s.id === active);
  const nextSection = SECTIONS[i + 1];

  return (
    <article className="flex flex-1 flex-col">
      {/*
       * The title is stated once. The section tab in the header says which part
       * you are on, so the old card header and its second numbering are gone.
       */}
      <header className="flex flex-col gap-1 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 style={{ fontSize: 'var(--step-5)' }}>{module.titleHe}</h1>
          {prereqs.length > 0 && (
            <InfoTooltip label="מה צריך לדעת לפני">
              <p className="mb-2 text-ink-soft" style={{ fontSize: 'var(--step-1)', fontWeight: 700 }}>
                מה צריך לדעת לפני
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map((p) => (
                  <button
                    key={p.id}
                    className="meta-badge num"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate(p.id)}
                  >
                    {p.shortHe}
                  </button>
                ))}
              </div>
            </InfoTooltip>
          )}
        </div>
        <Facts module={module} />
      </header>

      <div
        key={active}
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="panel-in flex flex-1 flex-col gap-4"
      >
        {active === 'idea' && (
          <Section title="רעיון ומטרה" icon={Lightbulb} narrow>
            <p className="prose" style={{ fontSize: 'var(--step-3)' }}>
              {module.content.idea}
            </p>
            <hr className="hairline" />
            <h3 className="mb-2" style={{ fontSize: 'var(--step-3)' }}>
              מתי משתמשים
            </h3>
            <div className="prose">
              <Bullets items={module.content.whenToUse} />
            </div>
          </Section>
        )}

        {isRun && (
          <div className="flex flex-col gap-4">
            <RunPanel module={module} onGoToCompare={onGoToCompare} onNavigate={onNavigate} />
            {module.id === 'dijkstra' && <DijkstraNegativeInsight onNavigate={onNavigate} />}
            {module.id === 'edmonds-karp' && (
              <FlowIterationInsight onCompare={() => onGoToCompare('ff-ek')} />
            )}
          </div>
        )}

        {active === 'structures' && (
          <Section title="מבני נתונים" icon={Boxes}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {module.content.structures.map((s) => (
                <div key={s.name} className="card-quiet p-3">
                  <h3 className="num mb-1" style={{ fontSize: 'var(--step-3)' }}>
                    {s.name}
                  </h3>
                  <p className="text-ink-soft">{s.role}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {active === 'efficiency' && (
          <Section title="יעילות" icon={Gauge} narrow>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="card-quiet flex-1 px-4 py-3">
                <p className="text-ink-soft" style={{ fontSize: 'var(--step-1)' }}>
                  זמן
                </p>
                <p className="num" style={{ fontSize: 'var(--step-4)', color: 'var(--accent)' }}>
                  {module.content.efficiency.time}
                </p>
              </div>
              <div className="card-quiet flex-1 px-4 py-3">
                <p className="text-ink-soft" style={{ fontSize: 'var(--step-1)' }}>
                  זיכרון
                </p>
                <p className="num" style={{ fontSize: 'var(--step-4)', color: 'var(--accent)' }}>
                  {module.content.efficiency.space}
                </p>
              </div>
            </div>
            <Bullets items={module.content.efficiency.notes} />
          </Section>
        )}

        {active === 'pitfalls' && (
          <Section title="מלכודות ומסקנות" icon={TriangleAlert} narrow>
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
                    <h3 style={{ fontSize: 'var(--step-3)' }}>{p.title}</h3>
                    <p className="text-ink-soft">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <hr className="hairline" />
            <p
              className="rounded-card px-4 py-3"
              style={{
                fontSize: 'var(--step-3)',
                background: 'var(--accent-soft)',
                color: 'var(--ink)',
              }}
            >
              <b>השורה התחתונה: </b>
              {module.content.bottomLine}
            </p>
            <div className="card-quiet mt-3 p-3">
              <h3 className="mb-1.5 flex items-center gap-2" style={{ fontSize: 'var(--step-3)' }}>
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
              <p className="prose mb-2">
                <b>האינווריאנטה: </b>
                {module.content.proof.invariant}
              </p>
              {module.content.proof.paragraphs.map((p, k) => (
                <p key={k} className="prose mb-2 text-ink-soft">
                  {p}
                </p>
              ))}
            </Accordion>

            <Section title="שאלות תרגול" icon={GraduationCap} narrow>
              <Quiz items={module.content.quiz} />
            </Section>
          </>
        )}

        {/* A light section used to float in an empty page. Now it points forward. */}
        {!isRun && nextSection && (
          <button
            className="btn mt-2 self-start"
            onClick={() => onSelectSection(nextSection.id)}
          >
            {nextSection.id === 'run' && <Play size={15} aria-hidden="true" />}
            הבא: {nextSection.label}
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
