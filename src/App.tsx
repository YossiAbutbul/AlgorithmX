import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ALGORITHMS } from './algorithms';
import { AlgorithmSwitcher, EXTRA_TABS } from './components/AlgorithmSwitcher';
import { Brand } from './components/Brand';
import { Footer } from './components/Footer';
import { ScrollOverlay } from './components/ScrollOverlay';
import { SECTIONS, type SectionId } from './components/sections';
import { AlgorithmPage } from './pages/AlgorithmPage';
import { ComparisonTablePage } from './pages/ComparisonTablePage';
import { ComparePage } from './pages/ComparePage';
import { loadLastTab, saveLastTab } from './graphs/storage';

const ALL_IDS = [...ALGORITHMS.map((a) => a.id), ...EXTRA_TABS.map((t) => t.id)];

export function App() {
  const [tab, setTab] = useState<string>(() => {
    const saved = loadLastTab();
    return saved && ALL_IDS.includes(saved) ? saved : ALGORITHMS[0].id;
  });
  const [section, setSection] = useState<SectionId>('run');
  const [comparePair, setComparePair] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveLastTab(tab);
  }, [tab]);

  /**
   * One bar now, so one height to measure. Everything below offsets by it and
   * the run screen sizes its stage from what is left of the viewport.
   */
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        '--header-h',
        `${el.getBoundingClientRect().height.toFixed(2)}px`,
      );
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    sectionsRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [section, tab]);

  const go = useCallback((id: string) => {
    setTab(id);
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, []);

  function selectSection(id: SectionId) {
    setSection(id);
    window.scrollTo({ top: 0 });
  }

  function moveSection(delta: number) {
    const i = SECTIONS.findIndex((s) => s.id === section);
    selectSection(SECTIONS[Math.max(0, Math.min(SECTIONS.length - 1, i + delta))].id);
  }

  const current = ALGORITHMS.find((a) => a.id === tab);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only">
        דלג לתוכן
      </a>

      <ScrollOverlay />

      <header ref={headerRef} className="app-header">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="flex h-[56px] flex-none items-center sm:h-[60px]">
            <Brand onClick={() => go(ALGORITHMS[0].id)} />
          </div>

          <AlgorithmSwitcher all={ALGORITHMS} current={tab} onNavigate={go} />

          {current && (
            <nav
              ref={sectionsRef}
              role="tablist"
              aria-label="חלקי הנושא"
              className="no-scrollbar fade-end flex min-w-0 flex-1 items-center gap-0.5"
            >
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  id={`tab-${s.id}`}
                  aria-selected={section === s.id}
                  aria-controls={`panel-${s.id}`}
                  tabIndex={section === s.id ? 0 : -1}
                  className="section-tab"
                  onClick={() => selectSection(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') moveSection(1);
                    if (e.key === 'ArrowRight') moveSection(-1);
                  }}
                >
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </nav>
          )}

          {!current && <div className="min-w-0 flex-1" />}

          <div className="flex flex-none items-center gap-1">
            {EXTRA_TABS.map((t) => (
              <button
                key={t.id}
                className="icon-btn"
                aria-pressed={tab === t.id}
                title={t.label}
                aria-label={t.label}
                onClick={() => go(t.id)}
              >
                <t.Icon size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </header>

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-3 pb-6 sm:px-4 lg:px-6"
        style={{ paddingTop: 'var(--header-h)' }}
      >
        {current && (
          <AlgorithmPage
            module={current}
            all={ALGORITHMS}
            section={section}
            onSelectSection={selectSection}
            onNavigate={go}
            onGoToCompare={(pairId) => {
              setComparePair(pairId);
              go('compare');
            }}
          />
        )}
        {tab === 'table' && (
          <div className="pt-5">
            <ComparisonTablePage onNavigate={go} />
          </div>
        )}
        {tab === 'compare' && (
          <div className="pt-5">
            <ComparePage initialPair={comparePair} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
