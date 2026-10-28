'use client';

import type { CSSProperties } from 'react';
import { useT } from '@/lib/i18n';

// "Teen step" told as a tiny story: step 1 is a guy (his shirt is the card),
// step 2 is a heart, step 3 is a girl, and their arms reach out to hold the
// heart. The drawings have fixed proportions, so there are three layouts
// instead of one squashed one:
//   1200px+   everything in one row, both holding the heart
//   tablet    both people on the left, the heart on the right
//   phone     stacked, scaled down to fit narrow screens

export interface Step {
  title: string;
  body: string;
}

// Lengths in design pixels. Phones scale them with the screen (see Stacked).
type S = (n: number) => string;
const px: S = (n) => `${n}px`;
const scaled: S = (n) => `calc(var(--u) * ${n})`;

const INK = '#17181C';
const PAPER = '#FBFAF6';
const MARKER = '#FCE07A';
const BLUSH = '#F9B8CF';

const HEART = 'M200 340 C120 285 20 220 20 125 C20 60 70 20 125 20 C160 20 188 40 200 70 C212 40 240 20 275 20 C330 20 380 60 380 125 C380 220 280 285 200 340Z';
const TORSO = 'M40 416 Q22 416 22 398 L22 196 C22 148 62 122 112 118 L188 118 C238 122 278 148 278 196 L278 398 Q278 416 260 416 Z';

function GuyDrawing() {
  return (
    <svg viewBox="0 0 300 420" aria-hidden className="absolute inset-0 h-full w-full" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={TORSO} fill={PAPER} />
      <path d="M116 118 L150 160 L184 118 L166 118 L150 138 L134 118 Z" fill={MARKER} />
      {/* A pen in the shirt pocket */}
      <path d="M205 360 L205 336 Q210 328 215 336 L215 360 Z" fill={INK} strokeWidth={2} />
      <path d="M196 352 L240 352 L240 392 Q240 400 232 400 L204 400 Q196 400 196 392 Z" fill="#FFFFFF" strokeWidth={2.5} />
      <g transform="translate(150 74) scale(1.8) translate(-60 -56)" strokeWidth={1.7}>
        <circle cx={32.5} cy={60} r={5} fill="#FFFFFF" />
        <circle cx={87.5} cy={60} r={5} fill="#FFFFFF" />
        <circle cx={60} cy={56} r={28} fill="#FFFFFF" />
        <path d="M33 52 C29 30 45 21 60 22 C77 20 93 31 87 53 C83 43 77 41 71 45 C67 37 57 37 53 43 C47 39 39 43 33 52Z" fill={INK} />
        <circle cx={49} cy={60} r={7.5} />
        <circle cx={71} cy={60} r={7.5} />
        <path d="M56.5 60 L63.5 60" />
        <circle cx={49} cy={60} r={1.6} fill={INK} stroke="none" />
        <circle cx={71} cy={60} r={1.6} fill={INK} stroke="none" />
        <path d="M51 73 Q60 80 69 73" />
      </g>
    </svg>
  );
}

function GirlDrawing() {
  return (
    <svg viewBox="0 0 300 420" aria-hidden className="absolute inset-0 h-full w-full" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={TORSO} fill={PAPER} />
      <path d="M114 118 C118 158 182 158 186 118 L170 118 C166 140 134 140 130 118 Z" fill={BLUSH} />
      {/* Campus ID card on a clip */}
      <path d="M82 340 L82 352" strokeWidth={2.5} />
      <rect x={60} y={350} width={44} height={50} rx={6} fill="#FFFFFF" strokeWidth={2.5} />
      <path d="M60 356 Q60 350 66 350 L98 350 Q104 350 104 356 L104 362 L60 362 Z" fill={BLUSH} strokeWidth={2.5} />
      <circle cx={72} cy={376} r={5} strokeWidth={2} />
      <path d="M83 373 L96 373 M83 381 L94 381 M67 391 L96 391" strokeWidth={2} />
      <g transform="translate(150 74) scale(1.8) translate(-60 -58)" strokeWidth={1.7}>
        <path d="M31 66 C26 40 42 27 60 27 C80 27 94 40 89 66 L92 86 C84 82 82 76 82 70" fill={INK} />
        <path d="M31 66 L28 86 C36 82 38 76 38 70" fill={INK} />
        <circle cx={60} cy={58} r={27} fill="#FFFFFF" />
        <path d="M34 52 C38 38 50 32 60 33 C70 32 82 38 86 52 C78 46 70 42 62 44 C54 46 44 46 34 52Z" fill={INK} />
        <circle cx={80} cy={42} r={3.2} fill={MARKER} strokeWidth={1.2} />
        <circle cx={50} cy={61} r={2} fill={INK} stroke="none" />
        <circle cx={70} cy={61} r={2} fill={INK} stroke="none" />
        <circle cx={44} cy={70} r={4.5} fill={BLUSH} stroke="none" />
        <circle cx={76} cy={70} r={4.5} fill={BLUSH} stroke="none" />
        <path d="M52 72 Q60 79 68 72" />
      </g>
    </svg>
  );
}

function HeartDrawing() {
  return (
    <svg viewBox="0 0 400 360" aria-hidden className="absolute inset-0 h-full w-full" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={HEART} fill={INK} transform="translate(7 7)" />
      <path d={HEART} fill={BLUSH} />
      <path d="M56 96 C62 68 82 52 106 48" stroke="#FFFFFF" strokeWidth={7} />
      <path d="M14 36 L24 46 M4 74 L16 76 M386 36 L376 46 M396 74 L384 76" strokeWidth={2.5} />
    </svg>
  );
}

function Badge({ s, n, left, top, size = 46 }: { s: S; n: number; left: number; top: number; size?: number }) {
  return (
    <span
      aria-hidden
      className="absolute flex items-center justify-center rounded-full border-[2.5px] border-ink bg-marker font-hand font-bold leading-none"
      style={{ left: s(left), top: s(top), width: s(size), height: s(size), fontSize: s(size * 0.56), paddingTop: s(3) }}
    >
      {n}
    </span>
  );
}

// A dashed doodle arrow hanging under a stacked card, pointing down or up.
function Connector({ s, dir }: { s: S; dir: 'down' | 'up' }) {
  return (
    <svg
      viewBox="0 0 40 56"
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2"
      style={{ top: `calc(100% + ${s(4)})`, width: s(40), height: s(56) }}
      fill="none"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === 'down' ? (
        <>
          <path d="M14 4 C30 16 6 28 20 42 C22 44 22 46 21 48" strokeDasharray="2 6" />
          <path d="M14 42 L21 51 L28 42" />
        </>
      ) : (
        <>
          <path d="M26 52 C10 40 34 28 20 14 C18 12 18 10 19 8" strokeDasharray="2 6" />
          <path d="M12 14 L19 5 L26 14" />
        </>
      )}
    </svg>
  );
}

interface Place {
  s: S;
  // Absolute spot in a fixed layout, or in the normal flow (phones).
  at?: { left: number; top: number };
  connector?: 'down' | 'up';
}

function placeStyle({ s, at, connector }: Place, width: number, height: number): CSSProperties {
  return {
    width: s(width),
    height: s(height),
    ...(at ? { left: s(at.left), top: s(at.top) } : { marginBottom: connector ? s(64) : undefined }),
  };
}

function Person({ kind, n, step, place }: { kind: 'guy' | 'girl'; n: number; step: Step; place: Place }) {
  const { s } = place;
  const guy = kind === 'guy';
  return (
    <li className={place.at ? 'absolute' : 'relative flex-none'} style={placeStyle(place, 300, 420)}>
      {guy ? <GuyDrawing /> : <GirlDrawing />}
      <Badge s={s} n={n} left={guy ? 25 : 229} top={117} />
      <div className="absolute flex flex-col text-center" style={{ left: s(46), top: s(188), width: s(208), gap: s(8) }}>
        <h3 className="m-0 font-bold leading-tight" style={{ fontSize: s(place.at ? 20 : 19) }}>
          {step.title}
        </h3>
        <p className="m-0 text-neutral-600" style={{ fontSize: s(15), lineHeight: 1.55 }}>
          {step.body}
        </p>
      </div>
      <span
        aria-hidden
        className="absolute whitespace-nowrap rounded-[14px] border-2 border-ink bg-white font-hand font-bold leading-[1.3]"
        style={{ left: s(guy ? 214 : 4), top: s(6), padding: `${s(3)} ${s(12)} ${s(2)}`, fontSize: s(18), transform: `rotate(${guy ? 5 : -5}deg)` }}
      >
        {guy ? 'hi...' : 'hello!'}
        <svg viewBox="0 0 16 13" aria-hidden className="absolute" style={{ ...(guy ? { left: s(6) } : { right: s(6) }), bottom: s(-11), width: s(16), height: s(13) }}>
          <path d={guy ? 'M2 0 L1 12 L13 0' : 'M14 0 L15 12 L3 0'} fill="#FFFFFF" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        </svg>
      </span>
      {place.connector && <Connector s={s} dir={place.connector} />}
    </li>
  );
}

// Where the words sit inside the heart, per size. k = heart scale (1 = 400px wide).
const HEART_WIDE = { k: 1.1, textLeft: 100, textTop: 114, textWidth: 240, title: 21, body: 15, lh: 1.55, badge: 46, pillTop: 262, pill: 18 };
const HEART_TABLET = { k: 1, textLeft: 85, textTop: 104, textWidth: 230, title: 20, body: 15, lh: 1.5, badge: 46, pillTop: 238, pill: 17 };
const HEART_PHONE = { k: 0.82, textLeft: 69, textTop: 86, textWidth: 190, title: 18, body: 14, lh: 1.45, badge: 42, pillTop: 190, pill: 14 };

function HeartCard({ n, step, place, size, pill }: { n: number; step: Step; place: Place; size: typeof HEART_WIDE; pill: string }) {
  const { s } = place;
  const { k } = size;
  return (
    <li className={place.at ? 'absolute' : 'relative flex-none'} style={placeStyle(place, 400 * k, 360 * k)}>
      <HeartDrawing />
      {/* The number sits in the dip at the top of the heart */}
      <Badge s={s} n={n} size={size.badge} left={200 * k - size.badge / 2} top={70 * k - size.badge / 2} />
      <div className="absolute flex flex-col text-center" style={{ left: s(size.textLeft), top: s(size.textTop), width: s(size.textWidth), gap: s(7) }}>
        <h3 className="m-0 font-bold leading-tight" style={{ fontSize: s(size.title) }}>
          {step.title}
        </h3>
        <p className="m-0 text-ink" style={{ fontSize: s(size.body), lineHeight: size.lh }}>
          {step.body}
        </p>
      </div>
      <span
        className="absolute left-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-white font-hand font-bold leading-[1.3]"
        style={{ top: s(size.pillTop), fontSize: s(size.pill), padding: `${s(3)} ${s(12)}`, transform: 'translateX(-50%) rotate(-4deg)' }}
      >
        {pill}
      </span>
      {place.connector && <Connector s={s} dir={place.connector} />}
    </li>
  );
}

// Arms come out from under the shirts; hands are drawn later so they sit on the heart.
function Arms({ w, h, paths }: { w: number; h: number; paths: string[] }) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="absolute left-0 top-0" fill="none" strokeLinecap="round">
      {paths.map((d) => (
        <g key={d}>
          <path d={d} stroke={INK} strokeWidth={17} />
          <path d={d} stroke="#FFFFFF" strokeWidth={11} />
        </g>
      ))}
    </svg>
  );
}

function Hand({ x, y }: { x: number; y: number }) {
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" aria-hidden className="absolute" style={{ left: x - 15, top: y - 15 }}>
      <circle cx={15} cy={15} r={12} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
    </svg>
  );
}

export function HowSteps({ steps }: { steps: Step[] }) {
  const t = useT();
  const pill = t({ hinglish: '30 sec = dost!', english: '30 sec = friends!' });
  const caption = t({ hinglish: '(ladka ho ya ladki, bas campus wala hona chahiye)', english: '(guy or girl, you just need a campus email)' });
  const captionCls = 'm-0 text-center font-hand font-bold text-neutral-600';

  return (
    <div>
      {/* 1200px and up: one row, both of them holding the heart */}
      <div className="hidden min-[1200px]:block">
        <div className="relative mx-auto h-[450px] w-[1120px]">
          <Arms w={1120} h={450} paths={['M262 320 C305 330 345 290 397 262', 'M858 320 C815 330 775 290 723 262']} />
          <ol className="absolute inset-0 m-0 list-none p-0">
            <Person kind="guy" n={1} step={steps[0]} place={{ s: px, at: { left: 0, top: 20 } }} />
            <HeartCard n={2} step={steps[1]} place={{ s: px, at: { left: 340, top: 30 } }} size={HEART_WIDE} pill={pill} />
            <Person kind="girl" n={3} step={steps[2]} place={{ s: px, at: { left: 820, top: 20 } }} />
          </ol>
          <Hand x={395} y={262} />
          <Hand x={725} y={262} />
        </div>
        <p className={`${captionCls} mt-7 text-xl`}>{caption}</p>
      </div>

      {/* Tablet: the two of them on the left, reaching for the heart on the right */}
      <div className="relative mx-auto hidden h-[860px] w-[720px] md:block min-[1200px]:hidden">
        <Arms w={720} h={860} paths={['M262 330 C295 335 322 370 348 390', 'M262 690 C300 680 342 600 378 538']} />
        <ol className="absolute inset-0 m-0 list-none p-0">
          <Person kind="guy" n={1} step={steps[0]} place={{ s: px, at: { left: 0, top: 0 } }} />
          <HeartCard n={2} step={steps[1]} place={{ s: px, at: { left: 320, top: 310 } }} size={HEART_TABLET} pill={pill} />
          <Person kind="girl" n={3} step={steps[2]} place={{ s: px, at: { left: 0, top: 440 } }} />
        </ol>
        <Hand x={350} y={392} />
        <Hand x={380} y={536} />
        <svg width={280} height={200} viewBox="0 0 280 200" aria-hidden className="absolute left-[440px] top-[100px]" fill="none" stroke={INK} strokeLinejoin="round">
          <path d={HEART} transform="translate(40 150) scale(0.09)" fill={BLUSH} strokeWidth={2.5 / 0.09} />
          <path d={HEART} transform="translate(120 80) scale(0.065)" strokeWidth={2.5 / 0.065} />
          <path d={HEART} transform="translate(210 50) scale(0.05)" fill={BLUSH} strokeWidth={2.5 / 0.05} />
          <path d={HEART} transform="translate(170 20) scale(0.04)" strokeWidth={2.5 / 0.04} />
        </svg>
        <span aria-hidden className="absolute left-[530px] top-[212px] -rotate-6 whitespace-nowrap font-hand text-2xl font-bold">
          {t({ hinglish: 'dhak dhak!', english: 'ba-dum ba-dum!' })}
        </span>
        <p className={`${captionCls} absolute left-[340px] top-[716px] w-[380px] -rotate-2 text-xl`}>{caption}</p>
      </div>

      {/* Phone: stacked, and everything scales down on narrow screens (328 design px wide) */}
      <div className="md:hidden" style={{ containerType: 'inline-size' }}>
        <div className="flex flex-col items-center" style={{ '--u': 'min(1px, calc(100cqw / 328))' } as CSSProperties}>
          <ol className="m-0 flex list-none flex-col items-center p-0">
            <Person kind="guy" n={1} step={steps[0]} place={{ s: scaled, connector: 'down' }} />
            <HeartCard n={2} step={steps[1]} place={{ s: scaled, connector: 'up' }} size={HEART_PHONE} pill={pill} />
            <Person kind="girl" n={3} step={steps[2]} place={{ s: scaled }} />
          </ol>
          <p className={`${captionCls} mt-6`} style={{ fontSize: scaled(18) }}>
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}
