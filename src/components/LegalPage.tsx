import { Logo } from './Logo';
import { Footer } from './Footer';

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: { heading: string; body: string[] }[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b-[1.5px] border-neutral-200">
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6"><Logo /></div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="m-0 font-display text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{intro}</p>
        <div className="mt-8 flex flex-col gap-6">
          {sections.map((s) => (
            <section key={s.heading} className="rounded-3xl border-2 border-ink bg-white p-6">
              <h2 className="m-0 font-hand text-xl font-bold">{s.heading}</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700">
                {s.body.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-8 text-xs text-neutral-500">Draft text for the prototype. Have it reviewed before launch.</p>
      </main>
      <Footer />
    </div>
  );
}
