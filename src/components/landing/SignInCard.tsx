'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Check, GraduationCap, Mail } from 'lucide-react';
import { checkEmail, type RegistryEntry } from '@/lib/domain';
import { useT } from '@/lib/i18n';

type Step = 'email' | 'otp' | 'verified';

// Placeholder that keeps "name@" and types made-up campuses after it, just for fun.
const FUNNY_CAMPUSES = ['iitchomu.ac.in', 'iimdholakpur.ac.in', 'iitjhumritalaiya.ac.in', 'iimgadbadpur.ac.in', 'iitlallantop.ac.in', 'iimchaipur.ac.in', 'iitbakaiti.ac.in'];

function useFunnyPlaceholder(active: boolean) {
  const [text, setText] = useState(`name@${FUNNY_CAMPUSES[0]}`);
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let word = 0;
    let len = FUNNY_CAMPUSES[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (deleting) {
        len -= 1;
        if (len <= 0) {
          deleting = false;
          word = (word + 1) % FUNNY_CAMPUSES.length;
        }
      } else {
        len += 1;
      }
      setText(`name@${FUNNY_CAMPUSES[word].slice(0, Math.max(0, len))}`);
      const typedAll = !deleting && len >= FUNNY_CAMPUSES[word].length;
      if (typedAll) deleting = true;
      timer = setTimeout(tick, typedAll ? 1600 : deleting ? 35 : 80);
    };
    timer = setTimeout(tick, 1600);
    return () => clearTimeout(timer);
  }, [active]);
  return text;
}

export function SignInCard({ registry, signedIn }: { registry: RegistryEntry[]; signedIn: { campus: string; next: string } | null }) {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [next, setNext] = useState('/onboarding');
  const [campus, setCampus] = useState('');

  const check = useMemo(() => checkEmail(email, registry), [email, registry]);
  const placeholder = useFunnyPlaceholder(step === 'email' && !email);
  // Unknown domains and personal mailboxes may still be invited testers, so the server gets the final say.
  const canSend = check.kind === 'ok' || (check.kind === 'bad' && check.reason !== 'generic');
  const sendTo = check.kind === 'ok' ? check.email : email.trim().toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    if (!canSend || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: sendTo }) });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        if (res.status === 429 && data.retryInMs) {
          setCooldown(Math.ceil(data.retryInMs / 1000));
          setStep('otp');
        }
        setError(data.error || 'Could not send the code.');
        return;
      }
      setDevCode(data.devCode ?? null);
      setOtp('');
      setAttemptsLeft(5);
      setCooldown(30);
      setStep('otp');
    } catch {
      setError(t({ hinglish: 'Network ki dikkat hai. Dobara try karo.', english: 'Network problem. Try again.' }));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy || attemptsLeft <= 0) return;
    if (!/^\d{6}$/.test(otp)) {
      setError(t({ hinglish: 'Poore 6 digit daalo.', english: 'Enter all 6 digits.' }));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: sendTo, code: otp }) });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) {
        setError(data.error || 'That code is not valid.');
        if (typeof data.attemptsLeft === 'number') setAttemptsLeft(data.attemptsLeft);
        return;
      }
      setNext(data.next);
      setCampus(data.institution);
      setStep('verified');
      router.prefetch(data.next);
    } catch {
      setError(t({ hinglish: 'Network ki dikkat hai. Dobara try karo.', english: 'Network problem. Try again.' }));
    } finally {
      setBusy(false);
    }
  }


  const masked = sendTo.includes('@') ? `${sendTo.slice(0, 2)}••••@${sendTo.split('@')[1]}` : '';
  const primary = 'flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[17px] font-bold text-paper no-underline hover:bg-neutral-800 disabled:opacity-40';
  const field = 'pl-field h-14 w-full rounded-2xl border-2 border-ink bg-paper text-[17px] text-ink placeholder:text-neutral-400';

  return (
    <div className="flex flex-col gap-6 rounded-[28px] border-2 border-ink bg-white p-6 shadow-marker sm:p-9">
      {signedIn && step === 'email' ? (
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-marker px-3 py-1 text-xs font-bold text-ink">
            <Check size={12} strokeWidth={3} aria-hidden /> {t({ hinglish: 'Verified student', english: 'Verified student' })}
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 font-display text-[28px] font-extrabold tracking-tight">{t({ hinglish: 'Wapas aa gaye!', english: 'Welcome back!' })}</h2>
            <p className="m-0 text-[15px] text-neutral-600">{t({ hinglish: `Tum ${signedIn.campus} se signed in ho.`, english: `You are signed in from ${signedIn.campus}.` })}</p>
          </div>
          <a href={signedIn.next} className={primary}>
            {t({ hinglish: 'Chalo, Milte Hain', english: "Let's meet" })} <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </a>
          <button
            type="button"
            className="min-h-11 text-sm font-semibold text-neutral-600 underline-offset-4 hover:underline"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.refresh();
            }}
          >
            {t({ hinglish: 'Sign out', english: 'Sign out' })}
          </button>
        </div>
      ) : step === 'email' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 font-display text-[30px] font-extrabold tracking-tight">Sign in</h2>
            <p className="m-0 text-[15px] leading-normal text-neutral-600">
              {t({ hinglish: 'Naya ho ya purana, dono ke liye yahi. Password ka jhanjhat nahi.', english: 'New or returning, same box for both. No password to remember.' })}
            </p>
          </div>
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
          >
            <label htmlFor="pl-email" className="text-sm font-semibold">{t({ hinglish: 'Campus email', english: 'Campus email' })}</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden />
              <input
                id="pl-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${field} pl-11 pr-4`}
              />
            </div>

            {check.kind === 'ok' && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-marker/40 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <GraduationCap size={18} className="flex-none" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold">{check.institution.name}</span>
                    <span className="truncate text-xs text-neutral-600">@{check.domain}</span>
                  </span>
                </span>
                <span className="flex-none rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-paper">{check.institution.institutionType}</span>
              </div>
            )}
            {check.kind === 'bad' && (
              <div className="flex items-start gap-2.5 rounded-2xl border-[1.5px] border-danger/40 bg-orange-50 px-4 py-3 text-danger">
                <AlertCircle size={17} className="mt-px flex-none" aria-hidden />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold">{check.title}</span>
                  <span className="text-[13px] leading-snug">{check.body}</span>
                </span>
              </div>
            )}
            {error && <p role="alert" className="m-0 text-sm font-medium text-danger">{error}</p>}

            <button type="submit" disabled={!canSend || busy} className={`mt-3 ${primary}`}>
              {busy ? t({ hinglish: 'Bhej rahe hain...', english: 'Sending...' }) : t({ hinglish: 'Chalo, Milte Hain', english: "Let's meet" })}
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </form>
          <p className="m-0 text-[13px] leading-normal text-neutral-500">
            {t({ hinglish: 'Email sirf verification ke liye hai, kabhi public nahi hoti.', english: 'Your email is used only for verification and is never made public.' })}
          </p>
        </>
      ) : step === 'otp' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 font-display text-[30px] font-extrabold tracking-tight">{t({ hinglish: 'Code daalo', english: 'Enter the code' })}</h2>
            <p className="m-0 text-[15px] leading-normal text-neutral-600">
              {t({ hinglish: '6 digit ka code bheja hai', english: 'We sent a 6 digit code to' })} <b className="text-ink">{masked}</b>.{' '}
              {t({ hinglish: '10 minute tak chalega. Nahi dikha? Spam dekho.', english: 'It works for 10 minutes. Not there? Check spam.' })}
            </p>
          </div>
          {devCode && (
            <p className="m-0 rounded-2xl bg-marker/40 px-4 py-2.5 text-[13px]">
              Dev mode: email is not set up, so here is your code: <b className="font-mono">{devCode}</b>
            </p>
          )}
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <label htmlFor="pl-otp" className="text-sm font-semibold">{t({ hinglish: 'Sign-in code', english: 'Sign-in code' })}</label>
            <input
              id="pl-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              className={`${field} h-16 px-4 text-center font-display text-[30px] font-extrabold tracking-[0.45em]`}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`text-[13px] ${attemptsLeft <= 2 ? 'font-semibold text-danger' : 'text-neutral-500'}`}>
                {attemptsLeft > 0
                  ? t({ hinglish: `${attemptsLeft} try bache hain`, english: `${attemptsLeft} of 5 attempts left` })
                  : t({ hinglish: 'Bahut try ho gaye. Naya code mangao.', english: 'Too many attempts. Request a new code.' })}
              </span>
              {cooldown > 0 ? (
                <span className="text-[13px] text-neutral-500">
                  {t({ hinglish: 'Dobara bhejo', english: 'Resend in' })} 0:{String(cooldown).padStart(2, '0')}
                </span>
              ) : (
                <button type="button" onClick={sendCode} className="min-h-11 text-[13px] font-bold underline underline-offset-4">
                  {t({ hinglish: 'Dobara bhejo', english: 'Resend code' })}
                </button>
              )}
            </div>
            {error && <p role="alert" className="m-0 text-sm font-medium text-danger">{error}</p>}
            <button type="submit" disabled={busy || attemptsLeft <= 0} className={`mt-3 ${primary}`}>
              {busy ? t({ hinglish: 'Check kar rahe hain...', english: 'Checking...' }) : t({ hinglish: 'Andar chalo', english: 'Verify and continue' })}
            </button>
          </form>
          <button type="button" onClick={() => { setStep('email'); setError(''); }} className="min-h-11 self-center text-sm font-semibold text-neutral-600 underline-offset-4 hover:underline">
            {t({ hinglish: 'Dusri email use karo', english: 'Use a different email' })}
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 py-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-marker">
            <Check size={30} strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex flex-col items-center gap-2">
            <h2 className="m-0 font-display text-[28px] font-extrabold tracking-tight">{t({ hinglish: 'Aa gaye andar!', english: "You're in!" })}</h2>
            <p className="m-0 text-[15px] text-neutral-600">
              {next === '/onboarding'
                ? t({ hinglish: `${campus} verified. Ab ek chhota sa profile, phir baat shuru.`, english: `${campus} verified. A quick profile, then you can start talking.` })
                : t({ hinglish: 'Phir se swagat hai.', english: 'Good to see you again.' })}
            </p>
          </div>
          <a href={next} className={primary}>
            {next === '/onboarding' ? t({ hinglish: 'Profile banao', english: 'Set up profile' }) : t({ hinglish: 'Chalo, Milte Hain', english: "Let's meet" })}
            <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
