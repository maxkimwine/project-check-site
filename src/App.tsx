import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProjectListScreen } from './components/screens/ProjectListScreen';
import { ProjectFlowScreen } from './components/screens/ProjectFlowScreen';
import { SyncErrorModal } from './components/controls/SyncErrorModal';
import { useProjectStore, undoAndSync, redoAndSync } from './state/projectStore';

function App() {
  const hydrated = useProjectStore((s) => s.hydrated);
  const hydrate = useProjectStore((s) => s.hydrate);
  const syncError = useProjectStore((s) => s.syncError);
  const clearSyncError = useProjectStore((s) => s.clearSyncError);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isEditable =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isEditable) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoAndSync();
        } else {
          undoAndSync();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redoAndSync();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
        불러오는 중...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectListScreen />} />
        <Route path="/project/:projectId" element={<ProjectFlowScreen />} />
      </Routes>
      {syncError && (
        <SyncErrorModal title={syncError.title} detail={syncError.detail} onClose={clearSyncError} />
      )}
    </BrowserRouter>
  );
}

export default App;
