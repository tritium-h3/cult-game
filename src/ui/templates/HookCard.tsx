import React from 'react';

export type HookType = 'person' | 'gathering' | 'institution' | 'site' | 'text';

const HOOK_LABELS: Record<HookType, string> = {
  person:      'Person',
  gathering:   'Gathering',
  institution: 'Institution',
  site:        'Site',
  text:        'Text',
};

interface HookCardProps {
  type: HookType;
  title: string;
  description?: string;
  /** When provided, a discard button appears on hover. Call this to remove the card. */
  onDiscard?: () => void;
}

/**
 * Example card template for hook items in the cult game.
 *
 * This is a *non-normative* template — it documents a recommended visual pattern
 * but library consumers are free to use any children inside <Card>.
 *
 * Usage:
 *   <Card id="book-1">
 *     <HookCard type="book" title="Necronomicon" description="A tome of forbidden lore." />
 *   </Card>
 */
export function HookCard({ type, title, description, onDiscard }: HookCardProps) {
  return (
    <div
      className="ui-hook-card h-full w-full flex flex-col rounded overflow-hidden border group"
      data-type={type}
    >
      {/* Type badge */}
      <div className="ui-hook-badge px-2 py-1 text-xs font-semibold rounded-t flex items-center justify-between">
        <span>{HOOK_LABELS[type]}</span>
        {onDiscard && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDiscard}
            className="opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity w-4 h-4 flex items-center justify-center leading-none hover:text-white"
            aria-label="Discard card"
          >
            ×
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-2 py-2 flex flex-col gap-1 overflow-hidden">
        <div className="ui-hook-title font-serif text-sm font-bold leading-tight">
          {title}
        </div>
        {description && (
          <div className="ui-hook-body text-xs leading-snug line-clamp-4">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
