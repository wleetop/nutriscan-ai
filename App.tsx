import React, { useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { NutrientDisplay } from './components/NutrientDisplay';
import { HistoryView } from './components/HistoryView';
import { analyzeFoodImage } from './services/geminiService';
import { saveToHistory, getHistory, clearHistory } from './services/storageService';
import { AppState, HistoryItem } from './types';
import { Loader2, ScanLine, ChefHat, ArrowLeft, History } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'idle', 
    imageSrc: null,
    analysis: null,
    error: null,
    isHistoryView: false,
  });

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const handleStartCamera = () => {
    setState(prev => ({ ...prev, status: 'camera', error: null, isHistoryView: false }));
  };

  const handleCapture = async (base64Image: string) => {
    setState(prev => ({ 
        ...prev, 
        status: 'analyzing', 
        imageSrc: base64Image 
    }));

    try {
      const analysisData = await analyzeFoodImage(base64Image);
      
      // Save to history
      saveToHistory(analysisData, base64Image);
      
      setState(prev => ({
        ...prev,
        status: 'result',
        analysis: analysisData,
        isHistoryView: false
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
      error: null,
      isHistoryView: false
    });
  };

  // History Handlers
  const handleViewHistory = () => {
    const items = getHistory();
    setHistoryItems(items);
    setState(prev => ({ ...prev, status: 'history' }));
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
      setState(prev => ({
          ...prev,
          status: 'result',
          analysis: item.analysis,
          imageSrc: item.imageSrc,
          isHistoryView: true
      }));
  };

  const handleClearHistory = () => {
      clearHistory();
      setHistoryItems([]);
  };

  // Render Content based on State
  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 animate-fade-in">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 text-emerald-600">
                    <ChefHat size={48} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">食健康 AI</h1>
                <p className="text-gray-600 mb-8 max-w-xs">
                    一键拍照分析食物热量、升糖指数(GI)及嘌呤含量。
                </p>
                
                <div className="w-full max-w-xs space-y-4">
                    <button 
                        onClick={handleStartCamera}
                        className="w-full bg-emerald-600 text-white font-semibold h-14 rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ScanLine /> 开始扫描
                    </button>
                    
                    <button 
                        onClick={handleViewHistory}
                        className="w-full bg-white text-gray-700 font-semibold h-12 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <History size={20} /> 历史记录
                    </button>
                </div>
            </div>
        );

      case 'camera':
        return (
            <div className="h-full bg-black animate-fade-in">
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
            
            <div className="z-10 bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs w-full border border-white/50 animate-fade-in">
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
            onBack={() => setState(prev => ({ ...prev, status: 'history' }))}
            isHistoryMode={state.isHistoryView}
          />
        );

      case 'history':
        return (
            <HistoryView 
                items={historyItems} 
                onSelect={handleSelectHistoryItem}
                onBack={() => setState(prev => ({ ...prev, status: 'idle' }))}
                onClear={handleClearHistory}
            />
        );

      case 'error':
        return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-red-50 animate-fade-in">
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