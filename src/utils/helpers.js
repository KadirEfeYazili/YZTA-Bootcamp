export const calculateProficiencyLevel = (userProgress) => {
    const totalCorrect = userProgress.reading.correct + userProgress.grammar.correct;
    const totalQuestions = userProgress.reading.total + userProgress.grammar.total;
    const learnedWordsCount = userProgress.learnedWords.length;

    if (totalQuestions === 0 && learnedWordsCount < 5) {
        return "Başlangıç"; // Beginner
    }

    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;

    if (accuracy >= 0.8 && learnedWordsCount >= 50) {
        return "İleri Düzey"; // Advanced
    } else if (accuracy >= 0.5 && learnedWordsCount >= 20) {
        return "Orta Düzey"; // Intermediate
    } else {
        return "Başlangıç"; // Beginner
    }
}; 