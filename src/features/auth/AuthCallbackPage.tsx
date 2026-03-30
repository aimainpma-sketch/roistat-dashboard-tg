import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Подтверждаем доступ...");

  useEffect(() => {
    const finishAuth = async () => {
      if (!supabase) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        setMessage(error.message);
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    void finishAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 text-slate-200">
      {message}
    </div>
  );
}
