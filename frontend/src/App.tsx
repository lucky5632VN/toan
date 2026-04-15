import Header from './components/ui/Header';
import ControlPanel from './components/ui/ControlPanel';
import CrossSectionPanel from './components/ui/CrossSectionPanel';
import Scene from './components/canvas/Scene';
import CoordDisplay from './components/ui/CoordDisplay';
import PropertiesPanel from './components/ui/PropertiesPanel';
import HandGestureOverlay from './components/gesture/HandGestureOverlay';
import AITutorPanel from './components/ui/AITutorPanel';
import GeometryGenerator from './components/ui/GeometryGenerator';
import { useGeometryAPI } from './hooks/useGeometryAPI';
import { useGeometryStore } from './store/useGeometryStore';
import { useState } from 'react';
import { Wand2 } from 'lucide-react';

function App() {
  useGeometryAPI();
  const { isLoading, error } = useGeometryStore();
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <>
      <Header />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ControlPanel />
        </div>

        {/* 3D Viewport */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {isLoading && (
            <div style={{ 
              position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, background: 'rgba(35, 134, 54, 0.9)', color: 'white',
              padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              Đang tính toán mô hình...
            </div>
          )}

          {error && (
            <div style={{ 
              position: 'absolute', top: '4rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, background: 'rgba(248, 81, 73, 0.9)', color: 'white',
              padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem'
            }}>
              {error}
            </div>
          )}

          <Scene />

          {/* AI Geometry Generator button */}
          <button
            onClick={() => setShowGenerator(true)}
            style={{
              position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, background: 'linear-gradient(135deg, #1f6feb, #a371f7)',
              color: 'white', border: 'none', borderRadius: '20px',
              padding: '0.45rem 1.1rem', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              boxShadow: '0 4px 16px rgba(31,111,235,0.4)',
            }}
          >
            <Wand2 size={15} /> Vẽ Hình từ Đề Bài
          </button>
        </div>

        {/* AI Geometry Generator Modal */}
        {showGenerator && <GeometryGenerator onClose={() => setShowGenerator(false)} />}

        {/* AI Gesture Tracking Overlay */}
        <HandGestureOverlay />

        {/* AI Tutor Chat Overlay */}
        <AITutorPanel />

        {/* Right Sidebar */}
        <div className="sidebar sidebar-right glass" style={{ width: '320px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <CrossSectionPanel />
          <PropertiesPanel />
          <CoordDisplay />
        </div>
      </main>
    </>
  );
}

export default App;
