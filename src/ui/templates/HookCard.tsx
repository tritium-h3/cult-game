import React from 'react';

export type HookItemType = 'site' | 'book' | 'patron' | 'artifact';

const HOOK_LABELS: Record<HookItemType, string> = {
  site: 'Site',
  book: 'Book',
  patron: 'Patron',
  artifact: 'Artifact',
};

interface HookCardProps {
  type: HookItemType;
  title: string;
  description?: string;
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
export function HookCard({ type, title, description }: HookCardProps) {
  return (
    <div
      className="ui-hook-card h-full w-full flex flex-col rounded overflow-hidden border"
      data-type={type}
    >
      {/* Type badge */}
      <div className="ui-hook-badge px-2 py-1 text-xs font-semibold rounded-t">
        {HOOK_LABELS[type]}
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
