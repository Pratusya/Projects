// App.jsx
import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import Layout from "./components/Layout";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import { ClerkProvider } from "@clerk/clerk-react";

// Lazy loaded components
const Home = lazy(() => import("./components/Home"));
const QuizGenerator = lazy(() => import("./components/QuizGenerator"));
const About = lazy(() => import("./components/About"));
const Contact = lazy(() => import("./components/Contact"));
const QuizResults = lazy(() => import("./components/QuizResults"));
const QuizCompleted = lazy(() => import("./components/QuizCompleted"));
const QuizDetails = lazy(() => import("./components/QuizDetails"));

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk Publishable Key");
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <Router>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Main routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/generate-quiz" element={<QuizGenerator />} />

                  {/* Quiz related routes */}
                  <Route path="/results" element={<QuizResults />} />
                  <Route path="/quiz-completed" element={<QuizCompleted />} />
                  <Route
                    path="/quiz-details/:quizId"
                    element={<QuizDetails />}
                  />

                  {/* Information routes */}
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />

                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--toast-background)",
                color: "var(--toast-text)",
              },
            }}
          />
        </ThemeProvider>
      </ErrorBoundary>
    </ClerkProvider>
  );
}

// 404 Component
const NotFound = () => (
  <div className="max-w-4xl mx-auto p-6 text-center">
    <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
    <p className="text-muted-foreground">
      The page you are looking for does not exist.
    </p>
  </div>
);

export default App;
