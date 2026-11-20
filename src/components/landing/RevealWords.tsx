// RevealWords: a big statement that appears word by word, once, when it scrolls into
// view: each word goes from soft (blurred, 0.3 opacity, 0.4 em lower) to sharp.
//
// It is readable without JavaScript: the server sends the words fully visible. Only
// after the page starts in the browser, and only if the statement is still below the
// screen, are the words "armed" (made soft); an IntersectionObserver then reveals them
// the first time they come into view. With reduced motion nothing is armed at all.
"use client";

import { useEffect, useRef, type ElementType } from "react";
import { cn } from "@/components/ui/cn";

type RevealWordsProps = {
  text: string;
  // The last word gets the halo (one emphasised word per display headline).
  emphasiseLast?: boolean;
  as?: ElementType;
  id?: string;
  className?: string;
};

export function RevealWords({
  text,
  emphasiseLast = true,
  as: Tag = "p",
  id,
  className,
}: RevealWordsProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen when the page starts: leave it as it is (no flash).
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.dataset.reveal = "armed";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} id={id} className={cn("landing-reveal", className)}>
      {words.map((word, index) => {
        const last = index === words.length - 1;
        return (
          <span key={`${word}-${index}`}>
            <span
              className={cn("landing-reveal-word", emphasiseLast && last && "halo-word")}
              style={{ transitionDelay: `${index * 140}ms` }}
            >
              {word}
            </span>
            {last ? null : " "}
          </span>
        );
      })}
    </Tag>
  );
}
