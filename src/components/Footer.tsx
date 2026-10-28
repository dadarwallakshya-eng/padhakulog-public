import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t-[1.5px] border-neutral-200">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 text-sm text-neutral-500 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <span className="rounded-md border-[1.5px] border-neutral-300 px-1.5 py-0.5 text-[11px] font-bold text-neutral-600">18+</span>
          Padhaku Log · © {new Date().getFullYear()}
        </span>
        <span className="flex flex-wrap gap-5">
          <Link href="/safety" className="text-neutral-600 hover:text-ink">Safety</Link>
          <Link href="/privacy" className="text-neutral-600 hover:text-ink">Privacy</Link>
          <Link href="/terms" className="text-neutral-600 hover:text-ink">Terms</Link>
        </span>
      </div>
    </footer>
  );
}
