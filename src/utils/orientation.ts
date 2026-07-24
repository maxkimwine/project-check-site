import { Position } from '@xyflow/react';
import type { Orientation } from '../types/project';

export type { Orientation };

/** Logical role of a connection point / "+" button, independent of screen position. */
export type Port = 'prev' | 'next' | 'branchA' | 'branchB';

/** Where each logical port actually renders, depending on the flow's orientation. */
export const PORT_POSITION: Record<Orientation, Record<Port, Position>> = {
  vertical: {
    prev: Position.Top,
    next: Position.Bottom,
    branchA: Position.Left,
    branchB: Position.Right,
  },
  horizontal: {
    prev: Position.Left,
    next: Position.Right,
    branchA: Position.Top,
    branchB: Position.Bottom,
  },
};

// Every class string below is written out in full (never assembled from a template) so
// Tailwind's static content scan can find and generate it — a dynamically-interpolated
// class name (e.g. `left-[${offset}]`) would silently produce no CSS.

/** Anchor classes for the two connector Handles (target/source) on a branch port. */
const HANDLE_EDGE_CLASSES: Record<Orientation, Record<'branchA' | 'branchB', { target: string; source: string }>> = {
  vertical: {
    branchA: { target: '!-left-2.5 !top-[25%]', source: '!-left-2.5 !top-1/2' },
    branchB: { target: '!-right-2.5 !top-[25%]', source: '!-right-2.5 !top-1/2' },
  },
  horizontal: {
    branchA: { target: '!-top-2.5 !left-[25%]', source: '!-top-2.5 !left-1/2' },
    branchB: { target: '!-bottom-2.5 !left-[25%]', source: '!-bottom-2.5 !left-1/2' },
  },
};

const MAIN_HANDLE_CLASSES: Record<Orientation, { prev: string; next: string }> = {
  vertical: { prev: '!-top-2.5', next: '!-bottom-2.5' },
  horizontal: { prev: '!-left-2.5', next: '!-right-2.5' },
};

export function handleClasses(orientation: Orientation, port: Port, kind: 'target' | 'source'): string {
  if (port === 'prev' || port === 'next') return MAIN_HANDLE_CLASSES[orientation][port];
  return HANDLE_EDGE_CLASSES[orientation][port][kind];
}

/** Anchor classes for the "+" buttons (no target/source split — one button per port). */
const BUTTON_CLASSES: Record<Orientation, Record<Port, string>> = {
  vertical: {
    prev: '-top-2.5 left-4',
    next: '-bottom-2.5 right-4',
    branchA: '-left-2.5 top-[75%] -translate-y-1/2',
    branchB: '-right-2.5 top-[75%] -translate-y-1/2',
  },
  horizontal: {
    prev: '-left-2.5 top-4',
    next: '-right-2.5 bottom-4',
    branchA: '-top-2.5 left-[75%] -translate-x-1/2',
    branchB: '-bottom-2.5 left-[75%] -translate-x-1/2',
  },
};

export function buttonClasses(orientation: Orientation, port: Port): string {
  return BUTTON_CLASSES[orientation][port];
}
