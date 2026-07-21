import { useEffect, useState } from 'react';
import { supabase, clientId } from '../lib/supabaseClient';
import { useProjectStore } from '../state/projectStore';

interface ClientTaggedRow {
  client_id?: string | null;
}

// Subscribes to Postgres changes for this project's rows and flags when someone OTHER than
// this browser tab wrote something, without merging the remote change into local state —
// the user has to explicitly click "새로고침" to pull the latest data.
export function useProjectChangeBanner(projectId: string) {
  const [hasRemoteChange, setHasRemoteChange] = useState(false);
  const refetchProject = useProjectStore((s) => s.refetchProject);

  useEffect(() => {
    setHasRemoteChange(false);

    function handleChange(payload: { new: ClientTaggedRow | null; old: ClientTaggedRow | null }) {
      const rowClientId = payload.new?.client_id ?? payload.old?.client_id;
      if (rowClientId === clientId) return;
      setHasRemoteChange(true);
    }

    const channel = supabase
      .channel(`project-changes-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flow_nodes', filter: `project_id=eq.${projectId}` },
        handleChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flow_edges', filter: `project_id=eq.${projectId}` },
        handleChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memos', filter: `project_id=eq.${projectId}` },
        handleChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memo_replies', filter: `project_id=eq.${projectId}` },
        handleChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  async function refresh() {
    await refetchProject(projectId);
    setHasRemoteChange(false);
  }

  return { hasRemoteChange, refresh };
}
