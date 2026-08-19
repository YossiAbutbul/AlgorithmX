import { Boxes, Gauge, GraduationCap, Lightbulb, Play, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionId = 'idea' | 'run' | 'structures' | 'efficiency' | 'pitfalls' | 'practice';

export interface SectionDef {
  id: SectionId;
  label: string;
  step?: number;
  Icon: LucideIcon;
}

/** חמשת החלקים בסדר קבוע, ואחריהם התרגול וההוכחה. */
export const SECTIONS: SectionDef[] = [
  { id: 'idea', label: 'רעיון ומטרה', step: 1, Icon: Lightbulb },
  { id: 'run', label: 'הרצה על גרף', step: 2, Icon: Play },
  { id: 'structures', label: 'מבני נתונים', step: 3, Icon: Boxes },
  { id: 'efficiency', label: 'יעילות', step: 4, Icon: Gauge },
  { id: 'pitfalls', label: 'מלכודות ומסקנות', step: 5, Icon: TriangleAlert },
  { id: 'practice', label: 'תרגול והוכחה', Icon: GraduationCap },
];
