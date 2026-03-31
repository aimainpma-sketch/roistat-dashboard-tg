import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { env, isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const { signInWithMagicLink, signInWithPassword, enterDemoMode, isPasswordProtected } = useAuth();
  const [email, setEmail] = useState("hakunov1991@gmail.com");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithMagicLink(email);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить magic link");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithPassword(password);
      window.location.assign(`${window.location.origin}${env.basePath}dashboard`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось открыть доступ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(85,193,255,0.2),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(183,215,91,0.16),transparent_25%)]" />
      <div className="glass relative z-10 w-full max-w-5xl overflow-hidden rounded-[40px] border border-white/10 shadow-2xl shadow-black/45">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="flex min-h-[560px] flex-col justify-between p-8 lg:p-12">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.26em] text-slate-300">
                Roistat Dashboard
              </div>
              <h1 className="max-w-xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Маркетинговая операционка с защищённым доступом и живыми KPI.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                GitHub Pages на фронте, Supabase в роли контура данных и доступа, отдельная
                аналитическая плоскость для недельных и дневных срезов.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "1 таблица = 1 показатель",
                "Дни и недели в одной оси",
                "Валовая маржа по каналам",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/8 bg-white/5 p-4 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center bg-white/4 p-8 lg:p-10">
            <div className="w-full">
              <div className="mb-6 flex items-center gap-3 text-slate-200">
                <div className="rounded-2xl bg-brand-500/12 p-3 text-brand-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Invite-only access</div>
                  <div className="text-lg font-medium text-white">
                    {isPasswordProtected ? "Вход по паролю" : "Вход по magic link"}
                  </div>
                </div>
              </div>

              {isPasswordProtected ? (
                <form
                  className="space-y-4"
                  onSubmit={handlePasswordSubmit}
                >
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Пароль</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <KeyRound className="size-4 text-slate-400" />
                      <input
                        className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Введите пароль"
                      />
                    </div>
                  </label>

                  <button
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-950 transition",
                      loading ? "bg-slate-400" : "bg-brand-400 hover:bg-brand-500",
                    )}
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? "Проверяем..." : "Открыть супер-админ доступ"}
                  </button>
                </form>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={handleSubmit}
                >
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-300">Email</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <Mail className="size-4 text-slate-400" />
                      <input
                        className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                      />
                    </div>
                  </label>

                  <button
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-950 transition",
                      loading ? "bg-slate-400" : "bg-brand-400 hover:bg-brand-500",
                    )}
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? "Отправляем..." : "Получить ссылку для входа"}
                  </button>
                </form>
              )}

              {submitted && !isPasswordProtected ? (
                <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Письмо отправлено. Проверьте inbox и откройте magic link на этом устройстве.
                </p>
              ) : null}
              {error ? (
                <p className="mt-4 rounded-2xl border border-coral-400/30 bg-coral-400/10 px-4 py-3 text-sm text-coral-100">
                  {error}
                </p>
              ) : null}

              {!isSupabaseConfigured ? (
                <div className="mt-6 rounded-3xl border border-white/8 bg-white/5 p-4">
                  <div className="text-sm font-medium text-white">Supabase ещё не подключён</div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Можно открыть демо-режим и проверить интерфейс до ввода production-ключей.
                  </p>
                  <button
                    className="mt-4 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:border-brand-400/50 hover:text-white"
                    onClick={enterDemoMode}
                    type="button"
                  >
                    Открыть демо-режим
                  </button>
                </div>
              ) : null}

              {isPasswordProtected ? (
                <p className="mt-6 text-xs leading-6 text-slate-500">
                  Текущий режим доступа: единый пароль. Это быстрый вариант для закрытого предпросмотра, а не настоящая
                  серверная защита.
                </p>
              ) : (
                <p className="mt-6 text-xs leading-6 text-slate-500">
                  После подключения production-проекта включите в Supabase redirect:
                  <br />
                  <span className="text-slate-400">
                    https://aimainpma-sketch.github.io/roistat-dashboard-tg/auth/callback
                  </span>
                </p>
              )}

              <Link
                className="mt-4 inline-flex text-sm text-brand-400 transition hover:text-brand-300"
                to="/dashboard"
              >
                Открыть готовый интерфейс
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
