import React, { useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { NutrientDisplay } from './components/NutrientDisplay';
import { analyzeFoodImage } from './services/geminiService';
import { AppState } from './types';
import { Loader2, ScanLine, ChefHat, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'idle', // Start directly at idle/welcome screen
    imageSrc: null,
    analysis: null,
    error: null,
  });

  const handleStartCamera = () => {
    setState(prev => ({ ...prev, status: 'camera', error: null }));
  };

  const handleCapture = async (base64Image: string) => {
    setState(prev => ({ 
        ...prev, 
        status: 'analyzing', 
        imageSrc: base64Image 
    }));

    try {
      const analysisData = await analyzeFoodImage(base64Image);
      setState(prev => ({
        ...prev,
        status: 'result',
        analysis: analysisData
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || "识别失败，请重试。"
      }));
    }
  };

  const handleReset = () => {
    setState({
      status: 'camera',
      imageSrc: null,
      analysis: null,
      error: null
    });
  };

  // Render Content based on State
  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 text-emerald-600">
                    <ChefHat size={48} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">食健康 AI</h1>
                <p className="text-gray-600 mb-8 max-w-xs">
                    一键拍照分析食物热量、升糖指数(GI)及嘌呤含量。
                </p>
                <button 
                    onClick={handleStartCamera}
                    className="w-full max-w-xs bg-emerald-600 text-white font-semibold h-14 rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <ScanLine /> 开始扫描
                </button>
            </div>
        );

      case 'camera':
        return (
            <div className="h-full bg-black">
                <CameraCapture onCapture={handleCapture} />
                <button 
                    onClick={() => setState(prev => ({ ...prev, status: 'idle' }))}
                    className="absolute top-4 left-4 z-20 text-white/80 hover:text-white p-2 bg-black/20 backdrop-blur-sm rounded-full"
                >
                    <ArrowLeft size={24} />
                </button>
            </div>
        );

      case 'analyzing':
        return (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6 relative overflow-hidden">
            {/* Background Image Blur Effect */}
            {state.imageSrc && (
                <div className="absolute inset-0 z-0 opacity-20 blur-xl scale-110">
                    <img src={state.imageSrc} alt="" className="w-full h-full object-cover" />
                </div>
            )}
            
            <div className="z-10 bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs w-full border border-white/50">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">正在分析...</h2>
                <p className="text-sm text-gray-500 text-center">
                    正在识别食材并计算营养成分
                </p>
            </div>
          </div>
        );

      case 'result':
        if (!state.analysis || !state.imageSrc) return null;
        return (
          <NutrientDisplay 
            data={state.analysis} 
            imageSrc={state.imageSrc} 
            onReset={handleReset} 
          />
        );

      case 'error':
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-red-50">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500">
                <ScanLine size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">分析失败</h2>
            <p className="text-gray-600 mb-8">{state.error}</p>
            <div className="flex gap-4 w-full max-w-xs">
                <button 
                    onClick={() => setState(prev => ({ ...prev, status: 'idle' }))}
                    className="flex-1 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    返回首页
                </button>
                <button 
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl font-medium bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors"
                >
                    重试
                </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-screen bg-gray-100 overflow-hidden">
        <div className="mx-auto max-w-md h-full bg-white shadow-2xl relative overflow-y-auto scrollbar-hide">
            {renderContent()}
        </div>
    </div>
  );
};

export default App;