import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Home } from "@/pages/Home";
import { Meeting } from "@/pages/Meeting";
import { Review } from "@/pages/Review";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";

function App() {
  const { employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div
          className="bg-ground h-3 w-24 rounded"
          style={{ animation: "skeletonPulse 1.5s ease infinite" }}
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={employee ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={employee ? <Navigate to="/" replace /> : <Register />}
        />
        <Route
          path="/"
          element={employee ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/meetings/:id"
          element={employee ? <Meeting /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/meetings/:id/review"
          element={employee ? <Review /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
