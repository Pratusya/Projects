import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Loader2, Share2, Download, Redo } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAuth, RedirectToSignIn } from "@clerk/clerk-react";
import {
  WhatsappShareButton,
  FacebookShareButton,
  TwitterShareButton,
  EmailShareButton,
  WhatsappIcon,
  FacebookIcon,
  TwitterIcon,
  EmailIcon,
} from "react-share";
import { API_BASE_URL } from "../config";

// Helper Components
function QuizSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, optionIndex) => (
                <div
                  key={optionIndex}
                  className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"
                ></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const ShareModal = ({ isOpen, onClose, quizUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Share Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="flex justify-around mb-4">
          <WhatsappShareButton url={quizUrl}>
            <WhatsappIcon size={32} round />
          </WhatsappShareButton>
          <FacebookShareButton url={quizUrl}>
            <FacebookIcon size={32} round />
          </FacebookShareButton>
          <TwitterShareButton url={quizUrl}>
            <TwitterIcon size={32} round />
          </TwitterShareButton>
          <EmailShareButton url={quizUrl}>
            <EmailIcon size={32} round />
          </EmailShareButton>
        </div>
        <div className="flex">
          <input
            type="text"
            value={quizUrl}
            readOnly
            className="flex-grow border rounded-l px-2 py-1"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(quizUrl);
              toast.success("Link copied to clipboard!");
            }}
            className="bg-blue-500 text-white px-4 py-1 rounded-r"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Functions
const formatQuizQuestions = (quizData, questionType) => {
  if (!quizData) return [];

  return quizData.map((q) => {
    let formattedQuestion = {
      question: q.question,
      explanation: q.explanation || "",
    };

    if (questionType === "True/False") {
      // Convert boolean answer to index (true = 0, false = 1)
      const boolValue =
        typeof q.correctAnswer === "boolean"
          ? q.correctAnswer
          : String(q.correctAnswer).toLowerCase() === "true" ||
            String(q.correctAnswer) === "1";
      formattedQuestion.correctAnswer = boolValue ? 0 : 1;
      formattedQuestion.options = ["True", "False"];
    } else if (
      questionType === "Fill in the Blanks" ||
      questionType === "MCQ"
    ) {
      // Normalize answer to number
      formattedQuestion.correctAnswer = parseInt(q.correctAnswer, 10);
      if (isNaN(formattedQuestion.correctAnswer)) {
        throw new Error(
          "Invalid answer index for MCQ/Fill in the Blanks question"
        );
      }
      // Ensure all options are strings and array has 4 items
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error("Question must have exactly 4 options");
      }
      formattedQuestion.options = q.options.map((opt) => String(opt));
    }

    return formattedQuestion;
  });
};

function QuizGenerator() {
  const { isSignedIn, userId } = useAuth();
  const navigate = useNavigate();

  // Initialize state from localStorage or default values
  const [topic, setTopic] = useState(
    () => localStorage.getItem("quizTopic") || ""
  );
  const [numQuestions, setNumQuestions] = useState(
    () => parseInt(localStorage.getItem("quizNumQuestions")) || 5
  );
  const [difficulty, setDifficulty] = useState(
    () => localStorage.getItem("quizDifficulty") || "Easy"
  );
  const [questionType, setQuestionType] = useState(
    () => localStorage.getItem("quizQuestionType") || "MCQ"
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("quizLanguage") || "english"
  );
  const [questionLanguage, setQuestionLanguage] = useState(
    () => localStorage.getItem("quizQuestionLanguage") || "english"
  );
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [quizId, setQuizId] = useState(null);
  const [genAI, setGenAI] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    if (!API_KEY) {
      setError("Google AI API key is missing");
      return;
    }
    try {
      const ai = new GoogleGenerativeAI(API_KEY);
      setGenAI(ai);
    } catch (error) {
      setError("Failed to initialize Google AI");
      console.error("AI initialization error:", error);
    }

    // Cleanup function to clear stored configurations
    return () => {
      // Only clear if the component is unmounting, not on every effect cleanup
      if (!document.hidden) {
        localStorage.removeItem("quizTopic");
        localStorage.removeItem("quizNumQuestions");
        localStorage.removeItem("quizDifficulty");
        localStorage.removeItem("quizQuestionType");
        localStorage.removeItem("quizLanguage");
        localStorage.removeItem("quizQuestionLanguage");
      }
    };
  }, []);

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  const constructPrompt = () => {
    let prompt = `Generate a ${difficulty.toLowerCase()} difficulty quiz about ${topic} with ${numQuestions} ${questionType} questions in ${language}. `;

    if (language === "hindi") {
      prompt +=
        "Please provide all questions, options, and explanations in Hindi. Use Devanagari script. ";

      if (questionLanguage === "both") {
        prompt +=
          "Also provide English transliteration in parentheses for each question and option. ";
      }
    }
    switch (questionType) {
      case "MCQ":
        prompt +=
          "Format as JSON array with each question having: 'question' (string), 'options' (array of 4 distinct choices), 'correctAnswer' (number 0-3 indicating correct option index), 'explanation' (string). Example: {'question': 'What is 2+2?', 'options': ['3', '4', '5', '6'], 'correctAnswer': 1, 'explanation': '2+2=4'}";
        break;
      case "True/False":
        prompt +=
          "Format as JSON array with each question having: 'question' (a statement to evaluate), 'correctAnswer' (boolean true/false), 'explanation' (why true/false). Example: {'question': 'The Earth is flat', 'correctAnswer': false, 'explanation': 'The Earth is approximately spherical'}";
        break;
      case "Fill in the Blanks":
        prompt +=
          "Format as JSON array with each question having: 'question' (string with ___ for blank), 'options' (array of 4 possible answers), 'correctAnswer' (number 0-3 indicating correct option index), 'explanation' (string). Example: {'question': 'The capital of France is ___', 'options': ['London', 'Paris', 'Berlin', 'Madrid'], 'correctAnswer': 1, 'explanation': 'Paris is the capital of France'}";
        break;
    }

    return (
      prompt +
      " Return only valid JSON array with no markdown formatting or additional text."
    );
  };

  const cleanResponseText = (text) => {
    return text.replace(/```json\n?|\n?```/g, "").trim();
  };
  const validateAndParseQuizData = (text) => {
    try {
      const data = JSON.parse(text);

      // Validate basic structure
      if (!Array.isArray(data) || data.length !== numQuestions) {
        throw new Error("Invalid quiz format - questions array mismatch");
      } // Validate each question
      data.forEach((question, index) => {
        const questionNum = index + 1;

        // Common validations
        if (
          !question.question ||
          typeof question.question !== "string" ||
          question.question.trim() === ""
        ) {
          throw new Error(
            `Question ${questionNum} is missing or has invalid question text`
          );
        }

        if (
          question.correctAnswer === undefined ||
          question.correctAnswer === null
        ) {
          throw new Error(
            `Question ${questionNum} is missing the correct answer`
          );
        }

        if (!question.explanation || typeof question.explanation !== "string") {
          question.explanation = ""; // Set default empty explanation
        }

        // Type-specific validations
        if (questionType === "True/False") {
          // Clean up question text for True/False
          question.question = question.question.trim();
          if (
            !question.question.endsWith("?") &&
            !question.question.endsWith(".")
          ) {
            question.question += ".";
          } // Normalize answer to numeric index (0 for True, 1 for False)
          const boolValue =
            typeof question.correctAnswer === "boolean"
              ? question.correctAnswer
              : String(question.correctAnswer).toLowerCase() === "true" ||
                String(question.correctAnswer) === "1";
          question.correctAnswer = boolValue ? 0 : 1;

          // Remove options if present
          delete question.options;
        } else {
          // MCQ and Fill in the Blanks validations
          if (!Array.isArray(question.options)) {
            throw new Error(`Question ${questionNum} is missing options array`);
          }

          // Validate options
          if (question.options.length !== 4) {
            throw new Error(
              `Question ${questionNum} must have exactly 4 options`
            );
          }

          // Ensure all options are strings and not empty
          question.options = question.options.map((opt) => String(opt).trim());
          if (question.options.some((opt) => opt === "")) {
            throw new Error(`Question ${questionNum} has empty options`);
          }

          // Check for duplicate options
          const uniqueOptions = new Set(question.options);
          if (uniqueOptions.size !== question.options.length) {
            throw new Error(`Question ${questionNum} has duplicate options`);
          }

          // Specific Fill in the Blanks validation
          if (questionType === "Fill in the Blanks") {
            if (!question.question.includes("___")) {
              throw new Error(
                `Question ${questionNum} must contain ___ to indicate the blank`
              );
            }
            // Ensure only one blank per question
            if ((question.question.match(/___/g) || []).length > 1) {
              throw new Error(
                `Question ${questionNum} should have only one blank (___)`
              );
            }
          }

          // Validate and normalize correct answer index
          const answerIndex = parseInt(question.correctAnswer, 10);
          if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) {
            throw new Error(
              `Question ${questionNum} has invalid correct answer index. Must be 0-3`
            );
          }
          question.correctAnswer = answerIndex;
        }

        // Ensure explanation exists (can be empty string)
        if (!question.explanation && question.explanation !== "") {
          question.explanation = ""; // Set default empty explanation
        }
      });

      return data;
    } catch (error) {
      console.error("Quiz data parsing error:", error);
      return null;
    }
  };
  const handleQuizGenerationError = (error) => {
    console.error("Error generating quiz:", error);
    let errorMessage = "Failed to generate quiz. Please try again.";

    // Add more specific error messages based on error type
    if (error.message.includes("parse")) {
      errorMessage = "Failed to generate valid quiz format. Please try again.";
    } else if (error.message.includes("options")) {
      errorMessage =
        "Failed to generate valid options for questions. Please try again.";
    }

    setError(errorMessage);
    toast.error(errorMessage);
  };
  const saveQuiz = async (quizData) => {
    try {
      const formattedQuestions = formatQuizQuestions(quizData, questionType);
      
      const requestPayload = {
        title: `${topic} Quiz`,
        topic: topic,
        numQuestions: Number(numQuestions),
        difficulty: difficulty,
        questionType: questionType,
        language: language.toLowerCase(),
        questions: formattedQuestions,
      };

      console.log('Saving quiz with payload:', requestPayload);

      const response = await axios.post(
        `${API_BASE_URL}/quizzes`,
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "user-id": userId,
            "username": userId
          },
          withCredentials: true
        }
      );

      if (response.data?.status === "success" && response.data?.quiz?.id) {
        setQuizId(response.data.quiz.id);
        return response.data.quiz.id;
      }
      throw new Error("Failed to save quiz: Invalid response format");
    } catch (error) {
      console.error("Error saving quiz:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(error.response?.data?.message || "Failed to save quiz");
    }
  };
  const generateQuiz = async () => {
    if (!genAI) {
      toast.error("AI service not initialized");
      return;
    }

    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = constructPrompt();

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = cleanResponseText(response.text());

      const quizData = validateAndParseQuizData(text);
      if (!quizData) {
        throw new Error("Failed to parse quiz data");
      }

      setQuiz(quizData);
      // Don't reset user answers when regenerating quiz
      // setUserAnswers({});

      // Save quiz with better error handling
      const savedQuizId = await saveQuiz(quizData);
      if (!savedQuizId) {
        throw new Error("No quiz ID received from server");
      }

      // Save quiz history with proper parameters
      await saveQuizHistory(savedQuizId, prompt, {
        topic: topic,
        difficulty: difficulty,
        numQuestions: numQuestions,
        questionType: questionType,
        language: language,
      });

      toast.success("Quiz generated and saved successfully!");
    } catch (error) {
      console.error("Quiz generation error:", error);
      toast.error(error.message || "Failed to generate quiz");
      setError(error.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };
  const handleAnswerSelect = (questionIndex, answer, questionType) => {
    // For all question types, including True/False, store as numeric indices
    const numericAnswer = parseInt(answer, 10);

    if (!isNaN(numericAnswer)) {
      setUserAnswers((prev) => ({
        ...prev,
        [questionIndex]: numericAnswer,
      }));
    }
  };

  const calculateScore = () => {
    let score = 0;
    quiz.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      // Skip questions that haven't been answered
      if (userAnswer === undefined || userAnswer === null) {
        return;
      }

      // For all question types, compare the selected index with correct answer index
      if (userAnswer === question.correctAnswer) {
        score++;
      }
    });
    return score;
  };
  const submitQuiz = async () => {
    try {
      if (!quizId) {
        toast.error("Quiz ID is missing. Please generate a new quiz.");
        return;
      }

      const rawScore = calculateScore();
      const formattedUserAnswers = quiz.map((question, index) => {
        const userAnswer = userAnswers[index];
        // For all question types, we're using numeric indices
        // True/False: 0=True, 1=False
        // MCQ/Fill in Blanks: 0-3 for options
        const isCorrect = userAnswer === question.correctAnswer;

        return {
          userAnswer: userAnswer,
          isCorrect: isCorrect,
        };
      });

      const quizData = {
        quizId: quizId,
        score: rawScore,
        totalQuestions: quiz.length,
        answers: formattedUserAnswers,
        timeTaken: 0, // TODO: Add timer functionality to track time taken
      };

      const response = await axios.post(
        "http://localhost:5000/api/quiz-results",
        {
          quizId: quizData.quizId,
          score: quizData.score,
          totalQuestions: quizData.totalQuestions,
          userAnswers: quizData.answers.map((answer, index) => ({
            questionIndex: index,
            answer: answer.userAnswer,
            correct: answer.isCorrect,
          })),
          timeTaken: quizData.timeTaken,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "user-id": userId,
            username: userId,
          },
        }
      );
      if (response.data) {
        // Store quiz results
        localStorage.setItem("quizScore", rawScore);
        localStorage.setItem("quizTotal", quiz.length);

        // Clear quiz configurations after successful submission
        localStorage.removeItem("quizTopic");
        localStorage.removeItem("quizNumQuestions");
        localStorage.removeItem("quizDifficulty");
        localStorage.removeItem("quizQuestionType");
        localStorage.removeItem("quizLanguage");
        localStorage.removeItem("quizQuestionLanguage");

        toast.success("Quiz submitted successfully!");
        navigate("/quiz-completed");
      }
    } catch (error) {
      console.error(
        "Error submitting quiz:",
        error.response?.data?.message || error.message
      );
      toast.error("Failed to submit quiz. Please try again.");
    }
  };
  const saveQuizHistory = async (quizId, promptUsed, generationParams) => {
    try {
      // Add validation and default values
      const parameters = {
        topic: generationParams.topic || "General",
        difficulty: generationParams.difficulty || "Medium",
        numQuestions: parseInt(generationParams.numQuestions) || 10,
        questionType: generationParams.questionType || "MCQ",
        language: generationParams.language || "english",
      };

      // Log the data being sent for debugging
      console.log("Saving quiz history with:", {
        quizId,
        promptUsed,
        parameters,
      });

      const response = await axios.post(
        "http://localhost:5000/api/quiz-history",
        {
          quizId: parseInt(quizId),
          promptUsed: promptUsed || "Default prompt",
          generationParameters: parameters,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "user-id": userId,
            username: userId,
          },
        }
      );

      if (!response.data || response.data.status !== "success") {
        console.error("Quiz history save failed:", response.data);
        throw new Error(
          response.data?.message || "Failed to save quiz history"
        );
      }

      return response.data;
    } catch (error) {
      console.error("Error saving quiz history:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error("Failed to save quiz history");
    }
  };

  const exportQuiz = () => {
    const quizData = {
      topic,
      numQuestions,
      difficulty,
      questionType,
      language,
      questionLanguage,
      questions: quiz,
    };
    const blob = new Blob([JSON.stringify(quizData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz_${topic.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Quiz exported successfully!");
  };

  const shareQuiz = () => {
    setIsShareModalOpen(true);
  };
  const retakeQuiz = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all your answers and start over?"
      )
    ) {
      setUserAnswers({});
      toast.success("Answers cleared. You can now retake the quiz!");
    }
  };

  const quizUrl = `${window.location.origin}/take-quiz/${quizId}`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quiz Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic</Label>{" "}
              <Input
                id="topic"
                value={topic}
                onChange={(e) => {
                  const newTopic = e.target.value;
                  setTopic(newTopic);
                  localStorage.setItem("quizTopic", newTopic);
                }}
                placeholder="Enter quiz topic"
              />
            </div>

            {/* Language Selection */}
            <div>
              <Label htmlFor="language">Quiz Language</Label>{" "}
              <Select
                value={language}
                onValueChange={(newValue) => {
                  setLanguage(newValue);
                  localStorage.setItem("quizLanguage", newValue);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select quiz language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Language Format for Hindi quizzes */}
            {language === "hindi" && (
              <div>
                <Label htmlFor="questionLanguage">Question Format</Label>
                <Select
                  value={questionLanguage}
                  onValueChange={(newValue) => {
                    setQuestionLanguage(newValue);
                    localStorage.setItem("quizQuestionLanguage", newValue);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select question format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hindi">Hindi Only</SelectItem>
                    <SelectItem value="both">
                      Hindi with English Transliteration
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Select
                  value={numQuestions.toString()}
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    setNumQuestions(numValue);
                    localStorage.setItem("quizNumQuestions", numValue);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select number of questions" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>{" "}
                <Select
                  value={difficulty}
                  onValueChange={(newValue) => {
                    setDifficulty(newValue);
                    localStorage.setItem("quizDifficulty", newValue);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Easy", "Medium", "Hard"].map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="questionType">Question Type</Label>{" "}
              <Select
                value={questionType}
                onValueChange={(newValue) => {
                  setQuestionType(newValue);
                  localStorage.setItem("quizQuestionType", newValue);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select question type" />
                </SelectTrigger>
                <SelectContent>
                  {["MCQ", "True/False", "Fill in the Blanks"].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={generateQuiz}
            disabled={loading || !topic}
            className="w-full mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Quiz"
            )}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {loading ? (
          <QuizSkeleton />
        ) : quiz ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Generated Quiz</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={exportQuiz} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button onClick={shareQuiz} size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button onClick={retakeQuiz} size="sm">
                    <Redo className="mr-2 h-4 w-4" />
                    Retake
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {quiz.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-lg font-medium text-gray-800 dark:text-white">
                        {index + 1}. {question.question}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {questionType === "MCQ" &&
                        question.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className="flex items-center space-x-3 p-3 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`question-${index}`}
                              value={optionIndex}
                              checked={userAnswers[index] === optionIndex}
                              onChange={() =>
                                handleAnswerSelect(
                                  index,
                                  optionIndex,
                                  questionType
                                )
                              }
                              className="form-radio text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-gray-800 dark:text-gray-200">
                              {option}
                            </span>
                          </label>
                        ))}{" "}
                      {questionType === "True/False" && (
                        <div className="flex space-x-4 justify-center">
                          {[
                            { value: 0, label: "True" },
                            { value: 1, label: "False" },
                          ].map((option) => (
                            <label
                              key={option.label}
                              className={`flex items-center justify-center space-x-3 p-4 rounded-md transition-colors cursor-pointer border-2 min-w-[120px]
                                ${
                                  userAnswers[index] === option.value
                                    ? "bg-primary-100 border-primary-500 dark:bg-primary-900/30"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`question-${index}`}
                                value={option.value}
                                checked={userAnswers[index] === option.value}
                                onChange={() =>
                                  handleAnswerSelect(
                                    index,
                                    option.value,
                                    questionType
                                  )
                                }
                                className="form-radio text-primary-500 focus:ring-primary-500"
                              />
                              <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}{" "}
                      {questionType === "Fill in the Blanks" && (
                        <>
                          <div className="mb-4 text-lg">
                            {question.question
                              .split("___")
                              .map((part, partIndex, parts) => (
                                <React.Fragment key={partIndex}>
                                  <span>{part}</span>
                                  {partIndex < parts.length - 1 && (
                                    <span className="mx-2 px-4 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                                      {userAnswers[index] !== undefined
                                        ? question.options[userAnswers[index]]
                                        : "?"}
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {question.options.map((option, optionIndex) => (
                              <label
                                key={optionIndex}
                                className={`flex items-center space-x-3 p-4 rounded-md transition-colors cursor-pointer border-2
                                  ${
                                    userAnswers[index] === optionIndex
                                      ? "bg-primary-100 border-primary-500 dark:bg-primary-900/30"
                                      : "hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent"
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  value={optionIndex}
                                  checked={userAnswers[index] === optionIndex}
                                  onChange={() =>
                                    handleAnswerSelect(
                                      index,
                                      optionIndex,
                                      questionType
                                    )
                                  }
                                  className="form-radio text-primary-500 focus:ring-primary-500"
                                />
                                <span className="text-gray-800 dark:text-gray-200 text-lg">
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}

                <Button onClick={submitQuiz} className="w-full mt-4">
                  Submit Quiz
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        quizUrl={quizUrl}
      />
    </div>
  );
}

export default QuizGenerator;
