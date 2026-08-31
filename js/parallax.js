/* Player Fund Inc - scroll-linked parallax on the mountain photographs.

   The first pass at this was a CSS keyframe loop that drifted in and out on a
   34s timer. It was wrong for two reasons that no amount of tuning fixes: it
   moved while the reader was still, which reads as a screensaver rather than
   as photography, and being a ping-pong it visibly reversed direction, which
   a landscape never does. Both problems come from the motion having no source.

   Tying the move to scroll position gives it one. The photograph travels
   because the page travels, it only ever runs one way, and it stops the
   instant the reader stops. That is the difference between a picture that is
   moving and a picture being moved. */

import { gsap } from 'https://esm.sh/gsap@3';
import { ScrollTrigger } from 'https://esm.sh/gsap@3/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* matchMedia rather than a one-off check at load: it builds the triggers only
   under no-preference and tears them back down if the preference changes
   mid-session, which a plain media query read cannot do. The cleanup returned
   below is what GSAP calls on the way out. */
gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  const shots = gsap.utils.toArray('.drift');

  shots.forEach((img) => {
    const frame = img.closest('.text-break, .page-hero');
    if (!frame) return;

    /* Scale and rise together, as one gesture. The scale never drops below
       1.12, which is the headroom the 4% translate needs at either end -
       object-fit:cover leaves no bleed of its own, so the crop has to pay for
       the movement or the frame edge shows. */
    gsap.fromTo(
      img,
      { yPercent: -4, scale: 1.12 },
      {
        yPercent: 4,
        scale: 1.26,
        /* Linear, because the scroll is already the easing curve. Anything
           else here fights the reader's own hand. */
        ease: 'none',
        scrollTrigger: {
          trigger: frame,
          /* A band in the middle of the page gets tracked across its whole
             pass through the viewport. A hero already sitting at the top of
             the document has no approach to track, so it is measured from the
             top instead - otherwise it opens at some arbitrary mid-progress
             on load and the first thing the reader sees is the end of a move
             they never saw start. */
          start: () =>
            frame.getBoundingClientRect().top + window.scrollY < window.innerHeight
              ? 'top top'
              : 'top bottom',
          end: 'bottom top',
          /* A second of catch-up. Scrubbing straight to the scroll position is
             technically accurate and feels stuck to the trackpad; the lag is
             what makes it read as weight. */
          scrub: 1,
          invalidateOnRefresh: true,
        },
      }
    );
  });

  return () => gsap.killTweensOf(shots);
});
