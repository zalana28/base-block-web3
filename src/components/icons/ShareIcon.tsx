// Share icon — tiga titik terhubung (di-ekspor untuk dipakai tombol utama).
export default function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="2.4" fill="currentColor" />
      <circle cx="6" cy="12" r="2.4" fill="currentColor" />
      <circle cx="18" cy="19" r="2.4" fill="currentColor" />
      <path
        d="M8.2 10.8 15.8 6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.2 13.2 15.8 17.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
