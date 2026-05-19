import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const { threshold = 0, root = null, rootMargin = '0px', once = true } = options;
  const [entry, setEntry] = useState(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef(null);
  const observedRef = useRef(false);

  useEffect(() => {
    const node = targetRef.current;
    if (!node || (once && observedRef.current)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && once) {
          observedRef.current = true;
          observer.unobserve(node);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, root, rootMargin, once]);

  return { targetRef, entry, isIntersecting };
}
