import React from 'react';

export type KnowledgeItemType = 'site' | 'book' | 'patron' | 'artifact';

const TYPE_CONFIG: Record<
  KnowledgeItemType,
  { label: string; badgeClass: string; titleClass: string; borderClass: string }
> = {
  site: {
    label: 'Site',
    badgeClass: 'bg-amber-800/40 text-amber-300',
    titleClass: 'text-amber-300',
    borderClass: 'border-amber-500/40',
  },
  book: {
    label: 'Book',
    badgeClass: 'bg-violet-800/40 text-violet-300',
    titleClass: 'text-violet-300',
    borderClass: 'border-violet-500/40',
  },
  patron: {
    label: 'Patron',
    badgeClass: 'bg-teal-800/40 text-teal-300',
    titleClass: 'text-teal-300',
    borderClass: 'border-teal-500/40',
  },
  artifact: {
    label: 'Artifact',
    badgeClass: 'bg-rose-800/40 text-rose-300',
    titleClass: 'text-rose-300',
    borderClass: 'border-rose-500/40',
  },
};

interface KnowledgeCardProps {
  type: KnowledgeItemType;
  title: string;
  description?: string;
}

/**
 * Example card template for knowledge items in the cult game.
 *
 * This is a *non-normative* template — it documents a recommended visual pattern
 * but library consumers are free to use any children inside <Card>.
 *
 * Usage:
 *   <Card id="book-1">
 *     <KnowledgeCard type="book" title="Necronomicon" description="A tome of forbidden lore." />
 *   </Card>
 */
export function KnowledgeCard({ type, title, description }: KnowledgeCardProps) {
  const cfg = TYPE_CONFIG[type];

  return (
    <div
      className={`h-full w-full flex flex-col rounded overflow-hidden border ${cfg.borderClass} bg-purple-900/30 hover:bg-purple-900/50 transition-colors`}
    >
      {/* Type badge header */}
      <div className={`px-2 py-1 text-xs font-semibold rounded-t ${cfg.badgeClass}`}>
        {cfg.label}
      </div>

      {/* Body */}
      <div className="flex-1 px-2 py-2 flex flex-col gap-1 overflow-hidden">
        <div className={`font-serif text-sm font-bold leading-tight ${cfg.titleClass}`}>
          {title}
        </div>
        {description && (
          <div className="text-xs text-amber-200/60 leading-snug line-clamp-4">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
