"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBlogBySlugOrId, Blog } from "@/services/blogService";
import Image from "next/image";
import Link from "next/link";

const BlogDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const slugOrId = params?.id as string;
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slugOrId) return;
      try {
        setLoading(true);
        const data = await getBlogBySlugOrId(slugOrId);
        setBlog(data.blog);
        setRelatedBlogs(data.relatedBlogs || []);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch blog:", err);
        setError(err.message || "Failed to load blog. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slugOrId]);

  // Update document title and meta tags for SEO
  useEffect(() => {
    if (blog) {
      document.title = blog.metaTitle || blog.title;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', blog.metaDescription || blog.excerpt);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = blog.metaDescription || blog.excerpt;
        document.head.appendChild(meta);
      }

      // Update OG tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', blog.metaTitle || blog.title);
      }

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', blog.metaDescription || blog.excerpt);
      }

      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && blog.ogImage) {
        ogImage.setAttribute('content', blog.ogImage);
      } else if (ogImage && blog.featuredImage) {
        ogImage.setAttribute('content', blog.featuredImage);
      }
    }
  }, [blog]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#452C80]"></div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-8 bg-gray-50">
        <p className="text-red-600 mb-4 text-lg">{error || "Blog not found"}</p>
        <Link
          href="/blog"
          className="px-6 py-3 bg-[#452C80] text-white rounded-lg hover:bg-[#371f6a] transition-colors"
        >
          Back to Blogs
        </Link>
      </div>
    );
  }

  const paragraphs = blog.content
    ?.trim()
    ?.split(/\n\s*\n/)
    ?.filter((para) => para.trim() !== "");

  const publishedDate = blog.publishedAt 
    ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "description": blog.excerpt,
            "image": blog.featuredImage || blog.ogImage,
            "datePublished": blog.publishedAt,
            "dateModified": blog.updatedAt,
            "author": {
              "@type": "Person",
              "name": blog.author,
            },
            "publisher": {
              "@type": "Organization",
              "name": "Influence Me",
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://influence-me.in/blog/${blog.slug || blog._id}`,
            },
          }),
        }}
      />

      <div className="bg-white min-h-screen">
        {/* Hero Section with Featured Image */}
        <div className="relative w-full h-[60vh] max-h-[600px] overflow-hidden bg-gradient-to-br from-[#452C80] to-[#636B2F]">
          {blog.featuredImage ? (
            <Image
              src={blog.featuredImage}
              alt={blog.title}
              fill
              className="object-cover opacity-80"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
            <div className="max-w-4xl mx-auto">
              <span className="inline-block px-4 py-2 bg-[#8CC342] text-white text-sm font-semibold rounded-full mb-4">
                {blog.category}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                {blog.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-200">
                <span className="font-medium">{blog.author}</span>
                {publishedDate && (
                  <>
                    <span>•</span>
                    <time>{publishedDate}</time>
                  </>
                )}
                <span>•</span>
                <span>{blog.readingTime} min read</span>
                <span>•</span>
                <span>{blog.views} views</span>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Article Content */}
          <article className="prose prose-lg max-w-none">
            <div 
              className="text-gray-700 leading-relaxed text-lg blog-content"
              dangerouslySetInnerHTML={{ __html: blog.content }}
              style={{
                lineHeight: '1.8',
              }}
            />
          </article>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Share this article:</h3>
            <div className="flex gap-4">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`https://influence-me.in/blog/${blog.slug || blog._id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://influence-me.in/blog/${blog.slug || blog._id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Facebook
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://influence-me.in/blog/${blog.slug || blog._id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>

          {/* Related Blogs */}
          {relatedBlogs && relatedBlogs.length > 0 && (
            <div className="mt-16 pt-12 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedBlogs.map((relatedBlog) => (
                  <Link
                    key={relatedBlog._id}
                    href={`/blog/${relatedBlog.slug || relatedBlog._id}`}
                    className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    {relatedBlog.featuredImage && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={relatedBlog.featuredImage}
                          alt={relatedBlog.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#452C80] transition-colors">
                        {relatedBlog.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                        {relatedBlog.excerpt}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{relatedBlog.readingTime} min read</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default BlogDetailPage;
