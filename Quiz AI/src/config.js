// Fix the double slash issue in API URL
export const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://quizbackend-two.vercel.app/api"
    : "http://localhost:5000/api";

export const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
};
