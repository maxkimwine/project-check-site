import { useEffect, useState } from 'react';
import { supabase, clientId } from '../lib/supabaseClient';

const PRESENCE_CHANNEL = 'presence-projects';

interface PresenceEntry {
  projectId: string;
}

// Marks this browser tab as "currently viewing" a project, for as long as the calling
// component stays mounted. Uses Supabase Realtime Presence (ephemeral, no DB table).
export function useTrackPresence(projectId: string) {
  useEffect(() => {
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: clientId } } });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ projectId } satisfies PresenceEntry);
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);
}

// Returns the set of project ids that currently have someone (anyone, including other
// browser tabs) viewing them, for showing a "편집 중" badge on the project list.
export function useOpenProjectIds(): Set<string> {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: clientId } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceEntry>();
      const ids = new Set<string>();
      for (const key in state) {
        for (const entry of state[key]) {
          ids.add(entry.projectId);
        }
      }
      setOpenIds(ids);
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return openIds;
}
