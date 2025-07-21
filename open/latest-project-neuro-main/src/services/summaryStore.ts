import create from 'zustand';

interface SummaryState {
  transcript: string;
  summary: any | null;
  setTranscript: (t: string) => void;
  setSummary: (s: any) => void;
}

export const useSummaryStore = create<SummaryState>((set) => ({
  transcript: '',
  summary: null,
  setTranscript: (t) => set({ transcript: t }),
  setSummary: (s) => set({ summary: s }),
})); 