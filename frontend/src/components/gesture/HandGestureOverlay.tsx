import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useGestureStore } from '../../store/useGestureStore';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';

const HandGestureOverlay: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isEnabled, setDetected, updateRotation, setLastPosition, lastX, lastY } = useGestureStore();
  
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializingModel, setIsInitializingModel] = useState<boolean>(false);

  // Initialize MediaPipe Model
  useEffect(() => {
    let active = true;
    const initMediaPipe = async () => {
      setIsInitializingModel(true);
      setErrorMsg(null);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            // Tính toán bằng GPU để giảm giật lag triệt để (WebGL)
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (active) {
          setLandmarker(handLandmarker);
          setIsInitializingModel(false);
        }
      } catch (e: any) {
        if (active) {
          setErrorMsg("Lỗi tải AI Model: " + (e.message || "Không xác định"));
          setIsInitializingModel(false);
        }
      }
    };

    if (isEnabled && !landmarker && !isInitializingModel) {
      initMediaPipe();
    }

    return () => { active = false; };
  }, [isEnabled, landmarker]);

  // Handle Webcam
  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ Web Camera hoặc đang dùng kết nối không bảo mật (yêu cầu localhost hoặc HTTPS).");
        }
        const ms = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { max: 320 }, height: { max: 240 } } 
        });
        if (active) {
          setStream(ms);
          if (videoRef.current) {
            videoRef.current.srcObject = ms;
          }
        }
      } catch (err: any) {
        if (active) {
          console.error("Camera error:", err);
          if (err.name === 'NotAllowedError') {
            setErrorMsg("Camera bị từ chối truy cập. Vui lòng cấp quyền Camera trên trình duyệt.");
          } else {
            setErrorMsg("Không thể gắn kết Web Camera: " + (err.message || err.name));
          }
        }
      }
    };

    if (isEnabled) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setErrorMsg(null); // Reset when turning off
    }

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isEnabled]); // intentionally excluding stream to prevent retriggering

  // Detection Loop with RequestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;
    let lastVideoTime = -1;

    const runDetection = () => {
      if (landmarker && videoRef.current && videoRef.current.readyState >= 2 && !errorMsg) {
        try {
          // Chỉ nhận diện AI khi video thực sự đã render frame mới (Tránh giật lag cực độ do chạy đè)
          const currentTime = videoRef.current.currentTime;
          if (currentTime !== lastVideoTime) {
            lastVideoTime = currentTime;
            const startTimeMs = performance.now();
            const results = landmarker.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.landmarks && results.landmarks.length > 0) {
              setDetected(true);
              const hand = results.landmarks[0];
              
              // Use Index Finger Tip (Landmark 8) for tracking
              const currentX = hand[8].x;
              const currentY = hand[8].y;

              if (lastX !== null && lastY !== null) {
                const dx = currentX - lastX;
                const dy = currentY - lastY;
                
                // Camera is mirrored (scaleX(-1)), so reverse X
                // Giảm sensitivity xuống xíu vì GPU chạy nhanh mượt hơn
                updateRotation(-dx * 120, dy * 120);
              }
              
              setLastPosition(currentX, currentY);
              
              // Draw skeleton
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  ctx.fillStyle = "#58a6ff";
                  hand.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x * canvasRef.current!.width, point.y * canvasRef.current!.height, 3, 0, Math.PI * 2);
                    ctx.fill();
                  });
                }
              }
            } else {
              setDetected(false);
              setLastPosition(null, null);
              // Clear canvas when hand lost
              if (canvasRef.current) {
                 const ctx = canvasRef.current.getContext('2d');
                 if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }
        } catch (err) {
          console.error("Lỗi khi detect khung hình:", err);
        }
      }
      animationFrameId = requestAnimationFrame(runDetection);
    };

    if (isEnabled && landmarker) {
      runDetection();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isEnabled, landmarker, lastX, lastY, errorMsg]);

  if (!isEnabled) return null;

  return (
    <div className="animate-fade-in" style={{
      position: 'absolute', bottom: '2rem', right: '25rem',
      width: '320px', height: '240px', borderRadius: '12px', overflow: 'hidden',
      border: '2px solid #58a6ff', boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      zIndex: 1000, background: '#0a0c10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      
      {errorMsg ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#f85149', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
          <AlertCircle size={32} />
          <span style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{errorMsg}</span>
        </div>
      ) : (
        <>
          {(!landmarker || !stream) && (
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', color: '#8b949e' }}>
               <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
               <span style={{ fontSize: '0.8rem' }}>
                 {!stream ? 'Đang truy cập Camera...' : 'Đang tải Mô hình AI (~5MB)...'}
               </span>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          <canvas 
            ref={canvasRef}
            width={320}
            height={240}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', opacity: 0.8 }}
          />
          <div style={{
            position: 'absolute', top: '0.5rem', left: '0.5rem',
            background: 'rgba(0,0,0,0.6)', padding: '0.3rem 0.6rem',
            borderRadius: '6px', fontSize: '0.7rem', color: '#58a6ff',
            display: 'flex', alignItems: 'center', gap: '0.4rem', backdropFilter: 'blur(4px)'
          }}>
            <Camera size={14} /> AI Tracker: {landmarker ? 'Sẵn sàng' : 'Loading'}
          </div>
        </>
      )}
    </div>
  );
};

export default HandGestureOverlay;
