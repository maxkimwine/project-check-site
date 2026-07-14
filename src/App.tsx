import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProjectListScreen } from './components/screens/ProjectListScreen';
import { ProjectFlowScreen } from './components/screens/ProjectFlowScreen';
import { useProjectStore } from './state/projectStore';

function App() {
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
          useProjectStore.temporal.getState().redo();
        } else {
          useProjectStore.temporal.getState().undo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        useProjectStore.temporal.getState().redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectListScreen />} />
        <Route path="/project/:projectId" element={<ProjectFlowScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
