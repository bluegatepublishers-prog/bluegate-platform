"use client";

import { useEffect, useState } from "react";

function Counter({
  end,
  suffix = "",
}: {
  end: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;

    const timer = setInterval(() => {
      current += Math.ceil(end / 50);

      if (current >= end) {
        current = end;
        clearInterval(timer);
      }

      setCount(current);
    }, 30);

    return () => clearInterval(timer);
  }, [end]);

  return (
    <h2 className="text-5xl font-bold text-blue-700">
      {count}
      {suffix}
    </h2>
  );
}

export default function Stats() {
  return (
    <section className="bg-white py-20">

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-5">

        <div className="text-center">
          <Counter end={2018} />
          <p className="mt-3 text-gray-600">Founded</p>
        </div>

        <div className="text-center">
          <Counter end={10} suffix="+" />
          <p className="mt-3 text-gray-600">Years Experience</p>
        </div>

        <div className="text-center">
          <Counter end={100} suffix="+" />
          <p className="mt-3 text-gray-600">Books</p>
        </div>

        <div className="text-center">
          <Counter end={500} suffix="+" />
          <p className="mt-3 text-gray-600">Schools</p>
        </div>

        <div className="text-center">
          <Counter end={1} suffix=" Lakh+" />
          <p className="mt-3 text-gray-600">Students</p>
        </div>

      </div>

    </section>
  );
}