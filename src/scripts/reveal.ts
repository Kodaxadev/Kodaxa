import { gsap } from 'gsap';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  gsap.from('.hero-copy > *', {
    opacity: 0,
    y: 18,
    duration: 0.8,
    stagger: 0.11,
    ease: 'power2.out',
  });
  gsap.from('.domain, .featured-system', {
    opacity: 0,
    y: 16,
    delay: 0.75,
    duration: 0.72,
    stagger: 0.08,
    ease: 'power2.out',
  });
}
