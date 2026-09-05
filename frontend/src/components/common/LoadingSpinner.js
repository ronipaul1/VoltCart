// ════════════════════════════════════════════════════════
// All common components in one file for brevity
// In production, split into individual files
// ════════════════════════════════════════════════════════

// ── LoadingSpinner.js ─────────────────────────────────
export function LoadingSpinner({ size = 'md', color = 'green' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12', xl: 'h-16 w-16' };
  return (
    <div className="flex justify-center items-center p-4">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-green-700`} />
    </div>
  );
}

export default LoadingSpinner;
