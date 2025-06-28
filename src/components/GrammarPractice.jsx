import React from 'react';
import { BrainCircuit } from 'lucide-react';

const GrammarPractice = ({ userProgress, saveProgress }) => {
    // This component will eventually generate grammar exercises.
    // For now, it remains a placeholder.
    // When implemented, it should also log activities to saveProgress.
    return (
        <div className="p-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 flex items-center">
                <BrainCircuit className="mr-3 text-violet-600" size={32} />
                Dilbilgisi Alıştırmaları
            </h2>
            <p className="text-slate-500">Bu bölüm geliştirme aşamasındadır.</p>
        </div>
    );
};

export default GrammarPractice; 