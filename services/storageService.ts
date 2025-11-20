import { FoodAnalysis, HistoryItem } from "../types";

const STORAGE_KEY = 'nutriscan_history_v1';
const MAX_ITEMS = 20;

export const saveToHistory = (analysis: FoodAnalysis, imageSrc: string) => {
  try {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      analysis,
      imageSrc
    };

    const existing = getHistory();
    // Add new item to the beginning and limit to MAX_ITEMS
    const updated = [newItem, ...existing].slice(0, MAX_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save history (likely storage full):", e);
    // In a production app, we might want to handle quota exceeded more gracefully
    // e.g. by removing more old items or compressing images further.
  }
};

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const clearHistory = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear history", e);
    }
}