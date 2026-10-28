'use client';

import { ArrowRight } from 'lucide-react';
import { LogoImage } from '@/components/Logo';
import { Footer } from '@/components/Footer';
import { LangSwitch, useT } from '@/lib/i18n';
import type { RegistryEntry } from '@/lib/domain';
import { HowSteps } from './HowSteps';
import { SignInCard } from './SignInCard';

export function Marker({ children }: { children: React.ReactNode }) {
  return <span className="bg-[linear-gradient(180deg,transparent_52%,#FCE07A_52%,#FCE07A_90%,transparent_90%)] px-1.5 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">{children}</span>;
}

export function Landing({ registry, signedIn }: { registry: RegistryEntry[]; signedIn: { campus: string; next: string } | null }) {
  const t = useT();
  const iits = registry.filter((r) => r.institutionType === 'IIT').length;
  const iims = registry.filter((r) => r.institutionType === 'IIM').length;

  const steps = [
    {
      title: t({ hinglish: 'Campus email daalo', english: 'Enter your campus email' }),
      body: t({ hinglish: 'Apni IIT ya IIM email pe ek code aayega. Bas wahi chahiye.', english: 'A code lands in your IIT or IIM inbox. That is all we need.' }),
    },
    {
      title: t({ hinglish: 'Photo aur ek line', english: 'A photo and one line' }),
      body: t({ hinglish: 'Naam nahi dikhega. Ek random ID, ek photo aur ek line ki bio.', english: 'No names shown. Just a random ID, a photo and a one line bio.' }),
    },
    {
      title: t({ hinglish: 'Baat shuru', english: 'Start talking' }),
      body: t({ hinglish: 'Video call pe kisi aur campus wale se milo. Mann na lage to skip.', english: 'Video call someone from another campus. Not vibing? Skip.' }),
    },
  ];

  const promises = [
    {
      title: t({ hinglish: 'naam? kaun poochta hai', english: 'your name? nobody asked' }),
      body: t({
        hinglish: 'Sach bolein to tumhara naam waise bhi koi nahi dekhna chahta. Sirf random ID, photo aur campus type dikhega.',
        english: 'Honestly, nobody wanted to see your name anyway. Only a random ID, a photo and your campus type show up.',
      }),
    },
    {
      title: t({ hinglish: 'bahar wale, bahar hi raho', english: 'outsiders stay outside' }),
      body: t({
        hinglish: 'JEE ya CAT phod ke aaye ho, itni VIP entry to banti hai. Bina campus email ke koi andar nahi aata.',
        english: 'You cracked JEE or CAT, you earned the VIP entry. No campus email, no way in.',
      }),
    },
    {
      title: t({ hinglish: 'pehle baat, phir DM', english: 'talk first, DM later' }),
      body: t({
        hinglish: 'Seedha "hi" bhejne wale yahan nahi chalenge. 30 second baat karo, dost bano, tab chat khulegi.',
        english: 'No cold "hi" messages here. Talk for 30 seconds, become friends, then chat opens up.',
      }),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <a href="#top" aria-label="Padhaku Log home">
          <LogoImage height={52} className="!h-9 sm:!h-[52px]" />
        </a>
        <nav aria-label="Main" className="flex items-center gap-6">
          <a href="#how" className="hidden text-[15px] font-medium text-ink no-underline hover:text-neutral-600 md:inline">
            {t({ hinglish: 'Kaise chalta hai?', english: 'How it works' })}
          </a>
          <a href="#safety" className="hidden text-[15px] font-medium text-ink no-underline hover:text-neutral-600 md:inline">
            {t({ hinglish: 'Kitna safe hai?', english: 'Is it safe?' })}
          </a>
          <LangSwitch />
        </nav>
      </header>

      <main className="flex-1">
        <section id="top" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-14 gap-y-10 px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-white px-4 py-2 text-[15px] font-semibold sm:text-base">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ink" />
              {t({ hinglish: 'Sirf IIT aur IIM walon ke liye', english: 'Only for IIT and IIM students' })}
            </span>
            <h1 className="m-0 font-display text-[clamp(52px,8vw,92px)] font-extrabold leading-[0.98] tracking-[-0.035em]">
              {t({ hinglish: <>Chalo, <Marker>baat</Marker> karein.</>, english: <>Let&apos;s <Marker>talk</Marker>.</> })}
            </h1>
            <p className="m-0 max-w-[500px] text-lg leading-relaxed text-neutral-600 sm:text-xl">
              {t({
                hinglish: 'Alag-alag campus ke students se milo. Kisi bhi topic pe baat karo. Mann na lage to skip.',
                english: 'Meet students from different campuses. Talk about anything. Skip whenever you want.',
              })}
            </p>
            <span className="-rotate-2 font-hand text-[21px] text-neutral-600">
              {t({ hinglish: 'yahin se shuru karo, bas campus email chahiye', english: 'start right here, all you need is your campus email' })}
            </span>
          </div>

          <div id="signin" className="relative min-w-0 flex-[1_1_400px] scroll-mt-6">
            <SignInCard registry={registry} signedIn={signedIn} />
            <span aria-hidden className="absolute -top-5 right-5 rotate-3 rounded-[14px] border-2 border-ink bg-marker px-3.5 py-1.5 font-hand text-lg">
              {t({ hinglish: '30 sec baat = dost!', english: '30 sec talk = friends!' })}
            </span>
          </div>
        </section>

        <section id="how" className="scroll-mt-4 border-y-[1.5px] border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h2 className="m-0 font-display text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.02em]">
                {t({ hinglish: <>Teen step, <Marker>bas itna</Marker>.</>, english: <>Three steps, <Marker>that&apos;s it</Marker>.</> })}
              </h2>
              <p className="m-0 mb-1.5 -rotate-2 font-hand text-[22px] font-bold sm:text-2xl">{t({ hinglish: 'do anjaan, ek match...', english: 'two strangers, one match...' })}</p>
            </div>
            <HowSteps steps={steps} />
          </div>
        </section>

        <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
            <h2 className="m-0 whitespace-pre-line font-display text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
              {t({ hinglish: `${iits + iims} campus.\nEk hi jagah.`, english: `${iits + iims} campuses.\nOne place.` })}
            </h2>
            <p className="m-0 text-lg leading-relaxed text-neutral-600">
              {t({
                hinglish: `${iits} IITs aur ${iims} IIMs. Har call pe naya campus, nayi baat.`,
                english: `${iits} IITs and ${iims} IIMs. New campus, new conversation, every call.`,
              })}
            </p>
          </div>
          <div className="grid min-w-0 flex-[1_1_480px] grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 rounded-3xl border-2 border-ink bg-white p-7">
              <span className="font-display text-[64px] font-extrabold leading-none">{iits}</span>
              <span className="text-lg font-bold">IITs</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-3xl border-2 border-ink bg-marker p-7">
              <span className="font-display text-[64px] font-extrabold leading-none">{iims}</span>
              <span className="text-lg font-bold">IIMs</span>
            </div>
          </div>
        </section>

        <section id="safety" className="mx-auto max-w-[1200px] scroll-mt-4 px-4 pb-16 sm:px-6 sm:pb-20">
          {/* Phone: stacked. Tablet: one row per promise, title left. Desktop: three columns. */}
          <div className="grid grid-cols-1 gap-8 rounded-[32px] bg-ink p-8 text-paper sm:gap-0 sm:p-12 lg:grid-cols-3 lg:gap-10 lg:p-14">
            {promises.map((p, i) => (
              <div
                key={i}
                className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[minmax(0,240px)_1fr] sm:items-baseline sm:gap-8 sm:border-t sm:border-white/10 sm:py-7 sm:first:border-t-0 sm:first:pt-0 sm:last:pb-0 lg:flex lg:border-t-0 lg:py-0 lg:gap-2.5"
              >
                <h3 className="m-0 font-hand text-[22px] font-bold text-marker">{p.title}</h3>
                <p className="m-0 text-base leading-relaxed text-neutral-300">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-4 pb-20 text-center sm:px-6">
          <LogoImage height={110} className="max-w-full" />
          <a href="#signin" className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-ink px-8 text-lg font-bold text-paper no-underline shadow-marker-sm hover:bg-neutral-800">
            {t({ hinglish: 'Chalo, Milte Hain', english: "Let's meet" })} <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
