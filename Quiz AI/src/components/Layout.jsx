// src/components/Layout.jsx

import React from "react";
import { useTheme } from "./ThemeProvider";
import Footer from "./Footer";
import Navbar from "./Navbar";

function Layout({ children }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
