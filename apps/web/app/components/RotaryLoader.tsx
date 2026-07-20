export function RotaryLoader({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/rotary-logo.png"
      alt="Loading"
      className="rotary-loader"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
