import { useState, useEffect } from "react";
import { getMe, login as apiLogin, register as apiRegister } from "@/lib/api";

export function useAuth() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((data) => setEmployee(data.employee))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiLogin({ email, password });
    localStorage.setItem("token", data.token);
    setEmployee(data.employee);
    return data;
  }

  async function register(name, email, password, jobTitle) {
    const data = await apiRegister({ name, email, password, jobTitle });
    localStorage.setItem("token", data.token);
    setEmployee(data.employee);
    return data;
  }

  function logout() {
    localStorage.removeItem("token");
    setEmployee(null);
  }

  return {
    employee,
    loading,
    login,
    register,
    logout,
    isAdmin: employee?.role === "admin",
  };
}
