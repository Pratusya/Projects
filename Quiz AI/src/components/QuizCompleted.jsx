// QuizCompleted.jsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";

function QuizCompleted() {
  const navigate = useNavigate();
  const score = localStorage.getItem("quizScore");
  const total = localStorage.getItem("quizTotal");

  useEffect(() => {
    // Trigger confetti animation
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        // Redirect to results page after confetti animation
        navigate("/results");
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary-100 to-primary-200 dark:from-gray-800 dark:to-gray-900"
    >
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold mb-4 text-primary-600 dark:text-primary-400">
          Quiz Completed!
        </h1>
        <p className="text-xl mb-6 text-gray-600 dark:text-gray-300">
          Congratulations on finishing the quiz!
        </p>
        <div className="text-3xl font-bold mb-8 text-primary-500 dark:text-primary-300">
          Your Score: {score} / {total}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to full results...
        </p>
      </div>
    </motion.div>
  );
}

export default QuizCompleted;
