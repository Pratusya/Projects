// src/components/QuizSkeleton.jsx

import React from "react";

function QuizSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="bg-gray-200 dark:bg-gray-700 p-4 rounded-lg"
        >
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, optionIndex) => (
              <div
                key={optionIndex}
                className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"
              ></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default QuizSkeleton;
