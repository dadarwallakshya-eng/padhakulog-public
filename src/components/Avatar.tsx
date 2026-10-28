/* eslint-disable @next/next/no-img-element */

const PALETTE = ['#1F5E8C', '#B45309', '#1F7A4D', '#A3366B', '#5B3FA8', '#0E7490', '#B42318', '#3F4B9A'];
export function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// A profile picture, or the first letter of the anonymous ID on a colour.
export function Avatar({ url, name, size = 40, light = false, className = '' }: { url: string | null | undefined; name: string; size?: number; light?: boolean; className?: string }) {
  const style = { width: size, height: size };
  if (url) return <img src={url} alt="" width={size} height={size} style={style} className={`flex-none rounded-full object-cover ${light ? 'bg-neutral-100' : 'bg-neutral-800'} ${className}`} />;
  return (
    <span style={{ ...style, background: colorFor(name), fontSize: Math.round(size * 0.4) }} className={`flex flex-none items-center justify-center rounded-full font-bold text-white ${className}`} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
