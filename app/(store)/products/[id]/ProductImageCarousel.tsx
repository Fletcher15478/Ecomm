"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const AUTO_ADVANCE_MS = 4500;

/** Auto-advancing carousel with smooth fade and arrow controls. */
export function ProductImageCarousel({
  imageUrls,
  prominent = false,
}: {
  imageUrls: string[];
  prominent?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const total = imageUrls.length;
  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [total]);

  if (total === 0) return null;

  return (
    <div
      className={`relative w-full flex flex-col items-center justify-center ${
        prominent
          ? "min-h-[55vh] sm:min-h-[480px] lg:min-h-[560px]"
          : "min-h-[420px] lg:min-h-[520px]"
      }`}
    >
      <div className={`relative w-full ${prominent ? "max-w-2xl lg:max-w-4xl" : "max-w-2xl lg:max-w-3xl"} aspect-[4/3]`}>
        {imageUrls.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 50vw"
              unoptimized={src.startsWith("http")}
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            aria-label="Previous image"
          >
            <span className="text-xl leading-none">←</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            aria-label="Next image"
          >
            <span className="text-xl leading-none">→</span>
          </button>
        </>
      )}
    </div>
  );
}
