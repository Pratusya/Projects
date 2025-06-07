// Navbar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { ModeToggle } from "./ModeToggle";
import { Menu, X } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isSignedIn } = useAuth();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/generate-quiz", label: "Generate Quiz" },
    { path: "/results", label: "Results" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <nav className="bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary">AI Quiz</span>
            </Link>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                current={location.pathname === item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="hidden md:flex md:items-center md:space-x-4">
            <ModeToggle />
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Sign Up</Button>
                </SignUpButton>
              </>
            )}
          </div>
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`md:hidden ${isMenuOpen ? "block" : "hidden"}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
            <MobileNavLink
              key={item.path}
              to={item.path}
              current={location.pathname === item.path}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </MobileNavLink>
          ))}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4">
            <ModeToggle />
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div className="flex space-x-2">
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Sign Up</Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, current, children }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
        current
          ? "border-primary text-primary"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, current, onClick, children }) {
  return (
    <Link
      to={to}
      className={`block px-3 py-2 rounded-md text-base font-medium ${
        current
          ? "bg-primary text-white"
          : "text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
      }`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export default Navbar;
