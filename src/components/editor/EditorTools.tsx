import { useEffect, useRef, useState } from 'react';
import {
  FileJson,
  MousePointer2,
  PlusCircle,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GraphModel } from '../../algorithms/types';
import { exportGraph, importGraph } from '../../graphs/storage';
import type { GraphDraft, Tool } from './useGraphDraft';

interface Props {
  draft: GraphDraft;
  onSave: () => void;
}

const TOOLS: { id: Tool; label: string; icon: LucideIcon; hint: string }[] = [
  {
    id: 'select',
    label: 'בחירה',
    icon: MousePointer2,
    hint: 'גרירה מזיזה, וגרירה מהנקודה שעל המסגרת מחברת',
  },
  { id: 'connect', label: 'חיבור', icon: Share2, hint: 'לחיצה על שני צמתים מחברת ביניהם' },
  { id: 'add', label: 'הוספה', icon: PlusCircle, hint: 'לחיצה על שטח ריק מוסיפה צומת' },
];

/**
 * The editor's controls, in the bar the transport uses during a run. Same
 * height, same place, so switching to the editor never moves the page.
 */
export function EditorTools({ draft, onSave }: Props) {
  const [ioOpen, setIoOpen] = useState(false);
  const [text, setText] = useState('');
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ioOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setIoOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIoOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ioOpen]);

  return (
    <div className="rail" role="group" aria-label="כלי עריכה">
      <div className="toolgroup">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className="btn btn-sm"
            aria-pressed={draft.tool === t.id}
            title={t.hint}
            onClick={() => draft.setTool(t.id)}
          >
            <t.icon size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <button className="btn btn-sm" disabled={!draft.canUndo} onClick={draft.undo} title="Ctrl+Z">
        <Undo2 size={15} aria-hidden="true" />
        <span className="hidden lg:inline">בטל</span>
      </button>
      <button
        className="btn btn-sm"
        disabled={!draft.canRedo}
        onClick={draft.redo}
        title="Ctrl+Shift+Z"
        aria-label="שחזר"
      >
        <Redo2 size={15} aria-hidden="true" />
      </button>
      <button
        className="btn btn-sm"
        disabled={!draft.selection}
        onClick={draft.deleteSelection}
        title="Delete"
      >
        <Trash2 size={15} aria-hidden="true" />
        <span className="hidden lg:inline">מחק</span>
      </button>

      <span className="flex-1" />

      <div ref={wrap} className="relative flex-none">
        <button
          className="btn btn-sm"
          aria-expanded={ioOpen}
          onClick={() => {
            setText(exportGraph(draft.graph));
            setIoOpen((v) => !v);
          }}
        >
          <FileJson size={15} aria-hidden="true" />
          <span className="hidden sm:inline">JSON</span>
        </button>
        {ioOpen && (
          <div
            className="popover flex flex-col gap-2"
            style={{
              bottom: 'calc(100% + 8px)',
              insetInlineStart: 0,
              width: 'min(420px, 88vw)',
            }}
          >
            <p className="text-(length:--step-1) text-ink-soft">
              העתק את הגרף החוצה, או הדבק גרף ולחץ ייבוא.
            </p>
            <textarea
              className="num h-28 w-full rounded-lg border border-line bg-sunken p-2 text-(length:--step-1)"
              dir="ltr"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="btn btn-sm self-start"
              onClick={() => {
                const g: GraphModel | null = importGraph(text);
                if (!g) {
                  draft.replaceGraph(draft.graph, 'ה-JSON אינו תקין.');
                  return;
                }
                draft.replaceGraph(g, 'הגרף יובא.');
                setIoOpen(false);
              }}
            >
              ייבוא
            </button>
          </div>
        )}
      </div>

      <button className="btn btn-sm" onClick={draft.revert}>
        <RotateCcw size={15} aria-hidden="true" />
        <span className="hidden lg:inline">גרף מוכן</span>
      </button>

      <button className="btn btn-primary" onClick={onSave}>
        <Save size={16} aria-hidden="true" />
        שמור
      </button>
    </div>
  );
}
