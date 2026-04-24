import React, { useMemo, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import * as math from 'mathjs';
import { useGeometryStore } from '../../store/useGeometryStore';


const PlotMulti: React.FC<{ zoom: number }> = ({ zoom }) => {
  const { expressions, x0 } = useGeometryStore();

  return (
    <group>
      {expressions.map((exp) => {
        if (!exp.visible || !exp.formula) return null;

        return (
          <ExpressionLayer key={exp.id} formula={exp.formula} color={exp.color} x0={x0} zoom={zoom} />
        );
      })}
    </group>
  );
};



const ExpressionLayer: React.FC<{ formula: string; color: string; x0: number; zoom: number }> = ({ formula, color, x0, zoom }) => {
  const { size, camera } = useThree();
  
  // Debounce formula to prevent crash during typing
  const [debouncedFormula, setDebouncedFormula] = React.useState(formula);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedFormula(formula), 150);
    return () => clearTimeout(timer);
  }, [formula]);

  const isImplicit = useMemo(() => debouncedFormula.includes('=') || debouncedFormula.includes('y'), [debouncedFormula]);

  const implicitSegments = useMemo(() => {
    if (!isImplicit) return null;
    const lines: [number, number, number][][] = [];
    try {
      let eq = debouncedFormula;
      if (debouncedFormula.includes('=')) {
        const parts = debouncedFormula.split('=');
        eq = `(${parts[0]}) - (${parts[1]})`;
      }
      const node = math.parse(eq);
      const code = node.compile();

      const centerX = camera.position.x;
      const centerY = camera.position.y;
      const halfW = (size.width / zoom);
      const halfH = (size.height / zoom);
      
      const range = Math.max(halfW, halfH) * 2.2;
      const baseRes = 120; // Tăng độ phân giải cho hàm ẩn
      const step = range / baseRes;
      
      const startX = centerX - range / 2;
      const startY = centerY - range / 2;

      const evalAt = (x: number, y: number) => {
        try {
          const val = code.evaluate({ x, y });
          return typeof val === 'number' ? val : NaN;
        } catch { return NaN; }
      };

      const lerp = (p1: [number, number], p2: [number, number], v1: number, v2: number): [number, number, number] => {
        const t = Math.abs(v1) / (Math.abs(v1) + Math.abs(v2) || 1e-15);
        return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]), 0];
      };

      const processCell = (x0: number, y0: number, x1: number, y1: number, v1: number, v2: number, v3: number, v4: number, currentLines: [number, number, number][][]) => {
        if (isNaN(v1) || isNaN(v2) || isNaN(v3) || isNaN(v4)) return;
        
        let caseIndex = 0;
        if (v1 > 0) caseIndex |= 1;
        if (v2 > 0) caseIndex |= 2;
        if (v3 > 0) caseIndex |= 4;
        if (v4 > 0) caseIndex |= 8;

        if (caseIndex === 0 || caseIndex === 15) return;

        const p1: [number, number] = [x0, y0];
        const p2: [number, number] = [x1, y0];
        const p3: [number, number] = [x1, y1];
        const p4: [number, number] = [x0, y1];

        const bottom = lerp(p1, p2, v1, v2);
        const right = lerp(p2, p3, v2, v3);
        const top = lerp(p3, p4, v3, v4);
        const left = lerp(p4, p1, v4, v1);

        switch (caseIndex) {
          case 1: case 14: currentLines.push([left, bottom]); break;
          case 2: case 13: currentLines.push([bottom, right]); break;
          case 3: case 12: currentLines.push([left, right]); break;
          case 4: case 11: currentLines.push([top, right]); break;
          case 5: currentLines.push([left, top], [bottom, right]); break;
          case 6: case 9: currentLines.push([top, bottom]); break;
          case 7: case 8: currentLines.push([left, top]); break;
          case 10: currentLines.push([left, bottom], [top, right]); break;
        }
      };

      for (let j = 0; j < baseRes; j++) {
        const y0 = startY + j * step;
        const y1 = startY + (j + 1) * step;
        for (let i = 0; i < baseRes; i++) {
          const x0 = startX + i * step;
          const x1 = startX + (i + 1) * step;

          const v1 = evalAt(x0, y0);
          const v2 = evalAt(x1, y0);
          const v3 = evalAt(x1, y1);
          const v4 = evalAt(x0, y1);

          if (isNaN(v1) || isNaN(v2) || isNaN(v3) || isNaN(v4)) continue;

          let caseIndex = 0;
          if (v1 > 0) caseIndex |= 1;
          if (v2 > 0) caseIndex |= 2;
          if (v3 > 0) caseIndex |= 4;
          if (v4 > 0) caseIndex |= 8;

          if (caseIndex !== 0 && caseIndex !== 15) {
            const subRes = 4;
            const subStep = step / subRes;
            for (let sj = 0; sj < subRes; sj++) {
              for (let si = 0; si < subRes; si++) {
                const sx0 = x0 + si * subStep;
                const sx1 = x0 + (si + 1) * subStep;
                const sy0 = y0 + sj * subStep;
                const sy1 = y0 + (sj + 1) * subStep;
                
                processCell(sx0, sy0, sx1, sy1, evalAt(sx0, sy0), evalAt(sx1, sy0), evalAt(sx1, sy1), evalAt(sx0, sy1), lines);
              }
            }
          }
        }
      }
    } catch (e) {}
    return lines;
  }, [debouncedFormula, isImplicit, size, zoom, camera.position.x, camera.position.y]);

  const explicitPoints = useMemo(() => {
    if (isImplicit) return [];
    const pts: [number, number, number][] = [];
    try {
      const node = math.parse(debouncedFormula);
      const code = node.compile();
      
      // Tính toán dải x dựa trên vị trí camera và zoom
      const centerX = camera.position.x;
      const viewWidth = size.width / zoom;
      const xMin = centerX - viewWidth * 1.5;
      const xMax = centerX + viewWidth * 1.5;
      
      const steps = 2000; // Tăng số điểm để cực kỳ mượt mà
      const step = (xMax - xMin) / steps;
      
      for (let i = 0; i <= steps; i++) {
        const x = xMin + i * step;
        try {
          const y = code.evaluate({ x });
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            // Giới hạn y để tránh lỗi render khi y quá lớn
            if (Math.abs(y) < 10000) {
              pts.push([x, y, 0]);
            } else {
              if (pts.length > 0) pts.push([NaN, NaN, NaN] as any);
            }
          } else {
            if (pts.length > 0) pts.push([NaN, NaN, NaN] as any);
          }
        } catch {
          if (pts.length > 0) pts.push([NaN, NaN, NaN] as any);
        }
      }
    } catch (e) {}
    return pts;
  }, [debouncedFormula, isImplicit, camera.position.x, size.width, zoom]);

  const tangentData = useMemo(() => {
    if (isImplicit) return null;
    try {
      const node = math.parse(debouncedFormula);
      const code = node.compile();
      let derivCode: any = null;
      try {
        const derivNode = math.derivative(debouncedFormula, 'x');
        derivCode = derivNode.compile();
      } catch (de) {}
      const y0 = code.evaluate({ x: x0 });
      const k = derivCode.evaluate({ x: x0 });
      const length = 5;
      return { p1: [x0 - length, y0 - k * length, 0], p2: [x0 + length, y0 + k * length, 0], y0, k };
    } catch (e) { return null; }
  }, [debouncedFormula, x0, isImplicit]);

  const implicitGeometry = useMemo(() => {
    if (!isImplicit || !implicitSegments || implicitSegments.length === 0) return null;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(implicitSegments.length * 2 * 3);
    for (let i = 0; i < implicitSegments.length; i++) {
      const seg = implicitSegments[i];
      positions[i * 6 + 0] = seg[0][0];
      positions[i * 6 + 1] = seg[0][1];
      positions[i * 6 + 2] = seg[0][2];
      positions[i * 6 + 3] = seg[1][0];
      positions[i * 6 + 4] = seg[1][1];
      positions[i * 6 + 5] = seg[1][2];
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [isImplicit, implicitSegments]);

  return (
    <group>
      {isImplicit ? (
        implicitGeometry && (
          <lineSegments geometry={implicitGeometry}>
            <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.9} />
          </lineSegments>
        )
      ) : (
        explicitPoints.length > 0 && <Line points={explicitPoints as any} color={color} lineWidth={3.5} transparent opacity={0.9} />
      )}
      
      {tangentData && (
        <group>
          <Line points={[tangentData.p1, tangentData.p2] as any} color={color} lineWidth={1.5} dashed dashScale={0.5} opacity={0.5} transparent />
          <mesh position={[x0, tangentData.y0, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const calculateStep = (zoom: number, width: number) => {
  if (!zoom || !width || zoom <= 0 || width <= 0) return 1;
  const unitsVisible = width / zoom;
  const rawStep = unitsVisible / 10; 
  if (rawStep <= 0 || isNaN(rawStep)) return 1;

  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  
  let step = magnitude;
  if (normalized > 7) step = 10 * magnitude;
  else if (normalized > 3) step = 5 * magnitude;
  else if (normalized > 1.5) step = 2 * magnitude;
  
  return step || 1;
};

const GridManual: React.FC<{ zoom: number }> = ({ zoom }) => {
  const size = useThree((state) => state.size);
  const step = calculateStep(zoom, size.width);
  const subStep = step / 5;
  
  const majorLines: [number, number, number][][] = [];
  const minorLines: [number, number, number][][] = [];
  
  const unitsVisible = size.width / zoom;
  const rawStep = unitsVisible / 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const alpha = Math.min(1, Math.max(0, (normalized - 1) * 2));

  const rangeX = (size.width / zoom) * 2;
  const rangeY = (size.height / zoom) * 2;
  const range = Math.max(rangeX, rangeY, 100);

  for (let x = -range; x <= range; x = Math.round((x + subStep) * 1000) / 1000) {
    if (Math.abs(x) < 0.0001) continue; 
    const isMajor = Math.abs(x % step) < 0.001 || Math.abs(Math.abs(x % step) - step) < 0.001;
    const pts: [[number, number, number], [number, number, number]] = [[x, -range, 0], [x, range, 0]];
    if (isMajor) majorLines.push(pts);
    else minorLines.push(pts);
  }

  for (let y = -range; y <= range; y = Math.round((y + subStep) * 1000) / 1000) {
    if (Math.abs(y) < 0.0001) continue; 
    const isMajor = Math.abs(y % step) < 0.001 || Math.abs(Math.abs(y % step) - step) < 0.001;
    const pts: [[number, number, number], [number, number, number]] = [[-range, y, 0], [range, y, 0]];
    if (isMajor) majorLines.push(pts);
    else minorLines.push(pts);
  }

  const majorGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(majorLines.length * 2 * 3);
    majorLines.forEach((l, i) => {
      pos[i*6+0]=l[0][0]; pos[i*6+1]=l[0][1]; pos[i*6+2]=l[0][2];
      pos[i*6+3]=l[1][0]; pos[i*6+4]=l[1][1]; pos[i*6+5]=l[1][2];
    });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [majorLines]);

  const minorGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(minorLines.length * 2 * 3);
    minorLines.forEach((l, i) => {
      pos[i*6+0]=l[0][0]; pos[i*6+1]=l[0][1]; pos[i*6+2]=l[0][2];
      pos[i*6+3]=l[1][0]; pos[i*6+4]=l[1][1]; pos[i*6+5]=l[1][2];
    });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [minorLines]);

  return (
    <group>
      <lineSegments geometry={minorGeometry}>
        <lineBasicMaterial color="#1e293b" transparent opacity={0.3 * alpha} />
      </lineSegments>
      <lineSegments geometry={majorGeometry}>
        <lineBasicMaterial color="#334155" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
};

const AxisLabels: React.FC<{ zoom: number }> = React.memo(({ zoom }) => {
  const { size, camera } = useThree();
  const [, setTick] = React.useState(0);
  const lastPos = React.useRef(new THREE.Vector3());
  
  // Update labels only when camera moves significantly
  useFrame(() => {
    if (camera.position.distanceToSquared(lastPos.current) > 0.0001) {
      lastPos.current.copy(camera.position);
      setTick(t => t + 1);
    }
  });

  const step = calculateStep(zoom, size.width);
  const labels = [];
  
  const centerX = camera.position.x;
  const centerY = camera.position.y;
  const halfW = (size.width / zoom) / 2;
  const halfH = (size.height / zoom) / 2;
  
  const minX = centerX - halfW;
  const maxX = centerX + halfW;
  const minY = centerY - halfH;
  const maxY = centerY + halfH;
  
  const fontSize = Math.max(10, Math.min(12, 120 / zoom + 9));
  const labelColor = '#94a3b8';

  const stickyY = Math.max(minY + (20/zoom), Math.min(maxY - (40/zoom), 0));
  const stickyX = Math.max(minX + (40/zoom), Math.min(maxX - (20/zoom), 0));

  // X-axis labels (Aligned to step)
  const startX = Math.ceil(minX / step) * step;
  for (let x = startX; x <= maxX; x += step) {
    const val = Math.round(x * 1000) / 1000;
    if (Math.abs(val) < step / 10) continue;
    labels.push(
      <Html key={`x-${val}`} position={[val, stickyY, 0]} center transform style={{ pointerEvents: 'none' }}>
        <div style={{ 
          color: labelColor, fontSize: `${fontSize}px`, 
          transform: 'translateY(16px)', userSelect: 'none', fontWeight: 500 
        }}>{val}</div>
      </Html>
    );
  }
  
  // Y-axis labels (Aligned to step)
  const startY = Math.ceil(minY / step) * step;
  for (let y = startY; y <= maxY; y += step) {
    const val = Math.round(y * 1000) / 1000;
    if (Math.abs(val) < step / 10) continue;
    labels.push(
      <Html key={`y-${val}`} position={[stickyX, val, 0]} center transform style={{ pointerEvents: 'none' }}>
        <div style={{ 
          color: labelColor, fontSize: `${fontSize}px`, 
          transform: 'translateX(-22px)', userSelect: 'none', fontWeight: 500 
        }}>{val}</div>
      </Html>
    );
  }
  
  labels.push(
    <Html key="origin" position={[stickyX, stickyY, 0]} center transform style={{ pointerEvents: 'none' }}>
      <div style={{ 
        color: labelColor, fontSize: `${fontSize + 1}px`, 
        transform: 'translate(-12px, 12px)', userSelect: 'none', fontWeight: 600 
      }}>0</div>
    </Html>
  );

  return <>{labels}</>;
});

const GraphControls: React.FC<{ setZoom: (z: number) => void }> = ({ setZoom }) => {
  const { camera, gl, size } = useThree();
  const isDragging = React.useRef(false);

  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // World point under mouse before zoom
      const preZoomWorld = new THREE.Vector3(x, y, 0).unproject(camera);

      // Desmos-style zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
      const newZoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.01), 100000);
      
      camera.zoom = newZoom;
      camera.updateProjectionMatrix();
      setZoom(newZoom);

      // World point under mouse after zoom
      const postZoomWorld = new THREE.Vector3(x, y, 0).unproject(camera);
      
      // Shift camera to keep world point fixed
      camera.position.x += preZoomWorld.x - postZoomWorld.x;
      camera.position.y += preZoomWorld.y - postZoomWorld.y;
    };

    const handleDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 1 || e.button === 2) {
        isDragging.current = true;
        gl.domElement.setPointerCapture(e.pointerId);
      }
    };

    const handleUp = (e: PointerEvent) => {
      isDragging.current = false;
      gl.domElement.releasePointerCapture(e.pointerId);
    };

    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      // Standard orthographic panning logic
      const scaleX = (camera as any).right - (camera as any).left;
      const scaleY = (camera as any).top - (camera as any).bottom;
      
      camera.position.x -= (e.movementX / size.width) * (scaleX / camera.zoom);
      camera.position.y += (e.movementY / size.height) * (scaleY / camera.zoom);
    };

    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    gl.domElement.addEventListener('pointerdown', handleDown);
    gl.domElement.addEventListener('pointermove', handleMove);
    gl.domElement.addEventListener('pointerup', handleUp);

    return () => {
      gl.domElement.removeEventListener('wheel', handleWheel);
      gl.domElement.removeEventListener('pointerdown', handleDown);
      gl.domElement.removeEventListener('pointermove', handleMove);
      gl.domElement.removeEventListener('pointerup', handleUp);
    };
  }, [camera, gl, size, setZoom]);

  return null;
};

const CoordinateTracker: React.FC = () => {
  const { camera, gl } = useThree();
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const world = new THREE.Vector3(x, y, 0).unproject(camera);
      setCoords({ x: world.x, y: world.y });
      setVisible(true);
    };

    const handleLeave = () => setVisible(false);

    gl.domElement.addEventListener('mousemove', handleMove);
    gl.domElement.addEventListener('mouseleave', handleLeave);
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMove);
      gl.domElement.removeEventListener('mouseleave', handleLeave);
    };
  }, [camera, gl]);

  if (!visible) return null;

  return (
    <Html position={[coords.x, coords.y, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        color: '#f1f5f9',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        whiteSpace: 'nowrap',
        border: '1px solid #334155',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        transform: 'translate(12px, -28px)',
        fontFamily: 'JetBrains Mono, monospace',
        backdropFilter: 'blur(4px)',
        zIndex: 1000
      }}>
        <span style={{ color: '#94a3b8' }}>x:</span> {coords.x.toFixed(3)}<br/>
        <span style={{ color: '#94a3b8' }}>y:</span> {coords.y.toFixed(3)}
      </div>
    </Html>
  );
};

const GraphingScene: React.FC = () => {
  const [zoom, setZoom] = React.useState(60);

  return (
    <div className="canvas-container" style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#0b1120' }}>
      <Canvas shadows orthographic camera={{ zoom: 60, position: [0, 0, 100], near: 0.1, far: 2000 }} style={{ background: '#0b1120' }}>
        <Suspense fallback={null}>
          <GraphControls setZoom={setZoom} />
          
          <ambientLight intensity={0.6} />
          
          <GridManual zoom={zoom} />

          {/* Trục Toạ Độ XY */}
          <Line points={[[-5000, 0, 0], [5000, 0, 0]]} color="#cbd5e1" lineWidth={2} opacity={0.8} transparent />
          <Line points={[[0, -5000, 0], [0, 5000, 0]]} color="#cbd5e1" lineWidth={2} opacity={0.8} transparent />

          <AxisLabels zoom={zoom} />
          <CoordinateTracker />
          <PlotMulti zoom={zoom} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GraphingScene;
