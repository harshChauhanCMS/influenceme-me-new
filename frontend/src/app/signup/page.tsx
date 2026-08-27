"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import UserService from "@/services/userService";
import { countryCodes } from "@/utils/countryCodes";

interface FormData {
    fullName: string;
    email: string;
    countryCode: string;
    phone: string;
    password: string;
    website: string;
}

interface Errors {
    [key: string]: string;
}

const SignUp = () => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>({
        fullName: "",
        email: "",
        countryCode: "+91",
        phone: "",
        password: "",
        website: "",
    });
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const validateStep1 = (): boolean => {
        const newErrors: Errors = {};
        if (!form.fullName) newErrors.fullName = "Full name is required";
        if (!form.email) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Enter a valid email address";
        }
        if (!form.phone) {
            newErrors.phone = "Phone number is required";
        } else if (!/^\d{7,15}$/.test(form.phone)) {
            newErrors.phone = "Enter a valid phone number (7-15 digits)";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: Errors = {};
        if (!form.password) {
            newErrors.password = "Password is required";
        } else if (form.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }
        if (!form.website) {
            newErrors.website = "Website URL is required";
        } else if (!/^https?:\/\/.+\..+/.test(form.website)) {
            newErrors.website = "Enter a valid URL (e.g., https://www.example.com)";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = () => {
        if (validateStep1()) {
            setStep(2);
            setErrors({});
        }
    };

    const handlePrevStep = () => {
        setStep(1);
        setErrors({});
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Clear specific and general errors
        setErrors((prev) => {
            const updated = { ...prev };
            delete updated[name];
            delete updated.general;
            delete updated.api;
            return updated;
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateStep2()) return;

        setSubmitting(true);
        try {
            // Register user with phone code for international support
            const data = await UserService.register({
                role: "brand",
                name: form.fullName,
                email: form.email,
                phone: form.phone,
                phoneCode: form.countryCode,
                password: form.password,
                websiteUrl: form.website
            });

            if (data.status && data.data !== undefined && data.data !== null && data.data.user !== undefined) {
                login(data.data!.token, data.data!.user);
                router.push("/campaign");
            } else {
                setErrors({
                    api: data.message || "Registration failed. Please try again.",
                });
            }
        } catch (err) {
            const errorMessage = "An unexpected error occurred";
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { errors?: Record<string, string>; message?: string; error?: string } } };
                const serverError = axiosError.response?.data;
                if (serverError?.errors) {
                    setErrors({ ...serverError.errors });
                } else if (serverError?.message) {
                    setErrors({ api: serverError.message });
                } else {
                    setErrors({ api: serverError?.error || JSON.stringify(serverError) });
                }
            } else if (err instanceof Error) {
                setErrors({ api: err.message });
            } else {
                setErrors({ api: errorMessage });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative bg-cover bg-center pt-24 pb-12"
            style={{ backgroundImage: "url('/background.webp')" }}
        >
            <div
                className="relative z-10 w-full max-w-md bg-gray-100 rounded-3xl shadow-lg p-8 border border-green-200"
                style={{
                    fontFamily: "League Spartan, sans-serif",
                    borderRadius: "32px",
                    borderColor: "#b6e388",
                }}
            >
                <h2 className="text-4xl font-bold text-center mb-2 text-purple-800">
                    Sign Up
                </h2>
                
                {/* Step Indicator */}
                <div className="flex justify-center items-center mb-6">
                    <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                            step === 1 ? 'bg-purple-800 text-white' : 'bg-green-200 text-purple-800'
                        }`}>
                            1
                        </div>
                        <div className={`w-16 h-1 ${step === 2 ? 'bg-purple-800' : 'bg-gray-300'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                            step === 2 ? 'bg-purple-800 text-white' : 'bg-gray-300 text-gray-500'
                        }`}>
                            2
                        </div>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-600 mb-6">
                    {step === 1 ? 'Personal Information' : 'Account Details'}
                </p>

                <form className="space-y-6" onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit} noValidate>
                    {/* Step 1: Personal Information */}
                    {step === 1 && (
                        <>
                    {/* Full Name */}
                    <div>
                        <label
                            htmlFor="fullName"
                            className="block text-base font-medium mb-1 text-black"
                        >
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            autoComplete="name"
                            value={form.fullName}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                errors.fullName
                                    ? "border-red-500 focus:ring-red-300"
                                    : "border-gray-300 focus:ring-purple-300"
                            }`}
                            placeholder="John Doe"
                        />
                        {errors.fullName && (
                            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-base font-medium mb-1 text-black"
                        >
                            Work Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                errors.email
                                    ? "border-red-500 focus:ring-red-300"
                                    : "border-gray-300 focus:ring-purple-300"
                            }`}
                            placeholder="name@company.com"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label
                            htmlFor="phone"
                            className="block text-base font-medium mb-1 text-black"
                        >
                            Phone Number
                        </label>
                        <div className="flex gap-2">
                            {/* Country Code Selector */}
                            <select
                                name="countryCode"
                                value={form.countryCode}
                                onChange={handleChange}
                                className="rounded-lg border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white cursor-pointer"
                                style={{ minWidth: '110px' }}
                            >
                                {countryCodes.map((country) => (
                                    <option key={country.code} value={country.dial}>
                                        {country.flag} {country.dial}
                                    </option>
                                ))}
                            </select>
                            
                            {/* Phone Number Input */}
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                value={form.phone}
                                onChange={handleChange}
                                className={`flex-1 rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                    errors.phone
                                        ? "border-red-500 focus:ring-red-300"
                                        : "border-gray-300 focus:ring-purple-300"
                                }`}
                                placeholder="1234567890"
                            />
                        </div>
                        {errors.phone && (
                            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                        )}
                    </div>
                    </>
                    )}

                    {/* Step 2: Account Details */}
                    {step === 2 && (
                        <>
                    {/* Password */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-base font-medium mb-1 text-black"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                errors.password
                                    ? "border-red-500 focus:ring-red-300"
                                    : "border-gray-300 focus:ring-purple-300"
                            }`}
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                        )}
                    </div>

                    {/* Website */}
                    <div>
                                <label
                            htmlFor="website"
                            className="block text-base font-medium mb-1 text-black"
                        >
                            Website URL
                                </label>
                                <input
                            id="website"
                            name="website"
                            type="url"
                            autoComplete="url"
                            value={form.website}
                                    onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 ${
                                errors.website
                                            ? "border-red-500 focus:ring-red-300"
                                    : "border-gray-300 focus:ring-purple-300"
                                    }`}
                            placeholder="https://www.yourcompany.com"
                                />
                        {errors.website && (
                            <p className="text-red-500 text-sm mt-1">{errors.website}</p>
                                )}
                            </div>
                    </>
                    )}

                    {/* Error message */}
                    {(errors.api || errors.general) && (
                        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-red-700 text-center">
                                {errors.api || errors.general}
                            </p>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex gap-3">
                        {step === 2 && (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="w-full bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-lg mt-2 transition-colors hover:bg-gray-400"
                            >
                                Back
                            </button>
                        )}
                    <button
                        type="submit"
                        disabled={submitting}
                            className={`w-full bg-purple-800 text-white font-semibold py-3 rounded-xl text-lg mt-2 transition-colors ${
                            submitting
                                ? "opacity-70 cursor-not-allowed"
                                    : "hover:bg-purple-900"
                        }`}
                    >
                            {submitting ? "Creating Account..." : step === 1 ? "Next" : "Sign Up"}
                    </button>
                    </div>
                </form>

                <div className="text-center mt-6 text-base text-black">
                    Already have an account?{" "}
                    <button
                        className="text-purple-800 font-semibold hover:underline"
                        onClick={() => router.push("/login")}
                    >
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignUp;