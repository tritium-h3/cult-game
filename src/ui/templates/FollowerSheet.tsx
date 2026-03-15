import React from 'react';
import { Slot } from '../Slot';
import { useTable } from '../context';

interface FollowerSheetProps {
  /** Follower's display name. */
  name: string;
  /** Short background blurb. */
  background?: string;
  /** Skill tags. */
  skills?: string[];
  /**
   * Slot definitions for this follower.
   * dx/dy are grid-unit offsets from the containing Sheet's origin.
   */
  slots: Array<{ id: string; dx: number; dy: number; locked?: boolean; label?: string }>;
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
  const { config } = useTable();
  const { gridSize } = config;

  // Reserve the info section height up to the topmost slot row.
  const minSlotDy = slots.length > 0 ? Math.min(...slots.map(s => s.dy)) : 2;
  const infoHeightPx = minSlotDy * gridSize;

  return (
    // position: relative so absolutely-positioned Slots are contained here.
    <div className="relative h-full w-full">
      {/* Info section — height matches the space above the first slot row */}
      <div
        style={{ height: infoHeightPx, overflow: 'hidden' }}
        className="flex flex-col justify-center px-3 gap-1 border-b ui-follower-divider"
      >
        <div className="ui-follower-name font-serif text-base font-bold leading-tight">{name}</div>
        {background && (
          <div className="ui-follower-bg text-xs leading-snug">{background}</div>
        )}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="ui-skill-tag text-xs px-1.5 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Slots — absolutely positioned at their grid-aligned offsets */}
      {slots.map((slot) => (
        <Slot
          key={slot.id}
          id={slot.id}
          dx={slot.dx}
          dy={slot.dy}
          locked={slot.locked}
          emptyLabel={slot.label ?? 'Drop card here'}
        />
      ))}
    </div>
  );
}
