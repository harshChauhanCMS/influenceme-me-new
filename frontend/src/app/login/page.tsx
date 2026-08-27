"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import userService from "@/services/userService";
import { useAuth } from "@/context/authContext";

interface FormState {
    email: string;
    password: string;
}

interface Errors {
    email?: string;
    password?: string;
    api?: string;
    general?: string;
}

const LogIn = () => {
    const [form, setForm] = useState<FormState>({ email: "", password: "" });
    const [errors, setErrors] = useState<Errors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    // Validation function
    const validate = (): boolean => {
        const errs: Errors = {};
        if (!form.email) {
            errs.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errs.email = "Enter a valid email address.";
        }
        if (!form.password) {
            errs.password = "Password is required.";
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // Handle input change
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });

        // Clear specific error
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[e.target.name as keyof Errors];
            delete newErrors.general;
            delete newErrors.api;
            return newErrors;
        });
    };

    // Handle form submit
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        try {
            if (!validate()) return;

            setIsSubmitting(true);

            const data = await userService.login({
                email: form.email.trim(),
                password: form.password.trim()
            });

            if (data.status) {
                login(data.data!.token, data.data!.user);

                // Navigate to campaign after login
                setTimeout(() => {
                    try {
                        router.replace("/campaign");
                    } catch (error) {
                        console.error("Navigation error:", error);
                        window.location.href = "/campaign";
                    }
                }, 200);
            } else {
                setErrors({
                    api: data.message || "Login failed. Please try again.",
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
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
            style={{ backgroundImage: "url('/background.webp')" }} // Use /public/background.jpg
        >
            <div
                className="relative z-10 w-full max-w-md bg-gray-100 rounded-3xl shadow-lg p-8 border border-green-200"
                style={{
                    fontFamily: "League Spartan, sans-serif",
                    borderRadius: "32px",
                    borderColor: "#b6e388",
                }}
            >
                <h2 className="text-4xl font-bold text-center mb-8 text-purple-800">
                    Sign In
                </h2>

                <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                    {/* Email */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-base font-medium mb-1 text-black"
                        >
                            Email Address
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

                    {/* Password */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label
                                htmlFor="password"
                                className="block text-base font-medium text-black"
                            >
                                Password
                            </label>
                            <button
                                type="button"
                                className="text-sm text-black font-medium hover:underline"
                                onClick={() => router.push("/forgot-password")}
                            >
                                Forgot password?
                            </button>
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
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

                    {/* Error message */}
                    {(errors.api || errors.general) && (
                        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-red-700 text-center">
                                {errors.api || errors.general}
                            </p>
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full bg-purple-800 text-white font-semibold py-3 rounded-xl text-lg mt-2 transition-colors ${
                            isSubmitting
                                ? "opacity-70 cursor-not-allowed"
                                : "hover:bg-purple-900"
                        }`}
                    >
                        {isSubmitting ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <div className="text-center mt-6 text-base text-black">
                    Don&apos;t have an account?{" "}
                    <button
                        className="text-purple-800 font-semibold hover:underline"
                        onClick={() => router.push("/signup")}
                    >
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogIn;
