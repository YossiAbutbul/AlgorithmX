interface Props {
  onClick?: () => void;
}

export function Brand({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center"
      aria-label="AlgorithmX, לדף הראשון"
      style={{ background: 'none', border: 0, cursor: onClick ? 'pointer' : 'default', padding: 0 }}
    >
      <span
        className="text-[1.5rem] leading-none sm:text-[var(--step-5)]"
        style={{ fontFamily: "'Secular One', sans-serif", direction: 'ltr' }}
      >
        <span style={{ color: 'var(--ink)' }}>Algorithm</span>
        <span style={{ color: 'var(--accent)' }}>X</span>
      </span>
    </button>
  );
}
