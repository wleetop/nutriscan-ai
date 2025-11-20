import React, { useRef, useEffect, useState } from 'react';
import { Camera, SwitchCamera, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use a ref to track the stream so we can clean it up reliably
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      // Cleanup previous stream if it exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setError('');

      try {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Browser API not supported");
        }

        let mediaStream: MediaStream;
        
        try {
           // 1. Try preferred configuration (e.g. rear camera)
           mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (firstErr) {
          console.warn("Preferred camera config failed, falling back to basic config", firstErr);
          // 2. Fallback to any available video device if the specific constraint fails
          mediaStream = await navigator.mediaDevices.getUserMedia({
             video: true,
             audio: false
          });
        }
        
        if (!mounted) {
            mediaStream.getTracks().forEach(track => track.stop());
            return;
        }

        streamRef.current = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Explicitly call play() which is sometimes needed on mobile
          try {
            await videoRef.current.play();
          } catch (e) {
            console.error("Video play failed", e);
          }
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (mounted) {
            let msg = "无法启动摄像头。\n请尝试上传照片。";
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "相机权限被拒绝。\n请在浏览器设置中允许访问相机，\n或者直接上传照片。";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = "未找到相机设备。\n请直接上传照片。";
            } else if (err.message === "Browser API not supported") {
                msg = "您的浏览器不支持相机访问\n(或未在安全HTTPS环境下运行)。\n请直接上传照片。";
            }
            
            setError(msg);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // If using user camera (selfie), flip the image horizontally so the text isn't backwards
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(imageDataUrl);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onCapture(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Error State UI
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-900 text-white">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
             <Camera size={32} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">相机访问失败</h3>
        <p className="text-red-200/80 mb-8 whitespace-pre-wrap leading-relaxed max-w-xs text-sm">{error}</p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-900/30"
            >
                <ImageIcon size={22} /> 上传照片
            </button>
            
            <button 
                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
            >
                <RefreshCw size={18} /> 重试相机
            </button>
        </div>
        <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload} 
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        // Mirror the video preview if in user mode for a natural mirror effect
        className={`absolute inset-0 w-full h-full object-cover transition-transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      
      {/* Overlay UI */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center items-center gap-8">
        
        {/* Gallery Upload Button */}
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-95"
            aria-label="Upload Image"
        >
            <ImageIcon size={24} />
        </button>

        {/* Capture Button */}
        <button
          onClick={handleCapture}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-all active:scale-95 shadow-lg shadow-black/20"
          aria-label="Take Photo"
        >
          <div className="w-16 h-16 bg-white rounded-full shadow-sm" />
        </button>

        {/* Switch Camera Button */}
        <button 
            onClick={toggleCamera}
            className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-95"
            aria-label="Switch Camera"
        >
            <SwitchCamera size={24} />
        </button>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileUpload} 
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};