import Link from 'next/link';

// The hand-lettered wordmark. logo.png is ink letters for light screens,
// logo-dark.png is paper letters for dark ones; both keep the yellow swipe.
export function LogoImage({ dark = false, height = 40, className = '' }: { dark?: boolean; height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dark ? '/logo-dark.png' : '/logo.png'}
      alt="Padhaku Log"
      width={Math.round(height * 4.5)}
      height={height}
      style={{ height, width: 'auto' }}
      className={`block select-none ${className}`}
      draggable={false}
    />
  );
}

// Small square mark (the P on the highlighter) for tight spots.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon-192.png" alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size }} className="block rounded-[22%]" />
  );
}

export function Logo({ dark = false, href = '/', height = 40 }: { dark?: boolean; tagline?: boolean; href?: string; height?: number }) {
  return (
    <Link href={href} aria-label="Padhaku Log home" className="inline-flex items-center no-underline">
      <LogoImage dark={dark} height={height} />
    </Link>
  );
}
