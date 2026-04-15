import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  Wand2, Upload, Loader2, X, ImagePlus, FileText,
  AlertCircle, Maximize2, RefreshCw, Eye
} from 'lucide-react';
import api from '../../api/axios';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeometryData {
  vertices: number[][];
  faces: number[][];
  visible_edges: number[][];
  hidden_edges: number[][];
  vertex_labels: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

// API URL is now handled by centralized axios config

// ─── Three.js Renderer Hook ──────────────────────────────────────────────────

function useThreeRenderer(
  mountRef: React.RefObject<HTMLDivElement | null>,
  data: GeometryData | null
) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cssRendererRef = useRef<CSS2DRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number>(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const { clientWidth: W, clientHeight: H } = mount;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.set(8, -12, 9);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // CSS2D Renderer for labels
    const cssRenderer = new CSS2DRenderer();
    cssRenderer.setSize(W, H);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(cssRenderer.domElement);
    cssRendererRef.current = cssRenderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, -10, 15);
    scene.add(dirLight);

    // Grid helper – lớn hơn, rõ hơn để dễ định hướng không gian
    const grid = new THREE.GridHelper(20, 20, '#2d333b', '#21262d');
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // Trục toạ độ: X (màu đỏ), Y (đỏ lơn), Z (xanh dương)
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    // Animate
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      cssRenderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(cssRenderer.domElement)) mount.removeChild(cssRenderer.domElement);
    };
  }, []); // eslint-disable-line

  // Render geometry data với Dynamic Occlusion (nét đứt/liền tự động theo góc nhìn camera)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Dọn dẹp: chỉ xóa direct children có isGeometry (Group chứa toàn bộ geometry)
    const toRemove = scene.children.filter(obj => obj.userData.isGeometry);
    toRemove.forEach(obj => scene.remove(obj));

    if (!data || data.vertices.length < 2) return;

    // Toạ độ gốc — giữ nguyên để debug dễ hơn và khớp với số liệu đề bài
    const verts = data.vertices.map(([x, y, z]) => new THREE.Vector3(x, y, z));

    // Tạo Group container — toàn bộ geometry được add vào đây
    const geoGroup = new THREE.Group();
    geoGroup.userData.isGeometry = true;
    scene.add(geoGroup);

    // Tính Bounding Box để biết đỉnh thấp nhất (hệ Z-up: "thấp" = minZ)
    const boundingBox = new THREE.Box3().setFromPoints(verts);
    // Đặt group.position.z = -minZ → đỉnh thấp nhất chạm đúng mặt lưới (z = 0)
    geoGroup.position.z = -boundingBox.min.z;

    // ── Bước 1: Gộp tất cả cạnh thành 1 BufferGeometry duy nhất ─────────────
    // Không phân biệt visible/hidden nữa — GPU Depth Test sẽ tự xử lý
    const allEdges = [...(data.visible_edges ?? []), ...(data.hidden_edges ?? [])];

    const edgePositions: number[] = [];
    allEdges.forEach(([a, b]) => {
      if (a >= verts.length || b >= verts.length) return;
      edgePositions.push(verts[a].x, verts[a].y, verts[a].z);
      edgePositions.push(verts[b].x, verts[b].y, verts[b].z);
    });

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(edgePositions, 3)
    );

    // ── PASS 0: Mesh bề mặt — Ghi vào Depth Buffer ────────────────────────
    // Đây là "khối chắn ảo". depthWrite: true là BẮT BUỘC để GPU biết
    // đâu là vùng bị mặt khối che khuất cho 2 pass tiếp theo.
    if (data.faces.length > 0) {
      const facePositions: number[] = [];
      data.faces.forEach((face) => {
        for (let i = 1; i < face.length - 1; i++) {
          [face[0], face[i], face[i + 1]].forEach((idx) => {
            facePositions.push(verts[idx].x, verts[idx].y, verts[idx].z);
          });
        }
      });

      const faceGeo = new THREE.BufferGeometry();
      faceGeo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(facePositions, 3)
      );
      faceGeo.computeVertexNormals();

      const occluderMesh = new THREE.Mesh(
        faceGeo,
        new THREE.MeshBasicMaterial({
          color: '#1f6feb',
          transparent: true,        // Cùng Transparent bucket với Lines → renderOrder hoạt động đúng
          opacity: 0.15,
          side: THREE.DoubleSide,   // Hiển thị cả mặt trong khi xoay 360°
          depthWrite: true,         // BẮT BUỘC: ghi khoảng cách vào Depth Buffer
          polygonOffset: true,      // Chống Z-Fighting: đẩy mesh lùi ra xa camera
          polygonOffsetFactor: 1,   // một chút so với các cạnh có cùng tọa độ
          polygonOffsetUnits: 1,    // → cạnh luôn thắng khi depth value bằng nhau
        })
      );
      occluderMesh.renderOrder = 0;
      occluderMesh.userData.isGeometry = true;
      geoGroup.add(occluderMesh);
    }

    // ── PASS 1: Nét đứt — Lớp nền (bị che bởi Mesh) ───────────────────────
    // depthFunc: GreaterDepth → chỉ render những pixel CÓ khoảng cách lớn hơn
    // giá trị Depth Buffer (tức là nằm "phía sau" mặt khối) → hiển thị nét đứt
    const dashedMat = new THREE.LineDashedMaterial({
      color: '#8b949e',
      dashSize: 0.15,
      gapSize: 0.10,
      depthFunc: THREE.GreaterDepth,   // Chỉ vẽ khi cạnh BỊ mặt khối che khuất
      depthWrite: false,
      transparent: true,
      opacity: 0.75,
    });
    const dashedLines = new THREE.LineSegments(edgeGeo.clone(), dashedMat);
    // BẮT BUỘC: computeLineDistances() để nét đứt tính được độ dài đoạn
    dashedLines.computeLineDistances();
    dashedLines.renderOrder = 1;
    dashedLines.userData.isGeometry = true;
    geoGroup.add(dashedLines);

    // ── PASS 2: Nét liền — Lớp trên (không bị che) ────────────────────────
    // depthFunc: LessEqualDepth → chỉ render những pixel CÓ khoảng cách nhỏ hơn
    // hoặc bằng Depth Buffer (tức là nằm "phía trước" hoặc trên mặt khối) → nét liền
    const solidMat = new THREE.LineBasicMaterial({
      color: '#e6edf3',
      depthFunc: THREE.LessEqualDepth, // Chỉ vẽ khi cạnh KHÔNG bị che khuất
      depthWrite: false,
      transparent: true,               // BẮT BUỘC: đưa vào Transparent bucket cùng Mesh
      opacity: 1.0,                    // Nét liền vẫn đậm 100%
    });
    const solidLines = new THREE.LineSegments(edgeGeo, solidMat);
    solidLines.renderOrder = 2;
    solidLines.userData.isGeometry = true;
    geoGroup.add(solidLines);

    // ── Vertex spheres + CSS2D labels ──────────────────────────────────────
    verts.forEach((v, idx) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: '#58a6ff' })
      );
      sphere.position.copy(v);
      sphere.userData.isGeometry = true;
      geoGroup.add(sphere);

      const label = data.vertex_labels[idx];
      if (label) {
        const div = document.createElement('div');
        div.textContent = label;
        div.style.cssText = `
          color: #ffffff; font-size: 14px; font-weight: 700;
          font-family: 'Inter', sans-serif; pointer-events: none;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9);
          background: rgba(31,111,235,0.7); padding: 1px 6px;
          border-radius: 4px; border: 1px solid rgba(88,166,255,0.5);
        `;
        const cssObj = new CSS2DObject(div);
        cssObj.position.set(v.x + 0.15, v.y + 0.15, v.z + 0.25);
        cssObj.userData.isGeometry = true;
        geoGroup.add(cssObj);
      }
    });

    // ── Auto-fit camera ───────────────────────────────────────────────────
    const box = new THREE.Box3().setFromPoints(verts);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.copy(center);
      const cam = cameraRef.current;
      cam.position.set(
        center.x + size * 0.8,
        center.y - size * 1.2,
        center.z + size * 0.8
      );
      cam.updateProjectionMatrix();
      controlsRef.current.update();
    }
  }, [data]);
}


// ─── Main Component ──────────────────────────────────────────────────────────

const GeometryGenerator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<GeometryData | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useThreeRenderer(mountRef, geoData);

  const handleImageChange = (file: File | null) => {
    if (!file) { setImageFile(null); setImagePreview(null); return; }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleGenerate = useCallback(async () => {
    if (!text.trim() && !imageFile) {
      setError('Vui lòng nhập đề bài hoặc tải lên ảnh đề bài.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeoData(null);

    const formData = new FormData();
    formData.append('text', text.trim());
    if (imageFile) formData.append('file', imageFile);

    try {
      const response = await api.post('/api/v1/geometry/generate', formData);
      setGeoData(response.data);
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message;
      setError(
        e.code === 'ERR_NETWORK'
          ? '⚠️ Không thể kết nối Backend (Cổng 8000). Kiểm tra server FastAPI.'
          : `Lỗi: ${errorMsg}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, imageFile]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        width: '92vw', maxWidth: 1100, height: '90vh',
        background: 'rgba(13,17,23,0.97)',
        border: '1px solid rgba(88,166,255,0.2)',
        borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        display: 'grid', gridTemplateColumns: '360px 1fr',
        overflow: 'hidden',
      }}>

        {/* ── Left: Input Panel ─────────────────────────────────────── */}
        <div style={{
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.2rem 1.4rem', borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(31,111,235,0.12), rgba(163,113,247,0.08))',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg,#1f6feb,#a371f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wand2 size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#f0f6fc', fontSize: '0.95rem' }}>
                  AI Vẽ Hình 3D
                </div>
                <div style={{ fontSize: '0.65rem', color: '#a371f7' }}>
                  Nhập đề bài · Upload ảnh · Gemini sinh hình
                </div>
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0f6fc')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8b949e')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Textarea */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <FileText size={14} color="#588bfd" /> Nhập đề bài
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={
                  'Ví dụ:\n"Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 4cm, SA vuông góc với mặt đáy và SA = 5cm. Vẽ hình."'
                }
                rows={7}
                style={{
                  width: '100%', resize: 'none',
                  background: 'rgba(0,0,0,0.35)', color: '#e6edf3',
                  border: '1px solid #30363d', borderRadius: 10,
                  padding: '0.75rem', fontSize: '0.84rem', lineHeight: 1.6,
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#388bfd')}
                onBlur={e => (e.target.style.borderColor = '#30363d')}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <ImagePlus size={14} color="#a371f7" /> Hoặc upload ảnh đề bài
              </label>

              {imagePreview ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(163,113,247,0.4)' }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block', background: '#000' }} />
                  <button
                    onClick={() => handleImageChange(null)}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,0.7)', border: 'none', color: '#f85149',
                      borderRadius: '50%', width: 26, height: 26, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                  <div style={{ padding: '0.4rem 0.7rem', fontSize: '0.72rem', color: '#8b949e' }}>
                    {imageFile?.name}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleImageChange(f); }}
                  style={{
                    border: '1.5px dashed rgba(163,113,247,0.5)', borderRadius: 10,
                    padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                    color: '#8b949e', fontSize: '0.82rem', lineHeight: 1.7,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#a371f7'; e.currentTarget.style.background = 'rgba(163,113,247,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(163,113,247,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Upload size={24} style={{ marginBottom: '0.5rem', color: '#a371f7' }} />
                  <br />
                  Kéo thả ảnh vào đây<br />
                  <span style={{ fontSize: '0.75rem' }}>hoặc click để chọn file (jpg, png, webp)</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.7rem 0.9rem', borderRadius: 10, fontSize: '0.82rem',
                background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                color: '#f85149', display: 'flex', gap: '0.5rem',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Tips */}
            <div style={{
              padding: '0.75rem', borderRadius: 10, background: 'rgba(88,166,255,0.06)',
              border: '1px solid rgba(88,166,255,0.15)', fontSize: '0.76rem', color: '#8b949e', lineHeight: 1.7,
            }}>
              <span style={{ color: '#58a6ff', fontWeight: 600 }}>💡 Mẹo:</span> Mô tả đầy đủ loại hình (chóp, lăng trụ...), kích thước và điều kiện đặc biệt (vuông góc, cân, đều...) để AI vẽ chính xác hơn.
            </div>
          </div>

          {/* Generate Button */}
          <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <button
              onClick={handleGenerate}
              disabled={isLoading || (!text.trim() && !imageFile)}
              style={{
                width: '100%', padding: '0.8rem',
                background: (isLoading || (!text.trim() && !imageFile))
                  ? '#21262d'
                  : 'linear-gradient(135deg, #1f6feb, #a371f7)',
                color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                fontSize: '0.9rem', cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                boxShadow: '0 4px 16px rgba(31,111,235,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {isLoading
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Gemini đang phân tích...</>
                : <><Wand2 size={18} /> ✨ Tạo Hình 3D</>
              }
            </button>
          </div>
        </div>

        {/* ── Right: Three.js Canvas ───────────────────────────────────── */}
        <div style={{ position: 'relative', background: '#0d1117' }}>
          {/* Canvas mount */}
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

          {/* Empty state overlay */}
          {!geoData && !isLoading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#30363d', pointerEvents: 'none',
            }}>
              <Eye size={52} strokeWidth={1} style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chưa có hình nào</div>
              <div style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>Nhập đề bài bên trái và bấm "Tạo Hình 3D"</div>
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(13,17,23,0.7)', backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                border: '3px solid rgba(88,166,255,0.2)', borderTopColor: '#58a6ff',
                animation: 'spin 0.9s linear infinite', marginBottom: '1rem',
              }} />
              <div style={{ fontSize: '0.9rem', color: '#8b949e' }}>
                Gemini đang tính toán toạ độ...
              </div>
            </div>
          )}

          {/* Canvas controls hint */}
          {geoData && (
            <>
              <div style={{
                position: 'absolute', top: '0.8rem', left: '0.8rem',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                borderRadius: 8, padding: '0.4rem 0.8rem',
                fontSize: '0.7rem', color: '#8b949e',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', gap: '0.8rem', alignItems: 'center',
              }}>
                <span>🖱 Xoay: Chuột trái</span>
                <span>📦 Di: Chuột phải</span>
                <span>🔍 Zoom: Cuộn</span>
              </div>
              {/* Legend */}
              <div style={{
                position: 'absolute', bottom: '1rem', left: '0.8rem',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                borderRadius: 8, padding: '0.5rem 0.9rem',
                fontSize: '0.72rem', color: '#c9d1d9',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 24, height: 2, background: '#e6edf3' }} />
                  Nét liền (visible edge)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 24, height: 0, borderTop: '2px dashed #8b949e' }} />
                  Nét đứt (hidden edge)
                </div>
              </div>
              {/* Regenerate */}
              <button
                onClick={() => setGeoData(null)}
                style={{
                  position: 'absolute', top: '0.8rem', right: '0.8rem',
                  background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8b949e', borderRadius: 8, padding: '0.4rem 0.7rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0f6fc')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8b949e')}
              >
                <RefreshCw size={13} /> Xoá canvas
              </button>
            </>
          )}
        </div>

      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default GeometryGenerator;
