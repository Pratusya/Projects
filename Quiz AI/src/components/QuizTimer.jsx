import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";

const QuizTimer = ({ duration, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 60) setIsWarning(true);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-between font-mono text-lg
        ${isWarning ? "text-red-500 animate-pulse" : ""}`}
      >
        <span className="flex items-center gap-2">
          {isWarning && <AlertCircle className="h-5 w-5" />}
          Time Remaining
        </span>
        <span>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

export default QuizTimer;
