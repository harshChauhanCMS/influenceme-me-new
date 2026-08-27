'use client';

import React from 'react';
import { Mail, Phone, MessageCircle, Clock, MapPin, HelpCircle } from 'lucide-react';
import Link from 'next/link';

const SupportPage: React.FC = () => {
    return (
        <div className="min-h-screen pt-20 bg-gray-50">
            <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                        <span className="text-[#452C80]">Support Center</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        We're here to help! Get in touch with our support team for any questions or assistance.
                    </p>
                </div>

                {/* Contact Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Email Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-center w-16 h-16 bg-[#452C80] bg-opacity-10 rounded-full mb-4 mx-auto">
                            <Mail className="w-8 h-8 text-[#452C80]" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-3" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                            Email Support
                        </h3>
                        <p className="text-gray-600 text-center mb-4">
                            Send us an email and we'll get back to you within 24 hours
                        </p>
                        <a
                            href="mailto:contact-us@influence-me.in"
                            className="block text-center text-[#452C80] font-semibold hover:text-[#2e1a57] transition-colors break-all"
                            style={{ fontFamily: 'League Spartan, sans-serif' }}
                        >
                            contact-us@influence-me.in
                        </a>
                    </div>

                    {/* Phone Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-center w-16 h-16 bg-[#452C80] bg-opacity-10 rounded-full mb-4 mx-auto">
                            <Phone className="w-8 h-8 text-[#452C80]" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-3" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                            Phone Support
                        </h3>
                        <p className="text-gray-600 text-center mb-4">
                            Call us during business hours for immediate assistance
                        </p>
                        <a
                            href="tel:+919999916069"
                            className="block text-center text-[#452C80] font-semibold hover:text-[#2e1a57] transition-colors"
                            style={{ fontFamily: 'League Spartan, sans-serif' }}
                        >
                            +91 99999 16069
                        </a>
                    </div>

                    {/* Contact Form Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-center w-16 h-16 bg-[#452C80] bg-opacity-10 rounded-full mb-4 mx-auto">
                            <MessageCircle className="w-8 h-8 text-[#452C80]" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-3" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                            Contact Form
                        </h3>
                        <p className="text-gray-600 text-center mb-4">
                            Fill out our contact form for detailed inquiries
                        </p>
                        <Link
                            href="/contact-us"
                            className="block text-center text-[#452C80] font-semibold hover:text-[#2e1a57] transition-colors"
                            style={{ fontFamily: 'League Spartan, sans-serif' }}
                        >
                            Go to Contact Form →
                        </Link>
                    </div>
                </div>

                {/* Business Hours & Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Business Hours */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="w-6 h-6 text-[#452C80]" />
                            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                                Business Hours
                            </h2>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-700 font-medium">Monday - Friday</span>
                                <span className="text-gray-900 font-semibold">9:00 AM - 6:00 PM IST</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-700 font-medium">Saturday</span>
                                <span className="text-gray-900 font-semibold">10:00 AM - 4:00 PM IST</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-700 font-medium">Sunday</span>
                                <span className="text-gray-500">Closed</span>
                            </div>
                        </div>
                    </div>

                    {/* Company Information */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <MapPin className="w-6 h-6 text-[#452C80]" />
                            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                                Company Information
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-700 font-medium mb-1">Business Name</p>
                                <p className="text-gray-900 font-semibold">NISA MEDIA LLP</p>
                            </div>
                            <div>
                                <p className="text-gray-700 font-medium mb-1">Website</p>
                                <a
                                    href="https://influence-me.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#452C80] hover:text-[#2e1a57] transition-colors break-all"
                                >
                                    https://influence-me.in
                                </a>
                            </div>
                            <div>
                                <p className="text-gray-700 font-medium mb-1">Service</p>
                                <p className="text-gray-900">Influencer Marketing Platform</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <HelpCircle className="w-6 h-6 text-[#452C80]" />
                        <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                            Frequently Asked Questions
                        </h2>
                    </div>
                    <div className="space-y-4">
                        <div className="border-l-4 border-[#452C80] pl-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">How quickly will I receive a response?</h3>
                            <p className="text-gray-600">
                                We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please call us directly.
                            </p>
                        </div>
                        <div className="border-l-4 border-[#452C80] pl-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">What information should I include in my support request?</h3>
                            <p className="text-gray-600">
                                Please include your name, email address, and a detailed description of your issue or question. If applicable, include screenshots or error messages.
                            </p>
                        </div>
                        <div className="border-l-4 border-[#452C80] pl-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I get help with account setup?</h3>
                            <p className="text-gray-600">
                                Absolutely! Our support team can help you with account registration, profile setup, and navigating the platform. Don't hesitate to reach out.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Link
                            href="/faq"
                            className="text-[#452C80] font-semibold hover:text-[#2e1a57] transition-colors inline-flex items-center gap-2"
                            style={{ fontFamily: 'League Spartan, sans-serif' }}
                        >
                            View All FAQs →
                        </Link>
                    </div>
                </div>

                {/* Additional Resources */}
                <div className="bg-gradient-to-r from-[#452C80] to-[#2e1a57] rounded-2xl shadow-lg p-8 text-white">
                    <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                        Additional Resources
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/policy"
                            className="block p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
                        >
                            <h3 className="font-semibold mb-2">Privacy Policy</h3>
                            <p className="text-sm text-white text-opacity-90">Learn how we protect your data</p>
                        </Link>
                        <Link
                            href="/terms"
                            className="block p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
                        >
                            <h3 className="font-semibold mb-2">Terms of Service</h3>
                            <p className="text-sm text-white text-opacity-90">Read our terms and conditions</p>
                        </Link>
                        <Link
                            href="/about"
                            className="block p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors"
                        >
                            <h3 className="font-semibold mb-2">About Us</h3>
                            <p className="text-sm text-white text-opacity-90">Learn more about Infusee</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportPage;

