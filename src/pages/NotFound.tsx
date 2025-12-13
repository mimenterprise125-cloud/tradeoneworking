import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthUrl, setIsAuthUrl] = useState(false);

  useEffect(() => {
    // Only check if this is an auth callback URL with actual tokens
    // Don't redirect normal 404s to auth callback
    const hash = window.location.hash;
    const search = window.location.search;
    const fullUrl = hash + search;

    // Only match URLs with actual auth tokens (not just route names)
    const hasActualAuthTokens = 
      fullUrl.includes('access_token=') ||
      fullUrl.includes('refresh_token=') ||
      fullUrl.includes('token_type=') ||
      fullUrl.includes('type=recovery') ||
      fullUrl.includes('type=signup') ||
      fullUrl.includes('type=invite') ||
      fullUrl.includes('type=magiclink') ||
      fullUrl.includes('type=email_change') ||
      search.includes('token=') ||
      search.includes('code=');

    if (hasActualAuthTokens) {
      setIsAuthUrl(true);
      // Redirect to auth callback
      setTimeout(() => {
        navigate('/auth/callback', { replace: true });
      }, 100);
    }
    // Don't log errors for normal 404s - this clutters the console
  }, [navigate]);

  // Show loading screen if this is an auth URL
  if (isAuthUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <Loader className="w-16 h-16 animate-spin text-cyan-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Processing...</h2>
          <p className="text-gray-600">Redirecting to verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
