import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProjectListScreen } from './components/screens/ProjectListScreen';
import { ProjectFlowScreen } from './components/screens/ProjectFlowScreen';

function App() {
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
