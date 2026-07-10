// Remounts on every route change, giving each page a soft fade/rise-in
// instead of a hard cut. motion-safe keeps it off for users who prefer
// reduced motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="motion-safe:animate-page-in">{children}</div>;
}
