import React from 'react';
import { Slot } from '../Slot';

interface FollowerSheetProps {
  /** Follower's display name. */
  name: string;
  /** Short background blurb. */
  background?: string;
  /** Skill tags. */
  skills?: string[];
  /**
   * Slot definitions for this follower.
   * Each entry needs a unique id scoped to the table, and an optional locked flag.
   */
  slots: Array<{ id: string; locked?: boolean; label?: string }>;
}

/**
 * Example sheet template for a cult follower.
 *
 * This is a *non-normative* template — it documents a recommended visual pattern
 * but is not required by the library.
 *
 * Usage:
 *   <Sheet x={400} y={80} width={400} height={520}>
 *     <FollowerSheet
 *       name="Elara Mourne"
 *       background="Former archivist, drawn to forbidden texts."
 *       skills={['Research', 'Deception']}
 *       slots={[
 *         { id: 'elara-slot-0' },
 *         { id: 'elara-slot-1' },
 *         { id: 'elara-slot-2', locked: true, label: 'Sworn task' },
 *       ]}
 *     />
 *   </Sheet>
 */
export function FollowerSheet({ name, background, skills = [], slots }: FollowerSheetProps) {
  return (
    <div className="h-full w-full flex flex-col p-3 gap-3 text-amber-100">
      {/* Header */}
      <div className="flex flex-col gap-0.5 border-b border-amber-600/20 pb-2">
        <div className="font-serif text-lg font-bold text-amber-300">{name}</div>
        {background && (
          <div className="text-xs text-amber-200/60 leading-snug">{background}</div>
        )}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {skills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-1.5 py-0.5 rounded bg-purple-800/40 text-purple-300"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-2">
        <div className="text-xs text-amber-500/60 uppercase tracking-wider">Assignments</div>
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <Slot
              key={slot.id}
              id={slot.id}
              locked={slot.locked}
              emptyLabel={slot.label ?? 'Drop card here'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
