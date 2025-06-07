import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  FaTrophy,
  FaClock,
  FaChartLine,
  FaGraduationCap,
  FaRegLightbulb,
  FaEye,
  FaFireAlt,
  FaMedal,
  FaChartBar,
  FaRedo,
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEFAULT_STATS = {
  overall: {
    total_quizzes_taken: 0,
    total_attempts: 0,
    difficulty_levels_attempted: "",
    topics_attempted: "",
    average_score: 0,
    highest_score: 0,
    first_attempt: null,
    last_attempt: null,
  },
  monthly_progress: [],
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Quiz Results Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center mt-8 p-4">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Something went wrong
          </h2>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <FaRedo className="mr-2" /> Refresh Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="space-y-8 max-w-4xl mx-auto mt-8 px-4">
    <Skeleton className="h-8 w-64 mx-auto" />
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-24 mt-6" />
      </CardContent>
    </Card>
    {[1, 2].map((i) => (
      <Skeleton key={i} className="h-64" />
    ))}
  </div>
);

// Custom hook for data fetching
const useQuizData = (userId, authLoaded) => {
  const [state, setState] = useState({
    results: [],
    statistics: JSON.parse(JSON.stringify(DEFAULT_STATS)),
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (!authLoaded || !userId) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const headers = {
          "Content-Type": "application/json",
          "user-id": userId,
          username: userId,
        };

        // Fetch both quizzes and statistics in parallel
        const [quizzesResponse, statsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/quizzes`, {
            headers,
            signal: controller.signal,
            params: {
              limit: 10,
              page: 1,
              sort: "created_at:desc", // Keep sorting for newest first
            },
          }),
          axios.get(`${API_BASE_URL}/api/statistics`, {
            headers,
            signal: controller.signal,
          }),
        ]);

        // Validate responses
        if (
          quizzesResponse.data?.status !== "success" ||
          !Array.isArray(quizzesResponse.data?.quizzes)
        ) {
          throw new Error("Invalid quiz data received from server");
        }

        if (
          statsResponse.data?.status !== "success" ||
          !statsResponse.data?.statistics?.overall
        ) {
          throw new Error("Invalid statistics data received from server");
        } // Process and validate quiz data
        const processedQuizzes = quizzesResponse.data.quizzes.map((quiz) => ({
          ...quiz,
          created_at: new Date(quiz.created_at),
          highest_score: Number(quiz.highest_score),
          attempts_count: Number(quiz.attempts_count || 0),
          num_questions: Number(quiz.num_questions),
        }));

        // Process and validate statistics
        const processedStats = {
          ...statsResponse.data.statistics,
          overall: {
            ...statsResponse.data.statistics.overall,
            total_quizzes_taken: Number(
              statsResponse.data.statistics.overall.total_quizzes_taken
            ),
            total_attempts: Number(
              statsResponse.data.statistics.overall.total_attempts
            ),
            average_score: Number(
              statsResponse.data.statistics.overall.average_score
            ),
            highest_score: Number(
              statsResponse.data.statistics.overall.highest_score
            ),
            first_attempt: statsResponse.data.statistics.overall.first_attempt
              ? new Date(statsResponse.data.statistics.overall.first_attempt)
              : null,
            last_attempt: statsResponse.data.statistics.overall.last_attempt
              ? new Date(statsResponse.data.statistics.overall.last_attempt)
              : null,
          },
        };

        setState({
          results: processedQuizzes,
          statistics: processedStats,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request cancelled");
          return;
        }
        console.error("Error fetching data:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to load quiz results and statistics";

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          statistics: DEFAULT_STATS,
        }));

        toast.error(errorMessage, {
          duration: 4000,
          position: "top-center",
        });
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [userId, authLoaded]);

  return state;
};

const QuizResults = () => {
  const { userId, isLoaded: authLoaded } = useAuth();
  const navigate = useNavigate();
  const { results, statistics, loading, error } = useQuizData(
    userId,
    authLoaded
  );

  const getGradeColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return "text-green-500 dark:text-green-400";
    if (percentage >= 80) return "text-blue-500 dark:text-blue-400";
    if (percentage >= 70) return "text-yellow-500 dark:text-yellow-400";
    if (percentage >= 60) return "text-orange-500 dark:text-orange-400";
    return "text-red-500 dark:text-red-400";
  };

  const formatLearningJourney = useMemo(() => {
    if (!statistics?.overall)
      return { topics: "None yet", difficulties: "None yet" };

    return {
      topics: statistics.overall.topics_attempted || "None yet",
      difficulties:
        statistics.overall.difficulty_levels_attempted || "None yet",
    };
  }, [statistics]);

  const getValidScore = (score) => {
    return typeof score === "number" && !isNaN(score) ? score : 0;
  };

  if (!authLoaded || loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center mt-8 p-4">
        <p className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
          {error}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-600"
        >
          <FaRedo className="mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center mt-8 p-4">
        <p className="text-xl font-semibold mb-4">No quiz results found.</p>
        <Button
          onClick={() => navigate("/generate-quiz")}
          className="bg-blue-500 hover:bg-blue-600"
        >
          Take Your First Quiz
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-4xl mx-auto mt-8 px-4">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Quiz Performance Dashboard
        </h2>

        <Card className="shadow-lg dark:shadow-none">
          <CardHeader>
            <h3 className="text-2xl font-semibold">Performance Overview</h3>
          </CardHeader>
          <CardContent>
            {" "}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FaFireAlt className="text-3xl text-blue-500 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {statistics?.overall?.total_quizzes_taken || 0}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Total Quizzes
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FaMedal className="text-3xl text-green-500 dark:text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {statistics?.overall?.total_attempts || 0}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Practice Sessions
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <FaChartBar className="text-3xl text-purple-500 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold">
                  {statistics?.overall?.topics_attempted
                    ?.split(",")
                    .filter(Boolean).length || 0}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Topics Mastered
                </p>
              </div>
            </div>{" "}
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaClock className="text-blue-500 dark:text-blue-400 mr-2" />
                  <div>
                    <p className="font-medium">First Quiz</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {statistics?.overall?.first_attempt
                        ? new Date(
                            statistics.overall.first_attempt
                          ).toLocaleDateString()
                        : "No attempts yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FaClock className="text-green-500 dark:text-green-400 mr-2" />
                  <div>
                    <p className="font-medium">Latest Quiz</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {statistics?.overall?.last_attempt
                        ? new Date(
                            statistics?.overall?.last_attempt
                          ).toLocaleDateString()
                        : "No attempts yet"}
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-lg mb-2">Learning Journey</h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm font-medium">
                  Topics Explored: {formatLearningJourney.topics}
                </p>
                <p className="text-sm font-medium mt-2">
                  Difficulty Progression: {formatLearningJourney.difficulties}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-2xl font-semibold mb-4">Recent Quiz Results</h3>
          <div className="space-y-4">
            {results.map((result) => (
              <Card
                key={result.id}
                className="shadow-lg hover:shadow-xl dark:shadow-none dark:hover:bg-gray-800/50 transition-all duration-300"
              >
                <CardHeader>
                  <h3 className="text-2xl font-semibold flex items-center">
                    <FaTrophy className="mr-2 text-yellow-500 dark:text-yellow-400" />
                    {result.topic}
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-lg flex items-center">
                        <FaGraduationCap className="mr-2 text-primary" />
                        <span className="font-semibold">Difficulty:</span>{" "}
                        {result.difficulty}
                      </p>
                      <p className="text-lg flex items-center">
                        <FaRegLightbulb className="mr-2 text-primary" />
                        <span className="font-semibold">Quiz Type:</span>{" "}
                        {result.question_type}
                      </p>
                      <p className="text-lg flex items-center">
                        <FaChartLine className="mr-2 text-primary" />
                        <span className="font-semibold">Questions:</span>{" "}
                        {result.num_questions}
                      </p>
                    </div>
                    <div>
                      <p
                        className={`text-2xl font-bold ${getGradeColor(
                          getValidScore(result.highest_score),
                          result.num_questions
                        )}`}
                      >
                        Best Score: {getValidScore(result.highest_score)} /{" "}
                        {result.num_questions}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center mt-4">
                        <FaClock className="mr-2" />
                        Completed {result.attempts_count || 0}{" "}
                        {result.attempts_count === 1 ? "time" : "times"}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {" "}
                  <Button
                    onClick={async () => {
                      try {
                        const response = await axios.get(
                          `${API_BASE_URL}/api/quizzes/${result.id}`,
                          {
                            headers: {
                              "Content-Type": "application/json",
                              "user-id": userId,
                              username: userId,
                            },
                          }
                        );

                        if (
                          response.data?.status === "success" &&
                          response.data?.quiz
                        ) {
                          // Ensure the quiz data is properly formatted
                          const formattedQuiz = {
                            ...response.data.quiz,
                            questions: response.data.quiz.questions.map(
                              (q) => ({
                                ...q,
                                options:
                                  q.options ||
                                  (q.question_type === "True/False"
                                    ? ["True", "False"]
                                    : []),
                              })
                            ),
                          };
                          navigate(`/quiz-details/${result.id}`, {
                            state: { quizData: formattedQuiz },
                          });
                        } else {
                          throw new Error("Failed to fetch quiz details");
                        }
                      } catch (error) {
                        toast.error(
                          "Failed to load quiz details. Please try again."
                        );
                        console.error("Error fetching quiz details:", error);
                      }
                    }}
                    className="w-full sm:w-auto"
                  >
                    <FaEye className="mr-2" />
                    View Details
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created: {new Date(result.created_at).toLocaleDateString()}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default QuizResults;
