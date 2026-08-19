import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GitCompareArrows, Table2 } from 'lucide-react';
import { ALGORITHMS } from './algorithms';
import { Brand } from './components/Brand';
import { Footer } from './components/Footer';
import { ScrollOverlay } from './components/ScrollOverlay';
import { SECTIONS, type SectionId } from './components/sections';
import { AlgorithmPage } from './pages/AlgorithmPage';
import { ComparisonTablePage } from './pages/ComparisonTablePage';
import { ComparePage } from './pages/ComparePage';
import { loadLastTab, saveLastTab } from './graphs/storage';

const EXTRA_TABS = [
  { id: 'table', label: 'הכל במקום אחד', Icon: Table2 },
  { id: 'compare', label: 'השוואה זו לצד זו', Icon: GitCompareArrows },
];

const ALL_IDS = [...ALGORITHMS.map((a) => a.id), ...EXTRA_TABS.map((t) => t.id)];

export function App() {
  const [tab, setTab] = useState<string>(() => {
    const saved = loadLastTab();
    return saved && ALL_IDS.includes(saved) ? saved : ALGORITHMS[0].id;
  });
  const [section, setSection] = useState<SectionId>('idea');
  const [comparePair, setComparePair] = useState<string | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false });
  const mainRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const subBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveLastTab(tab);
  }, [tab]);

  /**
   * גבהי שתי הכותרות הדביקות נמדדים בפועל: הפס העליון נדבק לכותרת בלי רווח,
   * והגלילה יודעת כמה מקום הן תופסות כדי לא להסתיר תוכן מתחתן.
   */
  useLayoutEffect(() => {
    const measureBar = (el: HTMLElement | null, name: string) => {
      if (!el) return undefined;
      // בלי עיגול: גובה שבור מייצר תפר של פיקסל בין שתי הכותרות
      const apply = () =>
        document.documentElement.style.setProperty(
          name,
          `${el.getBoundingClientRect().height.toFixed(2)}px`,
        );
      apply();
      if (typeof ResizeObserver === 'undefined') return undefined;
      const ro = new ResizeObserver(apply);
      ro.observe(el);
      return ro;
    };
    const roHeader = measureBar(headerRef.current, '--header-h');
    // בטאבים שאין בהם פס חלקים, הגובה מתאפס כדי שהתוכן לא יקבל ריווח מיותר
    if (!subBarRef.current) document.documentElement.style.setProperty('--subbar-h', '0px');
    const roSub = measureBar(subBarRef.current, '--subbar-h');
    return () => {
      roHeader?.disconnect();
      roSub?.disconnect();
    };
  }, [tab]);

  /** גובה שתי הכותרות יחד, בפיקסלים. */
  const stickyOffset = useCallback(() => {
    const read = (name: string) =>
      parseInt(getComputedStyle(document.documentElement).getPropertyValue(name), 10) || 0;
    return read('--header-h') + read('--subbar-h');
  }, []);

  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth + 2);
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    if (active) setPill({ x: active.offsetLeft, w: active.offsetWidth, ready: true });
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    measure();
  }, [tab, measure]);

  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  useEffect(() => {
    document.fonts?.ready.then(measure).catch(() => undefined);
  }, [measure]);

  useEffect(() => {
    subRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [section]);

  const measureIndicator = useCallback(() => {
    const el = subRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el) return;
    setIndicator({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
  }, []);

  useLayoutEffect(() => {
    measureIndicator();
  }, [section, tab, measureIndicator]);

  useLayoutEffect(() => {
    const bar = subRef.current;
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measureIndicator);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [measureIndicator, tab]);

  useEffect(() => {
    document.fonts?.ready.then(measureIndicator).catch(() => undefined);
  }, [measureIndicator]);

  function go(id: string) {
    setTab(id);
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }

  function move(delta: number) {
    const i = ALL_IDS.indexOf(tab);
    go(ALL_IDS[Math.max(0, Math.min(ALL_IDS.length - 1, i + delta))]);
  }

  /** מעבר בין חלקים מיישר את ראש הפאנל מתחת לכותרות, כדי שלא ייחתך מאחוריהן. */
  function selectSection(id: SectionId) {
    setSection(id);
    requestAnimationFrame(() => {
      const el = mainRef.current;
      if (!el) return;
      const target = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - 8;
      if (window.scrollY > target) window.scrollTo({ top: Math.max(0, target) });
    });
  }

  function moveSection(delta: number) {
    const i = SECTIONS.findIndex((s) => s.id === section);
    selectSection(SECTIONS[Math.max(0, Math.min(SECTIONS.length - 1, i + delta))].id);
  }

  const current = ALGORITHMS.find((a) => a.id === tab);

  const navTab = (id: string, label: string, Icon: typeof Table2 | null) => {
    const active = tab === id;
    return (
      <button
        key={id}
        role="tab"
        id={`tab-${id}`}
        aria-selected={active}
        aria-controls="main"
        tabIndex={active ? 0 : -1}
        className="nav-tab"
        data-active={active}
        onClick={() => go(id)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') move(1);
          if (e.key === 'ArrowRight') move(-1);
        }}
      >
        {Icon && <Icon size={15} aria-hidden="true" />}
        {label}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only">
        דלג לתוכן
      </a>

      <ScrollOverlay />

      <header ref={headerRef} className="app-header">
        <div className="flex items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="order-2 flex h-[56px] shrink-0 items-center sm:h-[68px]">
            <Brand onClick={() => go(ALGORITHMS[0].id)} />
          </div>

          <nav
            className="order-1 flex h-[56px] min-w-0 flex-1 items-center sm:h-[68px]"
            aria-label="ניווט בין אלגוריתמים"
          >
            <div
              ref={stripRef}
              role="tablist"
              aria-label="אלגוריתמים"
              className="no-scrollbar nav-track"
              style={
                overflowing
                  ? {
                      maskImage:
                        'linear-gradient(to left, #000 calc(100% - 28px), transparent)',
                      WebkitMaskImage:
                        'linear-gradient(to left, #000 calc(100% - 28px), transparent)',
                    }
                  : undefined
              }
            >
              <span
                className="nav-pill"
                aria-hidden="true"
                style={{
                  transform: `translateX(${pill.x}px)`,
                  width: pill.w,
                  opacity: pill.ready ? 1 : 0,
                }}
              />
              {ALGORITHMS.map((a) => navTab(a.id, a.shortHe, null))}
              <span className="nav-divider" aria-hidden="true" />
              {EXTRA_TABS.map((t) => navTab(t.id, t.label, t.Icon))}
            </div>
          </nav>
        </div>
      </header>

      {current && (
        <div ref={subBarRef} className="subtab-bar">
          <div
            ref={subRef}
            role="tablist"
            aria-label="חלקי הטאב"
            className="no-scrollbar relative flex items-stretch gap-0 px-2 sm:px-3 lg:px-5"
          >
            <span
              className="subtab-indicator"
              aria-hidden="true"
              style={{
                transform: `translateX(${indicator.x + 11}px)`,
                width: Math.max(0, indicator.w - 22),
                opacity: indicator.ready ? 1 : 0,
              }}
            />
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                role="tab"
                id={`sub-${s.id}`}
                aria-selected={section === s.id}
                aria-controls={`panel-${s.id}`}
                tabIndex={section === s.id ? 0 : -1}
                className="subtab"
                onClick={() => selectSection(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') moveSection(1);
                  if (e.key === 'ArrowRight') moveSection(-1);
                }}
              >
                <span className="subtab-index" aria-hidden="true">
                  {s.step ?? <s.Icon size={13} />}
                </span>
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="mx-auto w-full max-w-[1500px] flex-1 px-3 pb-6 sm:px-4 lg:px-6"
        style={{ paddingTop: 'calc(var(--header-h) + var(--subbar-h))' }}
      >
        {current && (
          <AlgorithmPage
            module={current}
            all={ALGORITHMS}
            section={section}
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
