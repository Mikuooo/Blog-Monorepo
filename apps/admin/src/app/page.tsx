export default function AdminHomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">CMS Admin</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Editorial workspace</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
        TanStack Query, React Hook Form, and Zod are wired into the admin application boundary. The
        first authenticated article workflow can now be delivered as a vertical slice.
      </p>
      <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Initialization status">
        {['Applications ready', 'Contracts generated', 'Quality gates enabled'].map((label) => (
          <article key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Baseline</p>
            <p className="mt-2 font-medium text-slate-100">{label}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
