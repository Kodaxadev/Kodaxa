// Reveal [data-reveal] elements as they scroll into view. The hidden state is
// only applied when <html> has `reveal-ready` (set inline, and skipped under
// prefers-reduced-motion), so content never stays hidden without motion/JS.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

if (reduce || !('IntersectionObserver' in window)) {
  items.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  );
  items.forEach((el) => io.observe(el));
}
