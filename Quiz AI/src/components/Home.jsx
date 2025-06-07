// Home.jsx

import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ArrowRight, Brain, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, SignInButton } from "@clerk/clerk-react";

function Home() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-8">
          AI-Powered Quiz Generator
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
          Create custom quizzes on any topic in seconds. Perfect for educators,
          students, and curious minds.
        </p>
        {isSignedIn ? (
          <Button
            onClick={() => navigate("/generate-quiz")}
            size="lg"
            className="text-lg px-8 py-4"
          >
            Get Started
            <ArrowRight className="ml-2" />
          </Button>
        ) : (
          <SignInButton mode="modal">
            <Button size="lg" className="text-lg px-8 py-4">
              Sign In to Get Started
              <ArrowRight className="ml-2" />
            </Button>
          </SignInButton>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12"
      >
        <FeatureCard
          icon={<Brain className="w-12 h-12 text-primary" />}
          title="AI-Powered"
          description="Utilizes advanced AI to generate diverse and engaging questions."
        />
        <FeatureCard
          icon={<Zap className="w-12 h-12 text-primary" />}
          title="Instant Creation"
          description="Generate quizzes in seconds, saving you time and effort."
        />
        <FeatureCard
          icon={<Users className="w-12 h-12 text-primary" />}
          title="For Everyone"
          description="Suitable for educators, students, and anyone looking to learn or teach."
        />
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

export default Home;
