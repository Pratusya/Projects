import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FaCheck,
  FaTimes,
  FaGraduationCap,
  FaRegLightbulb,
  FaChartLine,
  FaClock,
  FaHistory,
  FaTrophy,
} from "react-icons/fa";

const QuizDetails = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, isLoaded: authLoaded } = useAuth();
  const [quiz, setQuiz] = useState(location.state?.quizData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0, attempts: 0 });
  const [latestUserAnswers, setLatestUserAnswers] = useState([]);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to use quiz data from navigation state first if it exists and matches the requested quizId
        if (
          location.state?.quizData &&
          location.state.quizData.id === parseInt(quizId)
        ) {
          setQuiz(location.state.quizData);
          setScore({
            correct: location.state.quizData.highest_score || 0,
            total: location.state.quizData.num_questions,
          });
          // Set latest user answers if they exist in the navigation state
          if (location.state.quizData.attempt_history?.length > 0) {
            setLatestUserAnswers(
              location.state.quizData.attempt_history[0].user_answers || []
            );
          } else {
            setLatestUserAnswers(
              new Array(location.state.quizData.questions.length).fill(null)
            );
          }
          setLoading(false);
          return;
        }

        // Fetch quiz details from the API if no valid state data
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await axios.get(`${API_URL}/api/quizzes/${quizId}`, {
          headers: {
            "Content-Type": "application/json",
            "user-id": userId,
            username: userId,
          },
          timeout: 8000, // Increased timeout for slower connections
          validateStatus: function (status) {
            return status < 500;
          },
        }); // Handle various response statuses
        if (response.status === 404) {
          setError("Quiz not found");
          toast.error("Quiz not found");
          return;
        }

        if (!response.data?.status === "success" || !response.data?.quiz) {
          throw new Error("Invalid response format received from server");
        }

        const quizData = response.data.quiz;

        if (
          !Array.isArray(quizData.questions) ||
          quizData.questions.length === 0
        ) {
          throw new Error("Quiz data is missing questions");
        } // Format quiz data
        const formattedQuizData = {
          ...quizData,
          questions: quizData.questions.map((q) => ({
            ...q,
            options:
              q.options ||
              (quizData.question_type === "True/False"
                ? ["True", "False"]
                : []),
            correctAnswer:
              quizData.question_type === "True/False"
                ? typeof q.correctAnswer === "boolean"
                  ? q.correctAnswer
                    ? 0
                    : 1
                  : q.correctAnswer
                : q.correctAnswer,
          })),
        };

        // Set the quiz data
        setQuiz(formattedQuizData);

        // Set score information
        setScore({
          correct: formattedQuizData.highest_score || 0,
          total:
            formattedQuizData.num_questions ||
            formattedQuizData.questions.length,
        });

        // Set latest user answers from the most recent attempt if available
        if (formattedQuizData.attempt_history?.length > 0) {
          const latestAttempt = formattedQuizData.attempt_history[0];
          setLatestUserAnswers(
            Array.isArray(latestAttempt.user_answers)
              ? latestAttempt.user_answers
              : new Array(formattedQuizData.questions.length).fill(null)
          );
        } else {
          setLatestUserAnswers(new Array(quizData.questions.length).fill(null));
        }
      } catch (error) {
        console.error("Error fetching quiz details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          quizId: quizId,
        }); // Handle different types of errors with appropriate messages
        let errorMessage;
        if (error.response) {
          // Server responded with error
          errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            (error.response.status === 404
              ? "Quiz not found"
              : "Server error occurred");
        } else if (error.request) {
          // Request was made but no response
          errorMessage =
            "Could not reach the server. Please check your connection.";
        } else {
          // Error in request setup
          errorMessage =
            error.message ||
            "Failed to load quiz details. Please try again later.";
        }

        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a quizId and userId
    if (quizId && userId) {
      fetchQuizDetails();
    } else if (!userId) {
      setError("Please sign in to view quiz details");
      setLoading(false);
    }
  }, [quizId, userId, location.state]);

  const retryFetch = () => {
    setRetrying(true);
    setError(null);
    setLoading(true);
    fetchQuizDetails().finally(() => setRetrying(false));
  };

  // Handle unauthorized access
  if (!authLoaded) {
    return <LoadingSpinner />;
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl font-semibold mb-4 text-center">
          Please sign in to view quiz details
        </p>
        <Button onClick={() => navigate("/")}>Go to Home</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl font-semibold text-red-600 mb-4 text-center">
          {error}
        </p>
        <div className="flex gap-4">
          <Button onClick={retryFetch} disabled={retrying}>
            {retrying ? "Retrying..." : "Try Again"}
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-xl font-semibold mb-4 text-center">
          {quiz ? "Quiz has no questions" : "Quiz not found"}
        </p>
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  // Ensure all questions have options array
  const questions = quiz.questions.map((question) => ({
    ...question,
    options:
      question.options ||
      (question.question_type === "True/False" ? ["True", "False"] : []),
  }));

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 space-y-8">
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            {quiz.topic}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Created {new Date(quiz.created_at).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center text-lg bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <FaGraduationCap className="mr-3 text-blue-500" />
                <span className="font-semibold">Difficulty:</span>
                <span className="ml-2">{quiz.difficulty}</span>
              </div>
              <div className="flex items-center text-lg bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <FaRegLightbulb className="mr-3 text-yellow-500" />
                <span className="font-semibold">Quiz Type:</span>
                <span className="ml-2">{quiz.question_type}</span>
              </div>
              <div className="flex items-center text-lg bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <FaChartLine className="mr-3 text-green-500" />
                <span className="font-semibold">Questions:</span>
                <span className="ml-2">{quiz.num_questions}</span>
              </div>
              <div className="flex items-center text-lg bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <FaHistory className="mr-3 text-purple-500" />
                <span className="font-semibold">Total Attempts:</span>
                <span className="ml-2">
                  {quiz.attempt_history?.length || 0}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-6">
              <div className="text-center">
                <FaTrophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-3xl font-bold mb-2">
                  Highest Score: {score.correct} / {score.total}
                </div>
                <Progress
                  value={(score.correct / score.total) * 100}
                  className="w-full h-3 rounded-lg"
                />
              </div>

              {quiz.attempt_history?.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-2 text-center">
                    Recent Performance
                  </h4>
                  <div className="text-sm text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Average Score:{" "}
                      {Math.round(
                        quiz.attempt_history.reduce(
                          (sum, attempt) =>
                            sum + (attempt.score / quiz.num_questions) * 100,
                          0
                        ) / quiz.attempt_history.length
                      )}
                      %
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Last Attempt:{" "}
                      {new Date(
                        quiz.attempt_history[0].attempt_date
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>{" "}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Question Details</h3>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {questions.map((question, index) => (
            <AccordionItem
              key={index}
              value={`question-${index}`}
              className="border rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 mr-3">
                    {index + 1}
                  </span>
                  <span className="text-left">{question.question}</span>
                </div>
              </AccordionTrigger>              <AccordionContent className="px-6 py-4">
                <div className="space-y-3">
                {(() => {
                  const userAnswerExists = latestUserAnswers[index] !== null;
                  return question.options.map((option, optionIndex) => {
                    const isCorrect = optionIndex === question.correctAnswer;
                    const isUserAnswer = latestUserAnswers[index] === optionIndex;
                      let styles = {
                      container: "flex items-center p-4 rounded-lg transition-all",
                      bg: "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600",
                      text: "text-gray-700 dark:text-gray-300",
                      icon: null,
                      badge: null,
                      hover: "hover:shadow-md"
                    };

                    // Case 1: User has answered this question
                    if (userAnswerExists) {                      // When this is the option the user selected
                      if (isUserAnswer) {
                        if (isCorrect) {
                          // User selected correct answer
                          styles.bg = "bg-green-50 dark:bg-green-900/30 border-2 border-green-500";
                          styles.text = "text-green-700 dark:text-green-300 font-semibold";
                          styles.icon = <FaCheck className="mr-3 text-green-600 dark:text-green-400" />;
                          styles.badge = (
                            <div className="flex items-center">
                              <span className="ml-2 text-sm px-2 py-1 bg-green-100 dark:bg-green-800 rounded-full font-medium">
                                Correct ✓
                              </span>
                              <span className="ml-2 text-sm px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full">
                                Your Answer
                              </span>
                            </div>
                          );
                        } else {
                          // User selected wrong answer
                          styles.bg = "bg-red-50 dark:bg-red-900/30 border-2 border-red-500";
                          styles.text = "text-red-700 dark:text-red-300 font-semibold";
                          styles.icon = <FaTimes className="mr-3 text-red-600 dark:text-red-400" />;
                          styles.badge = (
                            <div className="flex items-center">
                              <span className="ml-2 text-sm px-2 py-1 bg-red-100 dark:bg-red-800 rounded-full font-medium">
                                Incorrect ✗
                              </span>
                              <span className="ml-2 text-sm px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full">
                                Your Answer
                              </span>
                            </div>
                          );
                        }
                      } 
                      // When this is the correct answer but not what user selected
                      else if (isCorrect && userAnswerExists) {
                        styles.bg = "bg-green-50 dark:bg-green-900/30 border-2 border-green-500";
                        styles.text = "text-green-700 dark:text-green-300 font-semibold";
                        styles.icon = <FaCheck className="mr-3 text-green-600 dark:text-green-400" />;
                        styles.badge = (
                          <div className="flex items-center">
                            <span className="ml-2 text-sm px-2 py-1 bg-green-100 dark:bg-green-800 rounded-full font-medium">
                              Correct Answer
                            </span>
                          </div>
                        );
                      }
                    }                    // Case 2: Question hasn't been answered yet but this is the correct answer
                    else if (isCorrect && !userAnswerExists) {
                      styles.bg = "bg-gray-100 dark:bg-gray-800";
                      styles.text = "text-gray-700 dark:text-gray-300";
                      styles.badge = (
                        <span className="ml-2 text-sm px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                          Answer
                        </span>
                      );
                    }
                    // Case 3: Neither user's answer nor correct answer
                    else if (userAnswerExists) {
                      styles.bg = "bg-gray-50 dark:bg-gray-700";
                      styles.text = "text-gray-500 dark:text-gray-400";
                    }
                    
                    return (
                      <div
                        key={optionIndex}
                        className={`${styles.container} ${styles.bg}`}
                        role="listitem"
                        aria-label={`Option ${optionIndex + 1}${
                          isCorrect ? " (Correct Answer)" : ""
                        }${isUserAnswer ? " (Your Answer)" : ""}`}
                      >
                        {styles.icon || <div className="w-5 h-5 mr-3" />}
                        <span className={`${styles.text} flex-grow`}>
                          {option}
                        </span>
                        {styles.badge}
                      </div>
                    );
                  });
                })()}
                
                {latestUserAnswers[index] !== null && (
                    <div className="mt-6 space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">
                          Explanation
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {question.explanation}
                        </p>
                      </div>
                      
                      {latestUserAnswers[index] !== question.correctAnswer && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <h4 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">
                            Learning Tip
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300">
                            Review the explanation carefully and try to understand why the correct answer is "{question.options[question.correctAnswer]}". 
                            This will help you improve your understanding of the topic.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="mt-8 flex justify-center gap-4">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="px-6 py-2 text-lg"
        >
          Back to Results
        </Button>
        <Button
          onClick={() => navigate("/generate-quiz")}
          className="px-6 py-2 text-lg"
        >
          Create New Quiz
        </Button>
      </div>
    </div>
  );
};

export default QuizDetails;
