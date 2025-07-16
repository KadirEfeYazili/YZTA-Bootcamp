import React, { useState } from "react";
import questions from "../data/questions.json";

export default function QuestionTest() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [explanation, setExplanation] = useState("");

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = async (option) => {
    setSelectedOption(option);
    const correct = option === currentQuestion.answer;
    setIsCorrect(correct);

    if (!correct) {
      const prompt = `Soru: ${currentQuestion.question}\nYanlış cevap: ${option}\nDoğru cevap: ${currentQuestion.answer}\nKısa bir açıklama ver.`;
      const explanationText = await fetchExplanation(prompt);
      setExplanation(explanationText);
    } else {
      setExplanation("");
    }
  };

  const fetchExplanation = async (prompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // .env dosyasına koy!
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Açıklama alınamadı.";
  };

  const handleNext = () => {
    setSelectedOption("");
    setIsCorrect(null);
    setExplanation("");
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.question}>{currentQuestion.question}</h2>
      <ul style={styles.options}>
        {currentQuestion.options.map((option) => (
          <li
            key={option}
            onClick={() => handleOptionClick(option)}
            style={{
              ...styles.option,
              backgroundColor:
                selectedOption === option
                  ? option === currentQuestion.answer
                    ? "#4CAF50"
                    : "#F44336"
                  : "#f0f0f0",
              color: selectedOption === option ? "#fff" : "#333",
              cursor: selectedOption ? "default" : "pointer",
            }}
          >
            {option}
          </li>
        ))}
      </ul>

      {isCorrect === false && (
        <div style={styles.explanation}>
          <strong>Açıklama:</strong> {explanation}
        </div>
      )}

      {selectedOption && (
        <button onClick={handleNext} style={styles.button}>
          Next
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "40px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
  },
  question: {
    fontSize: "20px",
    marginBottom: "20px",
  },
  options: {
    listStyle: "none",
    padding: 0,
  },
  option: {
    padding: "12px 20px",
    margin: "10px 0",
    borderRadius: "5px",
    border: "1px solid #ccc",
    transition: "0.3s",
  },
  explanation: {
    marginTop: "20px",
    background: "#f9f9f9",
    padding: "15px",
    borderRadius: "5px",
    border: "1px solid #ddd",
  },
  button: {
    marginTop: "20px",
    padding: "10px 20px",
    background: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
