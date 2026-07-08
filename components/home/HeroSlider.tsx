"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const banners = [
  "/banners/banner1.png",
  "/banners/banner2.png",
  "/banners/banner3.png",
  "/banners/banner4.png",
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const previous = () => {
    setCurrent((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const next = () => {
    setCurrent((prev) => (prev + 1) % banners.length);
  };

  return (
    <section className="relative w-full overflow-hidden bg-white">

      <Image
        src={banners[current]}
        alt={`Banner ${current + 1}`}
        width={1920}
        height={800}
        priority
        className="w-full h-auto transition-all duration-700"
      />

      {/* Previous Button */}
      <button
        onClick={previous}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-4 py-2 text-2xl shadow hover:bg-white"
      >
        ‹
      </button>

      {/* Next Button */}
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-4 py-2 text-2xl shadow hover:bg-white"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-3">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-3 w-3 rounded-full ${
              current === index ? "bg-blue-700" : "bg-white"
            }`}
          />
        ))}
      </div>

    </section>
  );
}