import React from 'react';
import { HistoryItem } from '../types';
import { ArrowLeft, Calendar, ChevronRight, Trash2, Clock } from 'lucide-react';

interface HistoryViewProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onBack: () => void;
  onClear: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ items, onSelect, onBack, onClear }) => {
  return (
     <div className="h-full bg-gray-50 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <ArrowLeft size={24} />
            </button>
            <h2 className="font-bold text-lg text-gray-800">历史记录</h2>
            <button 
                onClick={() => {
                    if(confirm('确定要清空所有历史记录吗？')) {
                        onClear();
                    }
                }} 
                className={`p-2 -mr-2 rounded-full transition-colors ${items.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                disabled={items.length === 0}
            >
                <Trash2 size={20} />
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                    <Clock size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">暂无历史记录</p>
                    <p className="text-xs opacity-60 mt-1">扫描的食物将显示在这里</p>
                </div>
            ) : (
                items.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => onSelect(item)} 
                        className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center active:scale-[0.98] transition-transform cursor-pointer hover:border-emerald-100"
                    >
                        <img 
                            src={item.imageSrc} 
                            alt={item.analysis.foodName} 
                            className="w-16 h-16 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-100" 
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 truncate text-base">{item.analysis.foodName}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                                <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-medium">{item.analysis.calories} kcal</span>
                                <span className={`px-1.5 py-0.5 rounded font-medium ${
                                    item.analysis.giLevel === 'High' ? 'bg-red-50 text-red-700' : 
                                    item.analysis.giLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 
                                    'bg-emerald-50 text-emerald-700'
                                }`}>
                                    GI: {item.analysis.giIndex}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(item.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                            </p>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 shrink-0" />
                    </div>
                ))
            )}
        </div>
     </div>
  );
}