import { Button } from '@blog/ui'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
        Public Blog
      </p>
      <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
        A clean foundation for stories worth publishing.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        Server-rendered by Next.js and backed by the canonical NestJS API. Article routes will land
        as the first vertical feature slice.
      </p>
      <div className="mt-10">
        <Button aria-label="Project initialized">Project initialized</Button>
      </div>
    </main>
  )
}
