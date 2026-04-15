import React, { useState } from 'react';
import { Database, X, Check, BoxSelect, Maximize, Plus, Trash2 } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';

interface VertexInfo {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
}
interface FaceInfo {
  id: string;
  labels: string;
}

export const CustomShapeBuilder: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [vertices, setVertices] = useState<VertexInfo[]>([
    { id: 'v1', label: 'A', x: 0, y: 0, z: 0 },
    { id: 'v2', label: 'B', x: 4, y: 0, z: 0 },
    { id: 'v3', label: 'C', x: 4, y: 4, z: 0 },
    { id: 'v4', label: 'D', x: 0, y: 4, z: 0 },
    { id: 'v5', label: 'S', x: 2, y: 2, z: 5 },
  ]);
  const [faces, setFaces] = useState<FaceInfo[]>([
    { id: 'f1', labels: 'A, B, C, D' },
    { id: 'f2', labels: 'A, B, S' },
    { id: 'f3', labels: 'B, C, S' },
    { id: 'f4', labels: 'C, D, S' },
    { id: 'f5', labels: 'D, A, S' },
  ]);
  const [err, setErr] = useState<string | null>(null);
  const { setSelectedShape, setShapeData } = useGeometryStore();

  const handleApply = () => {
    try {
      if (vertices.length < 3) throw new Error("Cần ít nhất 3 đỉnh để tạo thành một khối.");
      if (faces.length < 1) throw new Error("Cần định nghĩa ít nhất 1 mặt.");

      // 1. Build map of label -> index
      const labelToIndex: Record<string, number> = {};
      const outVertices: number[][] = [];
      const outLabels: string[] = [];

      vertices.forEach((v, idx) => {
        const lbl = v.label.trim();
        if (!lbl) throw new Error(`Đỉnh số ${idx + 1} đang bị bỏ trống tên.`);
        if (labelToIndex[lbl] !== undefined) throw new Error(`Trùng tên đỉnh: ${lbl}`);
        
        labelToIndex[lbl] = idx;
        outLabels.push(lbl);
        outVertices.push([v.x, v.y, v.z]);
      });

      // 2. Parse faces
      const outFaces: number[][] = [];
      faces.forEach((f, idx) => {
        const parts = f.labels.split(',').map(s => s.trim()).filter(s => s);
        if (parts.length < 3) throw new Error(`Mặt thứ ${idx + 1} ("${f.labels}") phải có ít nhất 3 đỉnh.`);
        const faceIndices = parts.map(p => {
          if (labelToIndex[p] === undefined) throw new Error(`Mặt thứ ${idx+1} có chứa đỉnh "${p}" nhưng đỉnh này chưa được khai báo ở trên.`);
          return labelToIndex[p];
        });
        outFaces.push(faceIndices);
      });

      // 3. Auto-generate edges from faces
      const outEdges: number[][] = [];
      const edgeSet = new Set<string>();

      outFaces.forEach(face => {
        for (let i = 0; i < face.length; i++) {
          const v1 = face[i];
          const v2 = face[(i + 1) % face.length];
          const min = Math.min(v1, v2);
          const max = Math.max(v1, v2);
          const key = `${min}-${max}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            outEdges.push([min, max]);
          }
        }
      });

      // Update State
      setSelectedShape('custom');
      setShapeData({
        vertices: outVertices,
        edges: outEdges,
        faces: outFaces,
        vertex_labels: outLabels,
        properties: { custom: true, total_vertices: outVertices.length, total_faces: outFaces.length },
        shape_type: 'custom'
      });
      setErr(null);
      onClose();
    } catch (e: any) {
      setErr(e.message || "Lỗi tham số cấu trúc.");
    }
  };

  const inputStyle = {
    background: 'rgba(0,0,0,0.3)', color: '#f0f6fc', border: '1px solid #30363d',
    borderRadius: '4px', padding: '0.35rem 0.6rem', fontSize: '0.82rem', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const
  };

  const handleNextChar = () => {
    if (vertices.length === 0) return 'A';
    const lastLabel = vertices[vertices.length - 1].label;
    if (!lastLabel || lastLabel.length !== 1) return `V${vertices.length + 1}`;
    const nextCode = lastLabel.charCodeAt(0) + 1;
    // Bỏ qua các ký tự đặc biệt hoặc lố Z
    if (nextCode > 90) return `V${vertices.length + 1}`;
    return String.fromCharCode(nextCode);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }}>
      <div className="glass" style={{
        width: 580, height: '84vh', padding: '1.5rem', borderRadius: '14px',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        border: '1px solid rgba(88,166,255,0.2)', boxShadow: '0 16px 56px rgba(0,0,0,0.6)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f0f6fc' }}>
            <Database size={18} color="#58a6ff" /> Giao Diện Thiết Kế Khối 3D
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ fontSize: '0.82rem', color: '#8b949e', flexShrink: 0 }}>
          Hệ thống sẽ tự động bắt cặp các điểm đa giác và nội suy ra danh sách Cạnh. Bạn chỉ cần lên toạ độ các Đỉnh và nối các bề Mặt!
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
          
          {/* Vertices */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Maximize size={15} color="#388bfd" /> 1. Toạ Độ Đỉnh (Vertices)
              </div>
              <button onClick={() => setVertices([...vertices, { id: crypto.randomUUID(), label: handleNextChar(), x: 0, y: 0, z: 0 }])}
                style={{ background: 'rgba(56,139,253,0.15)', color: '#58a6ff', border: '1px solid rgba(56,139,253,0.4)', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Plus size={12} /> Thêm Đỉnh
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 30px', gap: '0.5rem', fontSize: '0.75rem', color: '#8b949e', paddingLeft: 4 }}>
                <div>Tên</div><div>Trục X</div><div>Trục Y</div><div>Trục Z</div><div></div>
              </div>
              {vertices.map((v, i) => (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 30px', gap: '0.5rem', alignItems: 'center' }}>
                  <input style={inputStyle} value={v.label} placeholder="A" onChange={(e) => {
                    const newV = [...vertices]; newV[i].label = e.target.value.toUpperCase(); setVertices(newV);
                  }} />
                  <input style={inputStyle} type="number" step="0.5" value={v.x} onChange={(e) => {
                    const newV = [...vertices]; newV[i].x = parseFloat(e.target.value) || 0; setVertices(newV);
                  }} />
                  <input style={inputStyle} type="number" step="0.5" value={v.y} onChange={(e) => {
                    const newV = [...vertices]; newV[i].y = parseFloat(e.target.value) || 0; setVertices(newV);
                  }} />
                  <input style={inputStyle} type="number" step="0.5" value={v.z} onChange={(e) => {
                    const newV = [...vertices]; newV[i].z = parseFloat(e.target.value) || 0; setVertices(newV);
                  }} />
                  <button onClick={() => setVertices(vertices.filter(item => item.id !== v.id))} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Faces */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BoxSelect size={15} color="#a371f7" /> 2. Khai Báo Mặt (Faces)
              </div>
              <button onClick={() => setFaces([...faces, { id: crypto.randomUUID(), labels: '' }])}
                style={{ background: 'rgba(163,113,247,0.15)', color: '#d2a8ff', border: '1px solid rgba(163,113,247,0.4)', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Plus size={12} /> Thêm Mặt
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', paddingLeft: 4, marginBottom: 2 }}>
                Nhập tên các đỉnh gộp thành mặt (ngăn cách bằng dấu phẩy). VD: <span style={{ color: '#d2a8ff' }}>A, B, C, D</span>
              </div>
              {faces.map((f, i) => (
                <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 30px', gap: '0.6rem', alignItems: 'center' }}>
                  <input style={inputStyle} value={f.labels} placeholder="A, B, C" onChange={(e) => {
                    const newF = [...faces]; newF[i].labels = e.target.value.toUpperCase(); setFaces(newF);
                  }} />
                  <button onClick={() => setFaces(faces.filter(item => item.id !== f.id))} style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, marginTop: '0.5rem' }}>
          {err && <div style={{ color: '#f85149', fontSize: '0.8rem', background: 'rgba(248,81,73,0.1)', padding: '0.6rem', borderRadius: '6px', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ⚠️ {err}
          </div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
            <button onClick={onClose} style={{
              padding: '0.6rem 1rem', background: 'transparent', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
            }}>Huỷ bỏ</button>
            <button onClick={handleApply} style={{
              padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #1f6feb, #388bfd)', color: '#ffffff', fontWeight: 600,
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(31,111,235,0.3)'
            }}><Check size={16} /> Render Khối 3D</button>
          </div>
        </div>

      </div>
    </div>
  );
};
