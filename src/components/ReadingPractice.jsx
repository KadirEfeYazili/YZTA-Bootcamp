import React, { useState } from 'react';
import { BookOpen, ChevronRight, ArrowLeft, Shuffle, Edit3, CheckCircle, XCircle, TrendingUp, History, Calendar, Clock, Target } from 'lucide-react';

const ReadingPractice = ({ userProgress, saveProgress }) => {
    const [currentStep, setCurrentStep] = useState('examSelection'); // examSelection, categorySelection, topicSelection, practiceMode
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPassage, setGeneratedPassage] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [correctAnswers, setCorrectAnswers] = useState({});
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);

    const yokdilCategories = [
        { id: 'fen', name: 'Fen Bilimleri', description: 'Matematik, Fizik, Kimya, Biyoloji' },
        { id: 'saglik', name: 'Sağlık Bilimleri', description: 'Tıp, Diş Hekimliği, Eczacılık, Hemşirelik' },
        { id: 'sosyal', name: 'Sosyal Bilimler', description: 'Tarih, Coğrafya, Felsefe, Sosyoloji' }
    ];

    const ydsTopics = [
        'Teknoloji ve İnovasyon',
        'Çevre ve Sürdürülebilirlik',
        'Eğitim ve Öğrenme',
        'Sağlık ve Yaşam Tarzı',
        'Kültür ve Sanat',
        'Ekonomi ve İş Dünyası',
        'Bilim ve Araştırma',
        'Sosyal Medya ve İletişim'
    ];

    // Function to clean text from ** formatting
    const cleanText = (text) => {
        return text.replace(/\*\*(.*?)\*\*/g, '$1').trim();
    };

    // Improved function to parse questions from AI response
    const parseQuestions = (fullText) => {
        console.log('Full AI response:', fullText);
        
        const questions = [];
        const lines = fullText.split('\n').filter(line => line.trim());
        
        let currentQuestion = null;
        let questionNumber = 0;
        let answerKeySection = false;
        const answers = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for answer key section
            if (line.includes('Answer Key') || line.includes('Cevap Anahtarı')) {
                answerKeySection = true;
                continue;
            }
            
            // Parse answer key
            if (answerKeySection) {
                const answerMatch = line.match(/(\d+)\.\s*([A-E])/);
                if (answerMatch) {
                    answers[parseInt(answerMatch[1])] = answerMatch[2];
                }
                continue;
            }
            
            // Check if line starts with a number (question)
            const questionMatch = line.match(/^(\d+)\.\s*(.*)/);
            if (questionMatch && !line.includes('A)') && !line.includes('B)')) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }
                questionNumber = parseInt(questionMatch[1]);
                currentQuestion = {
                    number: questionNumber,
                    question: cleanText(questionMatch[2]),
                    options: []
                };
            }
            // Check for options (A), B), C), D), E)
            else if (line.match(/^[A-E]\)/)) {
                if (currentQuestion) {
                    const option = {
                        letter: line.charAt(0),
                        text: cleanText(line.substring(2).trim())
                    };
                    currentQuestion.options.push(option);
                }
            }
        }
        
        if (currentQuestion) {
            questions.push(currentQuestion);
        }
        
        console.log('Parsed questions:', questions);
        console.log('Parsed answers:', answers);
        
        setCorrectAnswers(answers);
        return questions;
    };

    // Get last 5 test results from activities
    const getLastTestResults = () => {
        if (!userProgress?.activities) return [];
        
        return userProgress.activities
            .filter(activity => activity.type === 'reading_practice_completed')
            .sort((a, b) => {
                const timestampA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 
                                 a.timestamp instanceof Date ? a.timestamp.getTime() : 
                                 new Date(a.timestamp).getTime();
                const timestampB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 
                                 b.timestamp instanceof Date ? b.timestamp.getTime() : 
                                 new Date(b.timestamp).getTime();
                return timestampB - timestampA;
            })
            .slice(0, 5);
    };

    const generatePassage = async (examType, category = '', topic = '', isRandom = false) => {
        setIsGenerating(true);
        setStartTime(new Date());
        
        const apiKey = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        let prompt = '';
        
        if (examType === 'YDS') {
            if (isRandom) {
                prompt = `YDS sınavına uygun, orta-ileri seviye İngilizce bir okuma parçası oluştur. Paragraf 200-250 kelime olmalı ve akademik/genel konulardan biri hakkında olmalı. 

Ardından 5 adet çoktan seçmeli soru (A, B, C, D, E seçenekleri ile) ekle. Sorular paragrafın ana fikrini, detayları ve çıkarımları test etmeli. 

Format şu şekilde olmalı:
1. Soru metni
A) Seçenek 1
B) Seçenek 2
C) Seçenek 3
D) Seçenek 4
E) Seçenek 5

Sonunda cevap anahtarını "Answer Key:" başlığı altında ver:
1. C
2. A
3. B
4. D
5. E`;
            } else {
                prompt = `YDS sınavına uygun, "${topic}" konusunda orta-ileri seviye İngilizce bir okuma parçası oluştur. Paragraf 200-250 kelime olmalı. 

Ardından 5 adet çoktan seçmeli soru (A, B, C, D, E seçenekleri ile) ekle. Sorular paragrafın ana fikrini, detayları ve çıkarımları test etmeli. 

Format şu şekilde olmalı:
1. Soru metni
A) Seçenek 1
B) Seçenek 2
C) Seçenek 3
D) Seçenek 4
E) Seçenek 5

Sonunda cevap anahtarını "Answer Key:" başlığı altında ver:
1. C
2. A
3. B
4. D
5. E`;
            }
        } else if (examType === 'YÖKDİL') {
            const categoryMap = {
                'fen': 'Fen Bilimleri (Matematik, Fizik, Kimya, Biyoloji)',
                'saglik': 'Sağlık Bilimleri (Tıp, Diş Hekimliği, Eczacılık)',
                'sosyal': 'Sosyal Bilimler (Tarih, Coğrafya, Felsefe, Sosyoloji)'
            };
            
            if (isRandom) {
                prompt = `YÖKDİL sınavına uygun, ${categoryMap[category]} alanında akademik seviye İngilizce bir okuma parçası oluştur. Paragraf 250-300 kelime olmalı ve bu alanın güncel konularından biri hakkında olmalı. 

Ardından 5 adet çoktan seçmeli soru (A, B, C, D, E seçenekleri ile) ekle. Sorular akademik okuma becerisini test etmeli. 

Format şu şekilde olmalı:
1. Soru metni
A) Seçenek 1
B) Seçenek 2
C) Seçenek 3
D) Seçenek 4
E) Seçenek 5

Sonunda cevap anahtarını "Answer Key:" başlığı altında ver:
1. C
2. A
3. B
4. D
5. E`;
            } else {
                prompt = `YÖKDİL sınavına uygun, ${categoryMap[category]} alanında "${topic}" konusunda akademik seviye İngilizce bir okuma parçası oluştur. Paragraf 250-300 kelime olmalı. 

Ardından 5 adet çoktan seçmeli soru (A, B, C, D, E seçenekleri ile) ekle. Sorular akademik okuma becerisini test etmeli. 

Format şu şekilde olmalı:
1. Soru metni
A) Seçenek 1
B) Seçenek 2
C) Seçenek 3
D) Seçenek 4
E) Seçenek 5

Sonunda cevap anahtarını "Answer Key:" başlığı altında ver:
1. C
2. A
3. B
4. D
5. E`;
            }
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            const data = await response.json();
            const generatedText = data.candidates[0].content.parts[0].text;
            
            // Split passage and questions more carefully
            const questionStartIndex = generatedText.search(/\n\s*1\.\s/);
            
            if (questionStartIndex !== -1) {
                const passage = cleanText(generatedText.substring(0, questionStartIndex));
                const questionsText = generatedText.substring(questionStartIndex);
                
                setGeneratedPassage(passage);
                const questions = parseQuestions(questionsText);
                setParsedQuestions(questions);
            } else {
                // Fallback: try to find questions section
                const parts = generatedText.split(/(?=Questions:|1\.)/);
                const passage = cleanText(parts[0]);
                const questionsText = parts.slice(1).join('\n');
                
                setGeneratedPassage(passage);
                const questions = parseQuestions(questionsText);
                setParsedQuestions(questions);
            }
            
            setUserAnswers({});
            setShowResults(false);
            setCurrentStep('practiceMode');
            
            // Save practice start progress
            if (saveProgress) {
                saveProgress({
                    type: 'reading_practice_started',
                    exam: examType,
                    category: category,
                    topic: topic || 'Rastgele',
                    timestamp: new Date().toISOString(),
                    passageLength: generatedText.length,
                    questionCount: 5
                });
            }
        } catch (error) {
            console.error('Error generating passage:', error);
            alert('Paragraf oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnswerSelect = (questionNumber, selectedOption) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionNumber]: selectedOption
        }));
    };

    const submitAnswers = () => {
        setEndTime(new Date());
        setShowResults(true);
        
        // Calculate detailed results
        let correct = 0;
        const questionResults = [];
        
        parsedQuestions.forEach(question => {
            const isCorrect = userAnswers[question.number] === correctAnswers[question.number];
            if (isCorrect) correct++;
            
            questionResults.push({
                questionNumber: question.number,
                userAnswer: userAnswers[question.number] || 'Boş',
                correctAnswer: correctAnswers[question.number],
                isCorrect: isCorrect,
                question: question.question
            });
        });
        
        const score = correct;
        const total = parsedQuestions.length;
        const percentage = (score / total) * 100;
        const timeSpent = startTime ? Math.round((new Date() - startTime) / 1000) : 0;
        
        // Save detailed progress
        if (saveProgress) {
            // Update reading progress
            const currentReading = userProgress?.reading || { correct: 0, total: 0 };
            const updatedReading = {
                correct: currentReading.correct + score,
                total: currentReading.total + total
            };
            
            // Save quiz completion
            saveProgress({
                type: 'reading_practice_completed',
                exam: selectedExam,
                category: selectedCategory,
                topic: selectedTopic || 'Rastgele',
                score: score,
                total: total,
                percentage: percentage,
                timeSpent: timeSpent,
                questionResults: questionResults,
                timestamp: new Date().toISOString(),
                reading: updatedReading
            });
            
            // Add to activities
            saveProgress({
                type: 'activity',
                text: `${selectedExam} okuma alıştırması tamamlandı (${score}/${total} doğru)`,
                timestamp: new Date()
            });
        }
    };

    const resetToStart = () => {
        setCurrentStep('examSelection');
        setSelectedExam('');
        setSelectedCategory('');
        setSelectedTopic('');
        setGeneratedPassage('');
        setParsedQuestions([]);
        setUserAnswers({});
        setShowResults(false);
        setCorrectAnswers({});
        setStartTime(null);
        setEndTime(null);
    };

    const goBack = () => {
        if (currentStep === 'categorySelection') {
            setCurrentStep('examSelection');
            setSelectedExam('');
        } else if (currentStep === 'topicSelection') {
            if (selectedExam === 'YÖKDİL') {
                setCurrentStep('categorySelection');
                setSelectedCategory('');
            } else {
                setCurrentStep('examSelection');
                setSelectedExam('');
            }
        } else if (currentStep === 'practiceMode') {
            if (selectedExam === 'YÖKDİL') {
                setCurrentStep('topicSelection');
            } else {
                setCurrentStep('topicSelection');
            }
            setGeneratedPassage('');
            setParsedQuestions([]);
            setUserAnswers({});
            setShowResults(false);
            setCorrectAnswers({});
            setStartTime(null);
            setEndTime(null);
        }
    };

    // Get reading statistics for display
    const getReadingStats = () => {
        const reading = userProgress?.reading || { correct: 0, total: 0 };
        const percentage = reading.total > 0 ? (reading.correct / reading.total * 100).toFixed(1) : 0;
        return { ...reading, percentage };
    };

    if (currentStep === 'examSelection') {
        const stats = getReadingStats();
        const lastTests = getLastTestResults();
        
        return (
            <div className="p-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                    <BookOpen className="mr-3 text-sky-600 dark:text-sky-400" size={32} />
                    Okuduğunu Anlama Alıştırması
                </h2>
                
                {/* Reading Statistics */}
                {stats.total > 0 && (
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-lg mb-6 border border-sky-200 dark:border-slate-600">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
                                    <TrendingUp className="mr-2 text-sky-600 dark:text-sky-400" size={20} />
                                    Okuma Başarınız
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Toplam {stats.total} soruda {stats.correct} doğru cevap
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                                    %{stats.percentage}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    başarı oranı
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Last 5 Test Results */}
                {lastTests.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                            <History className="mr-2 text-purple-600 dark:text-purple-400" size={24} />
                            Son Test Sonuçlarınız
                        </h3>
                        <div className="grid gap-3">
                            {lastTests.map((test, index) => (
                                <div key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-3 h-3 rounded-full ${
                                                test.percentage >= 80 ? 'bg-green-500' :
                                                test.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}></div>
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                                    {test.exam} - {test.topic || 'Rastgele Konu'}
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center space-x-4">
                                                    <span className="flex items-center">
                                                        <Calendar className="mr-1" size={14} />
                                                        {new Date(test.timestamp?.toDate ? test.timestamp.toDate() : test.timestamp)
                                                            .toLocaleDateString('tr-TR', { 
                                                                day: 'numeric', 
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                    </span>
                                                    {test.timeSpent && (
                                                        <span className="flex items-center">
                                                            <Clock className="mr-1" size={14} />
                                                            {Math.floor(test.timeSpent / 60)}:{(test.timeSpent % 60).toString().padStart(2, '0')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-800 dark:text-slate-100">
                                                {test.score}/{test.total}
                                            </div>
                                            <div className={`text-sm font-medium ${
                                                test.percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                                                test.percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 
                                                'text-red-600 dark:text-red-400'
                                            }`}>
                                                %{test.percentage?.toFixed(1) || ((test.score / test.total) * 100).toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="max-w-2xl">
                    <p className="text-slate-600 dark:text-slate-300 mb-8">Hangi sınav türü için alıştırma yapmak istiyorsunuz?</p>
                    
                    <div className="grid gap-4">
                        <button
                            onClick={() => {
                                setSelectedExam('YDS');
                                setCurrentStep('topicSelection');
                            }}
                            className="p-6 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all duration-200 text-left group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">YDS (Yabancı Dil Sınavı)</h3>
                                    <p className="text-slate-600 dark:text-slate-300">Genel İngilizce yeterlilik sınavı için okuma alıştırmaları</p>
                                </div>
                                <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400" size={24} />
                            </div>
                        </button>
                        
                        <button
                            onClick={() => {
                                setSelectedExam('YÖKDİL');
                                setCurrentStep('categorySelection');
                            }}
                            className="p-6 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all duration-200 text-left group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">YÖKDİL</h3>
                                    <p className="text-slate-600 dark:text-slate-300">Akademik alanınıza özel İngilizce okuma alıştırmaları</p>
                                </div>
                                <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400" size={24} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'categorySelection' && selectedExam === 'YÖKDİL') {
        return (
            <div className="p-8 animate-fade-in">
                <div className="flex items-center mb-6">
                    <button onClick={goBack} className="mr-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <ArrowLeft className="text-slate-600 dark:text-slate-300" size={20} />
                    </button>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <BookOpen className="mr-3 text-sky-600 dark:text-sky-400" size={32} />
                        YÖKDİL - Kategori Seçimi
                    </h2>
                </div>
                
                <div className="max-w-2xl">
                    <p className="text-slate-600 dark:text-slate-300 mb-8">Hangi alan için alıştırma yapmak istiyorsunuz?</p>
                    
                    <div className="grid gap-4">
                        {yokdilCategories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => {
                                    setSelectedCategory(category.id);
                                    setCurrentStep('topicSelection');
                                }}
                                className="p-6 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all duration-200 text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{category.name}</h3>
                                        <p className="text-slate-600 dark:text-slate-300">{category.description}</p>
                                    </div>
                                    <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400" size={24} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'topicSelection') {
        return (
            <div className="p-8 animate-fade-in">
                <div className="flex items-center mb-6">
                    <button onClick={goBack} className="mr-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <ArrowLeft className="text-slate-600 dark:text-slate-300" size={20} />
                    </button>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <BookOpen className="mr-3 text-sky-600 dark:text-sky-400" size={32} />
                        {selectedExam} - Konu Seçimi
                    </h2>
                </div>
                
                <div className="max-w-2xl">
                    <p className="text-slate-600 dark:text-slate-300 mb-8">
                        {selectedExam === 'YÖKDİL' 
                            ? `${yokdilCategories.find(c => c.id === selectedCategory)?.name} alanında nasıl bir alıştırma istiyorsunuz?`
                            : 'YDS için nasıl bir alıştırma istiyorsunuz?'
                        }
                    </p>
                    
                    <div className="grid gap-4 mb-6">
                        <button
                            onClick={() => generatePassage(selectedExam, selectedCategory, '', true)}
                            disabled={isGenerating}
                            className="p-6 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Shuffle className="mr-4 text-sky-600 dark:text-sky-400" size={24} />
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Rastgele Konu</h3>
                                        <p className="text-slate-600 dark:text-slate-300">AI tarafından otomatik olarak seçilen konu</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400" size={24} />
                            </div>
                        </button>
                        
                        <div className="p-6 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center mb-4">
                                <Edit3 className="mr-4 text-sky-600 dark:text-sky-400" size={24} />
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Kendi Konunu Belirle</h3>
                            </div>
                            
                            {selectedExam === 'YDS' && (
                                <div className="mb-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Popüler konular:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ydsTopics.map((topic) => (
                                            <button
                                                key={topic}
                                                onClick={() => setSelectedTopic(topic)}
                                                className={`px-3 py-1 text-sm rounded-full border transition-all ${
                                                    selectedTopic === topic
                                                        ? 'bg-sky-500 text-white border-sky-500 dark:bg-sky-600 dark:border-sky-600'
                                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-sky-500 dark:hover:border-sky-400'
                                                }`}
                                            >
                                                {topic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <input
                                type="text"
                                placeholder={selectedExam === 'YDS' ? "Örn: Yapay Zeka ve Gelecek" : "Örn: Kanser Tedavisinde Yeni Yaklaşımlar"}
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 mb-4"
                            />
                            
                            <button
                                onClick={() => generatePassage(selectedExam, selectedCategory, selectedTopic, false)}
                                disabled={!selectedTopic.trim() || isGenerating}
                                className="w-full bg-sky-500 dark:bg-sky-600 text-white py-3 rounded-lg hover:bg-sky-600 dark:hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? 'Oluşturuluyor...' : 'Alıştırma Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'practiceMode') {
        const timeSpent = startTime ? Math.round((new Date() - startTime) / 1000) : 0;
        
        return (
            <div className="p-8 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <button onClick={goBack} className="mr-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                            <ArrowLeft className="text-slate-600 dark:text-slate-300" size={20} />
                        </button>
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <BookOpen className="mr-3 text-sky-600 dark:text-sky-400" size={32} />
                            {selectedExam} Alıştırması
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        {!showResults && startTime && (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Geçen süre: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                            </div>
                        )}
                        <button
                            onClick={resetToStart}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Yeni Alıştırma
                        </button>
                    </div>
                </div>
                
                <div className="max-w-4xl">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Okuma Parçası</h3>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{generatedPassage}</p>
                        </div>
                    </div>
                    
                    {parsedQuestions.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Sorular</h3>
                            
                            <div className="space-y-6">
                                {parsedQuestions.map((question) => (
                                    <div key={question.number} className="border-b border-slate-200 dark:border-slate-600 pb-6 last:border-b-0">
                                        <h4 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-4">
                                            {question.number}. {question.question}
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            {question.options.map((option) => (
                                                <label
                                                    key={option.letter}
                                                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                        showResults
                                                            ? correctAnswers[question.number] === option.letter
                                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                                : userAnswers[question.number] === option.letter && userAnswers[question.number] !== correctAnswers[question.number]
                                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                                : 'border-slate-200 dark:border-slate-600'
                                                            : userAnswers[question.number] === option.letter
                                                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                                                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${question.number}`}
                                                        value={option.letter}
                                                        checked={userAnswers[question.number] === option.letter}
                                                        onChange={() => handleAnswerSelect(question.number, option.letter)}
                                                        disabled={showResults}
                                                        className="mt-1 mr-3 text-sky-600"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300 mr-2">
                                                            {option.letter})
                                                        </span>
                                                        <span className="text-slate-700 dark:text-slate-300">
                                                            {option.text}
                                                        </span>
                                                    </div>
                                                    {showResults && (
                                                        <div className="ml-2">
                                                            {correctAnswers[question.number] === option.letter && (
                                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                            )}
                                                            {userAnswers[question.number] === option.letter && 
                                                             userAnswers[question.number] !== correctAnswers[question.number] && (
                                                                <XCircle className="w-5 h-5 text-red-500" />
                                                            )}
                                                        </div>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {!showResults && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        onClick={submitAnswers}
                                        disabled={Object.keys(userAnswers).length !== parsedQuestions.length}
                                        className="px-6 py-3 bg-sky-500 dark:bg-sky-600 text-white rounded-lg hover:bg-sky-600 dark:hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cevapları Kontrol Et
                                    </button>
                                </div>
                            )}
                            
                            {showResults && (
                                <div className="mt-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-lg">
                                    <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                                        <TrendingUp className="mr-2 text-sky-600 dark:text-sky-400" size={24} />
                                        Sonuçlar
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                                                {Object.values(userAnswers).filter((answer, index) => 
                                                    answer === correctAnswers[parsedQuestions[index].number]
                                                ).length}/{parsedQuestions.length}
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300">Doğru Cevap</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                %{((Object.values(userAnswers).filter((answer, index) => 
                                                    answer === correctAnswers[parsedQuestions[index].number]
                                                ).length / parsedQuestions.length) * 100).toFixed(1)}
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300">Başarı Oranı</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300">Süre</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <button
                                            onClick={resetToStart}
                                            className="px-6 py-3 bg-sky-500 dark:bg-sky-600 text-white rounded-lg hover:bg-sky-600 dark:hover:bg-sky-700 transition-colors"
                                        >
                                            Yeni Alıştırma Yap
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default ReadingPractice;

