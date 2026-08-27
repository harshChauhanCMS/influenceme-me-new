'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const CircularCategoryIcons = () => {
  const router = useRouter();

  const categories = [
    { id: "ENTERTAINMENT", label: "ENTERTAINMENT", icon: "/filters/ENTERTAINMENT.png" },
    { id: "LIFESTYLE", label: "LIFESTYLE", icon: "/filters/yoga_15535063.png" },
    { id: "BEAUTY", label: "BEAUTY", icon: "/filters/BEAUTY.png" },
    { id: "WEDDING", label: "WEDDING", icon: "/filters/wedding-bells_9975718.png" },
    { id: "FASHION", label: "FASHION", icon: "/filters/fashion-design_11643668.png" },
    { id: "WELLNESS", label: "WELLNESS", icon: "/filters/LIFESTYLE.png" },
    { id: "EDUCATION", label: "EDUCATION", icon: "/filters/geography_10736948.png" },
    { id: "PARENTING", label: "PARENTING", icon: "/filters/bonds_17362053.png" },
    { id: "REAL_STATE", label: "REAL ESTATE", icon: "/filters/property.png" },
  ];

  return (
    <div className="py-5 mt-1">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center gap-12 flex-wrap">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => router.push("/signin")}
            >
              <div
                className={`w-15 h-15 rounded-full flex items-center justify-center mb-4 transition-all duration-300 transform group-hover:scale-110 shadow-lg hover:shadow-xl bg-white shadow-md border border-gray-200`}
              >
                <img
                  src={category.icon}
                  alt={category.label}
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors duration-300">
                {category.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CircularCategoryIcons;

