import React, { useState, useRef, useEffect } from 'react';
import { FoodAnalysis, Level } from '../types';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, AlertTriangle, Camera, Droplet, Flame, Info, Leaf, ArrowLeft, List, Volume2, Loader2, StopCircle } from 'lucide-react';
import { generateFoodSpeech } from '../services/geminiService';

interface NutrientDisplayProps {
  data: FoodAnalysis;
  imageSrc: string;
  onReset: () => void;
  onBack?: () => void; // New prop for back navigation
  isHistoryMode?: boolean; // New prop to change UI context
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b']; // Protein (Blue), Carbs (Green), Fat (Orange)

const MetricCard: React.FC<{ 
    label: string; 
    mainValue: string | number;
    subValue?: string;
    unit?: string;
    level?: Level;
    icon: React.ReactNode 
}> = ({ label, mainValue, subValue, unit, level, icon }) => {
  let colorClass = "bg-gray-50 text-gray-800 border-gray-100";
  
  if (level === Level.LOW) colorClass = "bg-emerald-50 text-emerald-800 border-emerald-100";
  if (level === Level.MEDIUM) colorClass = "bg-yellow-50 text-yellow-800 border-yellow-100";
  if (level === Level.HIGH) colorClass = "bg-red-50 text-red-800 border-red-100";

  // Translate Level to Chinese for display if present
  const getLevelText = (l: Level) => {
    switch(l) {
        case Level.LOW: return '低';
        case Level.MEDIUM: return '中';
        case Level.HIGH: return '高';
        default: return '';
    }
  };

  return (
    <div className={`flex flex-col p-3 rounded-xl border ${colorClass} flex-1 items-center justify-center text-center shadow-sm relative overflow-hidden`}>
      <div className="mb-1 opacity-80">{icon}</div>
      <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">{label}</span>
      
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-xl font-bold leading-none">{mainValue}</span>
        {unit && <span className="text-xs font-medium opacity-80">{unit}</span>}
      </div>

      {level && (
         <div className={`mt-2 px-2 py-0.5 text-[10px] rounded-full font-bold uppercase border ${
             level === Level.LOW ? 'bg-emerald-100 border-emerald-200 text-emerald-700' :
             level === Level.MEDIUM ? 'bg-yellow-100 border-yellow-200 text-yellow-700' :
             'bg-red-100 border-red-200 text-red-700'
         }`}>
            {getLevelText(level)}
         </div>
      )}
      
      {subValue && !level && (
          <span className="text-[10px] mt-1 opacity-80">{subValue}</span>
      )}
    </div>
  );
};

export const NutrientDisplay: React.FC<NutrientDisplayProps> = ({ data, imageSrc, onReset, onBack, isHistoryMode }) => {
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const macroData = [
    { name: '蛋白质', value: data.macros.protein },
    { name: '碳水', value: data.macros.carbs },
    { name: '脂肪', value: data.macros.fat },
  ];

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handlePlayAudio = async () => {
    if (isPlaying) {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current = null;
        }
        setIsPlaying(false);
        return;
    }

    setIsAudioLoading(true);
    try {
        const base64Audio = await generateFoodSpeech(data);
        
        if (!base64Audio) {
            throw new Error("No audio generated");
        }

        // Initialize AudioContext
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;

        // Decode PCM Logic manually as standard decodeAudioData expects headers
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const dataInt16 = new Int16Array(bytes.buffer);
        const numChannels = 1;
        const sampleRate = 24000;
        const frameCount = dataInt16.length / numChannels;
        
        const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        // Create Source
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
            setIsPlaying(false);
        };

        source.start();
        sourceNodeRef.current = source;
        setIsPlaying(true);

    } catch (error) {
        console.error("Failed to play audio", error);
        alert("无法播放语音");
    } finally {
        setIsAudioLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white min-h-screen pb-20 animate-fade-in relative">
      
      {/* Back Button Overlay (Visible in History Mode) */}
      {isHistoryMode && onBack && (
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 z-30 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
      )}

      {/* Header Image */}
      <div className="relative h-64 w-full">
        <img src={imageSrc} alt="Analyzed Food" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        {/* Audio Play Button */}
        <button 
            onClick={handlePlayAudio}
            disabled={isAudioLoading}
            className={`absolute top-4 right-4 z-30 p-3 backdrop-blur-md rounded-full text-white transition-all shadow-lg ${
                isPlaying ? 'bg-pink-500/80 animate-pulse' : 'bg-black/30 hover:bg-black/50'
            } ${isAudioLoading ? 'cursor-wait opacity-80' : ''}`}
        >
            {isAudioLoading ? (
                <Loader2 size={20} className="animate-spin" />
            ) : isPlaying ? (
                <StopCircle size={20} />
            ) : (
                <Volume2 size={20} />
            )}
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <h1 className="text-2xl font-bold leading-tight mb-1">{data.foodName}</h1>
          <p className="text-white/80 text-sm flex items-center gap-1">
             <Info size={14} /> 分量: {data.servingSize}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5 -mt-4 relative z-10 bg-white rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
            {/* Calories */}
            <MetricCard 
                label="热量"
                mainValue={data.calories}
                unit="kcal"
                icon={<Flame size={20} className="text-orange-500" />}
            />

            {/* GI Level */}
            <MetricCard 
                label="升糖(GI)"
                mainValue={data.giIndex}
                level={data.giLevel}
                icon={<Activity size={20} />}
            />

             {/* Purine Level */}
             <MetricCard 
                label="嘌呤"
                mainValue={data.purineLevel === 'High' ? '高' : (data.purineLevel === 'Medium' ? '中' : '低')} 
                subValue={data.purineContent}
                level={data.purineLevel}
                icon={<Droplet size={20} />}
            />
        </div>
        
        {/* Detailed Purine Content Text if available */}
        <div className="flex justify-end -mt-3">
             <span className="text-[10px] text-gray-400">嘌呤含量估算: {data.purineContent}</span>
        </div>

        {/* Description */}
        <div className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
            {data.description}
        </div>

        {/* Macros Chart */}
        <div className="border border-gray-100 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Leaf size={18} className="text-green-600"/> 宏观营养素 (克)
            </h3>
            <div className="flex items-center justify-between">
                <div className="h-32 w-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={macroData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={55}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {macroData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                         <span className="text-[10px] text-gray-400">总量</span>
                         <span className="font-bold text-gray-700">
                            {Math.round(data.macros.protein + data.macros.carbs + data.macros.fat)}g
                         </span>
                    </div>
                </div>
                <div className="flex-1 pl-6 space-y-2">
                    {macroData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                <span className="text-gray-600">{item.name}</span>
                            </div>
                            <span className="font-bold text-gray-800">{item.value}g</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Health Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Info size={18} /> 营养建议
            </h3>
            <ul className="space-y-2">
                {data.healthTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-900/80">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {tip}
                    </li>
                ))}
            </ul>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 items-start p-3 bg-yellow-50/50 rounded-lg border border-yellow-100/50">
            <AlertTriangle size={14} className="text-yellow-600 mt-0.5 shrink-0"/>
            <p className="text-[10px] text-yellow-700/80 leading-tight">
                AI 分析结果仅供参考。实际营养价值可能因烹饪方法、配料和分量而异。如有医疗需求（如糖尿病或痛风），请遵循医生建议。
            </p>
        </div>

      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20">
        {isHistoryMode ? (
            <button 
                onClick={onBack}
                className="bg-gray-800 text-white px-8 py-3 rounded-full shadow-xl hover:bg-gray-900 transition-transform active:scale-95 font-medium flex items-center gap-2"
            >
                <List size={18} /> 返回列表
            </button>
        ) : (
            <button 
                onClick={onReset}
                className="bg-gray-900 text-white px-8 py-3 rounded-full shadow-xl hover:bg-black transition-transform active:scale-95 font-medium flex items-center gap-2"
            >
                <Camera size={18} /> 扫描下一道
            </button>
        )}
      </div>
    </div>
  );
};