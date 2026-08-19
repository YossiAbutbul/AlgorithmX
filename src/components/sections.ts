import { Boxes, Gauge, GraduationCap, Lightbulb, Play, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionId = 'idea' | 'run' | 'structures' | 'efficiency' | 'pitfalls' | 'practice';

export interface SectionDef {
  id: SectionId;
  label: string;
  /** Short label for narrow screens */
  short: string;
  step?: number;
  Icon: LucideIcon;
}

/** The five parts in fixed order, followed by practice and proof. */
export const SECTIONS: SectionDef[] = [
  { id: 'idea', label: 'רעיון ומטרה', short: 'רעיון', step: 1, Icon: Lightbulb },
  { id: 'run', label: 'הרצה על גרף', short: 'הרצה', step: 2, Icon: Play },
  { id: 'structures', label: 'מבני נתונים', short: 'מבנים', step: 3, Icon: Boxes },
  { id: 'efficiency', label: 'יעילות', short: 'יעילות', step: 4, Icon: Gauge },
  { id: 'pitfalls', label: 'מלכודות ומסקנות', short: 'מלכודות', step: 5, Icon: TriangleAlert },
  { id: 'practice', label: 'תרגול והוכחה', short: 'תרגול', Icon: GraduationCap },
];
