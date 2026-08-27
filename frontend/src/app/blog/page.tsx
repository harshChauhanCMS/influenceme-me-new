"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAllBlogs, Blog } from "@/services/blogService";
import Image from "next/image";
import { Metadata } from "next";

const BlogPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    tag: "",
    search: "",
    sort: "publishedAt" as "publishedAt" | "views" | "recent",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.97,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 20,
        mass: 0.5,
      },
    },
  };

  // Fetch blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const data = await getAllBlogs({
          page: 1,
          limit: 12,
          ...filters,
        });
        setBlogs(data.blogs);
        
        // Extract unique categories and tags
        const uniqueCategories = [...new Set(data.blogs.map(b => b.category))];
        const uniqueTags = [...new Set(data.blogs.flatMap(b => b.tags))];
        setCategories(uniqueCategories);
        setTags(uniqueTags);
        
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch blogs:", err);
        setError(err.message || "Failed to load blogs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>Blog - Influence Me | Latest Articles & Insights</title>
        <meta name="description" content="Discover the latest articles, insights, and stories about influencer marketing, brand collaborations, and creative partnerships." />
        <meta name="keywords" content="influencer marketing, brand collaboration, creative partnerships, marketing insights, social media" />
        <meta property="og:title" content="Blog - Influence Me" />
        <meta property="og:description" content="Discover the latest articles, insights, and stories about influencer marketing." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://influence-me.in/blog" />
      </head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-[#452C80] to-[#636B2F] text-white py-20 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Our Blog
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
                Discover insights, stories, and expert tips on influencer marketing and brand collaborations
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="bg-white border-b border-gray-200 sticky top-20 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#452C80] focus:border-transparent"
                />
              </div>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#452C80] focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={filters.tag}
                onChange={(e) => handleFilterChange("tag", e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#452C80] focus:border-transparent"
              >
                <option value="">All Tags</option>
                {tags.slice(0, 10).map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#452C80] focus:border-transparent"
              >
                <option value="publishedAt">Latest</option>
                <option value="views">Most Viewed</option>
                <option value="recent">Recent</option>
              </select>
            </div>
          </div>
        </section>

        {/* Blogs Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#452C80]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#452C80] text-white rounded-lg hover:bg-[#371f6a] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No blogs found matching your criteria.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {blogs.map((blog) => (
                <Link key={blog._id} href={`/blog/${blog.slug || blog._id}`}>
                  <motion.article
                    variants={cardVariants}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden border border-gray-100"
                  >
                    {/* Featured Image */}
                    <div className="relative aspect-video overflow-hidden bg-gray-200">
                      {blog.featuredImage ? (
                        <Image
                          src={blog.featuredImage}
                          alt={blog.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#452C80] to-[#636B2F]">
                          <span className="text-white text-2xl font-bold">{blog.title.charAt(0)}</span>
                        </div>
                      )}
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-[#8CC342] text-white text-sm font-semibold rounded-full">
                          {blog.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#452C80] transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {blog.excerpt}
                      </p>
                      
                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-2">
                          <span>{blog.author}</span>
                          <span>•</span>
                          <span>{blog.readingTime} min read</span>
                        </div>
                        <span>{blog.views} views</span>
                      </div>

                      {/* Tags */}
                      {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {blog.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Read More */}
                      <div className="flex items-center text-[#8CC342] font-semibold group-hover:text-[#7db238] transition-colors">
                        Read More
                        <svg
                          className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.article>
                </Link>
              ))}
            </motion.div>
          )}
        </section>
      </main>
    </>
  );
};

export default BlogPage;
