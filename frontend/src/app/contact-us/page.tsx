'use client'

import React, { useState, ChangeEvent, FormEvent } from "react";
import {submitContactForm} from "@/services/contactService";
import contactImg from '@/assets/contact.png';
import { Mail, Phone } from 'lucide-react';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
}

interface FormErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    message?: string;
}

const ContactUs: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        if (!fullName) {
            newErrors.firstName = "Full Name is required.";
            newErrors.lastName = "Full Name is required.";
        } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
            newErrors.firstName = "Name should only contain letters.";
            newErrors.lastName = "Name should only contain letters.";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Enter a valid email address.";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required.";
        } else if (!/^\d{10}$/.test(formData.phone)) {
            newErrors.phone = "Enter a valid 10-digit phone number.";
        }

        if (!formData.message.trim()) {
            newErrors.message = "Message is required.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const contactData = {
                    fullName: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                    mobile: formData.phone,
                    message: formData.message,
                };

                await submitContactForm(contactData);

                setShowSuccess(true);
                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    message: "",
                });

                setTimeout(() => setShowSuccess(false), 3000);
            } catch (error) {
                alert("Failed to send message.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center bg-white mt-15 py-10 px-4 sm:px-6 max-w-7xl mx-auto">
            <div className="max-w-6xl w-full bg-transparent flex flex-col md:flex-row items-center justify-between gap-10 mx-auto">
                {/* Left Side: Illustration and Contact Info */}
                <div className="flex-1 flex flex-col items-center justify-center" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
                    <div className="mb-8 w-full flex justify-center md:mr-20 md:justify-start">
                        <img src={contactImg.src} alt="Contact" className="w-170 h-auto" loading="lazy" />
                    </div>

                    <div className="space-y-5 flex flex-col items-center justify-center md:mr-20 text-center">
                        <div className="flex items-center gap-3 justify-center">
                            <EmailSVG />
                            <div>
                                <p className="text-lg font-medium text-black" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                                    Email: <span className="text-md text-[#452C80] hover:text-[#2e1a57] transition-colors">contact-us@influenceme.in</span>
                                </p>

                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-center">
                            <PhoneSVG />
                            <div>
                                <p className="text-lg font-medium text-black" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                                    Contact: <span className="text-md text-[#452C80] hover:text-[#2e1a57] transition-colors">+91 99999 16069</span>
                                </p>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Contact Form - Made shorter */}
                <div className="flex-1 w-full max-w-md bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h2 className="text-3xl font-bold text-center mb-5 text-gray-800" style={{ fontFamily: 'League Spartan, sans-serif' }}>
                        <span className="text-[#452C80]">Get in Touch</span>
                    </h2>

                    {showSuccess ? (
                        <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center animate-fade-in-down">
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                            Message sent successfully!
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label
                                        htmlFor="firstName"
                                        className="block text-sm font-medium mb-1 text-gray-700"
                                        style={{ fontFamily: 'League Spartan, sans-serif' }}
                                    >
                                        First Name *
                                    </label>
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                            errors.firstName ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
                                        }`}
                                    />
                                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                                </div>

                                <div className="flex-1">
                                    <label
                                        htmlFor="lastName"
                                        className="block text-sm font-medium mb-1 text-gray-700"
                                        style={{ fontFamily: 'League Spartan, sans-serif' }}
                                    >
                                        Last Name *
                                    </label>
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                            errors.lastName ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
                                        }`}
                                    />
                                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium mb-1 text-gray-700"
                                    style={{ fontFamily: 'League Spartan, sans-serif' }}
                                >
                                    Email *
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                        errors.email ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
                                    }`}
                                />
                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                            </div>

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-medium mb-1 text-gray-700"
                                    style={{ fontFamily: 'League Spartan, sans-serif' }}
                                >
                                    Phone Number *
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                        errors.phone ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
                                    }`}
                                />
                                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                            </div>

                            <div>
                                <label
                                    htmlFor="message"
                                    className="block text-sm font-medium mb-1 text-gray-700"
                                    style={{ fontFamily: 'League Spartan, sans-serif' }}
                                >
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={4}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                        errors.message ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'
                                    }`}
                                ></textarea>
                                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full bg-[#452C80] text-white font-medium py-3 rounded-lg text-lg mt-2 transition-colors ${
                                    isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#2e1a57]'
                                }`}
                                style={{ fontFamily: 'League Spartan, sans-serif' }}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                                ) : (
                                    'Submit'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

};


const EmailSVG = () => <Mail className="w-8 h-8 text-[#452C80]" strokeWidth={2} />;

const PhoneSVG = () => <Phone className="w-8 h-8 text-[#452C80]" strokeWidth={2} />;

export default ContactUs;