export const checkServerConnection = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/health`);
    if (!response.ok) throw new Error("Server health check failed");
    return true;
  } catch (error) {
    console.error("Server connection check failed:", error);
    return false;
  }
};
