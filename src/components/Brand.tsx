interface Props {
  onClick?: () => void;
}

export function Brand({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center"
      aria-label="AlgorithmX, לדף הראשון"
      style={{
        background: 'none',
        border: 0,
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        minHeight: 44,
        paddingInline: 2,
      }}
    >
      <span
        className="text-[1.15rem] leading-none sm:text-[1.35rem]"
        style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 600, letterSpacing: '-0.02em', direction: 'ltr' }}
      >
        <span style={{ color: 'var(--ink)' }}>Algorithm</span>
        <span style={{ color: 'var(--accent)' }}>X</span>
      </span>
    </button>
  );
}
