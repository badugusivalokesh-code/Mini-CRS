import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps extends PropsWithChildren {
  title: string
  description: string
  footerText: string
  footerLinkText: string
  footerTo: string
}

export default function AuthLayout({
  title,
  description,
  footerText,
  footerLinkText,
  footerTo,
  children,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f8fc] px-4 py-10 text-[#123553]">
      <div className="w-full max-w-[440px]">
        <Link to="/login" className="mb-7 flex items-center justify-center gap-3 text-lg font-bold">
          <span className="grid size-10 place-items-center rounded-md bg-[#0d2d4b] text-sm text-white">MC</span>
          <span>Mini CRM</span>
        </Link>
        <section className="rounded-xl border border-[#e2ebf3] bg-white px-7 py-8 shadow-[0_16px_40px_rgba(22,54,82,0.06)] sm:px-9 sm:py-9">
          <header className="mb-7">
            <h1 className="text-[26px] font-bold leading-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#71869a]">{description}</p>
          </header>
          {children}
          <p className="mt-7 border-t border-[#e9eff4] pt-5 text-center text-sm text-[#71869a]">
            {footerText}{' '}
            <Link to={footerTo} className="font-semibold text-[#514bff] hover:text-[#403be8]">
              {footerLinkText}
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}