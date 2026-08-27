"use client"

import React, {FC, useState} from 'react';

// --- Types ---
interface FaqItem {
    id: number;
    question: string;
    answer: string;
}

// --- Icons ---

const PlusIcon: FC = () => (
    <svg className="w-5 h-5 text-gray-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const MinusIcon: FC = () => (
    <svg className="w-5 h-5 text-indigo-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
);

const InfoIcon: FC = () => (
    <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// --- Main Component ---

const FaqPage: FC = () => {
    // Use number | null to track the index of the open item
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqData: FaqItem[] = [
        {
            id: 1,
            question: "What is Infusee and how does it work?",
            answer: "Infusee is a platform that connects influencers, brands, and service providers for seamless collaboration. Influencers can find campaigns, brands can discover creators, and vendors can offer services—all in one place."
        },
        {
            id: 2,
            question: "Who can sign up on the platform?",
            answer: "Anyone can sign up—whether you're an influencer, a brand looking to collaborate, or a vendor offering services like photography, styling, or content creation."
        },
        {
            id: 3,
            question: "Is it free to join as an influencer, brand, or vendor?",
            answer: "Yes, signing up is free for all users. Additional premium features or promoted listings may be available at a later stage."
        },
        {
            id: 4,
            question: "How can influencers connect with brands?",
            answer: "Influencers can browse live campaigns, apply directly, or be contacted by brands through the platform's messaging and collaboration tools."
        },
        {
            id: 5,
            question: "How are payments handled for collaborations?",
            answer: "Payments are processed through the platform for security and transparency. Terms are agreed upon before campaign confirmation, and payments are released upon successful completion."
        },
        {
            id: 6,
            question: "Can I use both the website and the app?",
            answer: "Yes! Infusee is available as both a responsive website and a mobile app so you can manage your collaborations on the go."
        },
        {
            id: 7,
            question: "What kind of influencers are eligible to join?",
            answer: "We welcome influencers from all niches and follower sizes—from nano to celebrity-level creators. Authenticity and engagement matter more than just numbers."
        },
        {
            id: 8,
            question: "How do vendors offer their services on the platform?",
            answer: "Vendors can sign up, list their services (e.g., editing, styling, photography), set their availability, and get hired directly by influencers or brands."
        },
        {
            id: 9,
            question: "Can I have multiple roles (influencer, vendor, brand) under one account?",
            answer: "Yes, you can manage multiple roles from one account by toggling between dashboards based on your needs."
        },
        {
            id: 10,
            question: "How is my data kept safe and private?",
            answer: "We use industry-standard encryption and data protection practices. Your personal and financial information is secure and never shared without consent."
        },
        {
            id: 11,
            question: "What should I do if I face a technical issue?",
            answer: "You can reach out to our support team via the 'Help' section in your dashboard or contact us at [support email/contact form]."
        },
        {
            id: 12,
            question: "How do I delete or deactivate my account?",
            answer: "You can request account deactivation from your settings panel or email us directly. Once confirmed, your profile and data will be removed from public view."
        }
    ];

    // Explicitly typing the index as a number
    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen pt-20 bg-gray-50">
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow-2xl rounded-2xl p-8 md:p-12 border border-gray-100">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-lg text-gray-600">
                            Find answers to common questions about our platform and services.
                        </p>
                        <div className="h-0.5 w-16 bg-indigo-500 mx-auto mt-4" />
                    </div>

                    <div className="space-y-4">
                        {faqData.map((faq, index) => (
                            <div
                                key={faq.id}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300"
                            >
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className={`w-full flex justify-between items-center text-left p-5 group transition-colors duration-200 ${
                                        openIndex === index ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
                                    }`}
                                    aria-expanded={openIndex === index}
                                >
                                    <h3 className={`text-lg font-semibold transition-colors duration-200 ${
                                        openIndex === index ? 'text-indigo-800' : 'text-gray-900'
                                    }`}>
                                        {faq.question}
                                    </h3>
                                    <div className="ml-4 flex-shrink-0">
                                        {openIndex === index ? (
                                            <MinusIcon />
                                        ) : (
                                            <PlusIcon />
                                        )}
                                    </div>
                                </button>

                                <div
                                    // Uses max-height for fluid CSS transition
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                        openIndex === index
                                            ? 'max-h-96 opacity-100 pt-3 pb-5'
                                            : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <div className="space-y-3 text-gray-700 px-5 border-t border-gray-100 pt-4">
                                        <p>{faq.answer}</p>

                                        {/* The informational box originally tied to ID 2 */}
                                        {faq.id === 2 && (
                                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start">
                                                <InfoIcon />
                                                <p className="ml-2 text-sm text-blue-800">
                                                    <span className="font-medium">Note:</span> Payment processing time is 1-3 business days after approval.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaqPage;