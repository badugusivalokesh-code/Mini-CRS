import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f8fc] px-4 text-[#123553]">
      <section className="w-full max-w-md rounded-xl border border-[#e1eaf2] bg-white p-8 text-center shadow-[0_16px_40px_rgba(22,54,82,0.06)]">
        <div className="mx-auto grid size-11 place-items-center rounded-lg bg-[#514bff] text-[11px] font-black text-white">
          CL
        </div>
        <h1 className="mt-5 text-xl font-bold text-[#123553]">Page not found</h1>
        <p className="mt-2 text-sm text-[#71869a]">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#514bff] px-5 text-sm font-semibold text-white transition hover:bg-[#403be8]"
        >
          Back to Dashboard
        </Link>
      </section>
    </main>
  )
}
