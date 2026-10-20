'use client';
import type { Work } from '@/lib/portfolio';
export function WorkCaption({ work, onChange }: { work: Work; onChange: (patch: Partial<Work>) => void }) {
  return <><input id={`caption-${work.id}`} value={work.title} maxLength={100} onChange={e => onChange({ title: e.target.value })}/><details className="work-description"><summary>Décrire cette réalisation</summary><label htmlFor={`description-${work.id}`}>Qu’avez-vous réalisé ?<textarea id={`description-${work.id}`} rows={3} maxLength={400} value={work.description || ''} onChange={e => onChange({ description: e.target.value })} placeholder="Une technique, une matière, une occasion…"/></label></details></>;
}
