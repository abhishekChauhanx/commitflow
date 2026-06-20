import { signIn } from "@/lib/auth";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
        <span className="text-xl font-bold">CommitFlow</span>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 rounded-md transition font-medium"
          >
            Continue with GitHub
          </button>
        </form>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl leading-tight">
          Automate your{" "}
          <span className="text-emerald-400">GitHub contribution graph</span>
        </h1>
        <p className="mt-6 text-gray-400 max-w-xl text-lg">
          Schedule daily commits, backfill missed days, and monitor everything
          from one dashboard.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="mt-8 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-md font-medium transition"
          >
            Get Started with GitHub
          </button>
        </form>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6 w-full">
        {[
          { title: "Daily Auto-Commit", desc: "Set commits per day and time — we handle the rest." },
          { title: "Custom Backfill", desc: "Missed a day? Backfill it with a specific date and count." },
          { title: "Activity Dashboard", desc: "Track streaks, history, and status visually." },
        ].map((f) => (
          <div key={f.title} className="p-6 rounded-lg border border-gray-800 bg-gray-900/50">
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-gray-500 text-sm py-8">
        © {new Date().getFullYear()} CommitFlow
      </footer>
    </main>
  );
}