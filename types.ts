export enum Level {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  foodName: string;
  calories: number; // per serving
  servingSize: string; // e.g., "100g" or "1 bowl"
  giIndex: number;
  giLevel: Level;
  purineContent: string; // e.g., "120mg/100g"
  purineLevel: Level;
  macros: MacroNutrients;
  healthTips: string[];
  description: string;
}

export interface AppState {
  status: 'idle' | 'camera' | 'analyzing' | 'result' | 'error';
  imageSrc: string | null;
  analysis: FoodAnalysis | null;
  error: string | null;
}