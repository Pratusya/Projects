// src/components/About.jsx

import React from "react";

function About() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h1 className="text-3xl font-bold mb-4">About Us</h1>
      <p className="text-gray-700 dark:text-gray-300">
        Welcome to our Quiz Generator application! We are passionate about
        creating engaging and educational quizzes on a wide range of topics. Our
        AI-powered system allows you to generate custom quizzes tailored to your
        interests and learning goals.
      </p>
      <p className="mt-4 text-gray-700 dark:text-gray-300">
        Whether you're a student looking to test your knowledge, a teacher
        creating materials for your class, or just someone who loves learning,
        our Quiz Generator is here to help. Explore new topics, challenge
        yourself, and have fun while learning!
      </p>
    </div>
  );
}

export default About;
