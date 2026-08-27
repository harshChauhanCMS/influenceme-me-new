import React, { FC } from 'react';

/**
 * TermsAndConditions component renders the complete Terms & Conditions.
 * It uses Tailwind CSS for styling and is set up as a Next.js page component.
 */
const TermsAndConditionsPage: FC = () => (
    // Outer container with background and padding
    // pt-20 added for consistency with PolicyPage (to clear a potential fixed header)
    <div className="min-h-screen pt-20 bg-gray-50">
        <div className="max-w-5xl mx-auto my-10 px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12 text-gray-800 leading-relaxed font-sans">

                    {/* Header */}
                    <header className="text-center mb-10">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms & Conditions</h1>
                        <div className="h-0.5 w-20 bg-indigo-600 mx-auto" />
                    </header>

                    {/* Section: For Influencers */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-indigo-700 pb-2 border-b border-gray-200 mb-6">For Influencers</h2>
                        <ol className="list-decimal pl-5 marker:font-semibold marker:text-indigo-500">
                            <li className="mb-4 pl-1">
                                Influence-Me connects brands with influencers and content creators (collectively &#34;**Influencers**&#34;).
                                Final selection for campaigns is at the sole discretion of the brand in collaboration with Influence-Me.
                            </li>

                            <li className="mb-4 pl-1">Influencers must be **18+ years** to participate in any campaign.</li>

                            <li className="mb-4 pl-1">
                                Registered influencers may be showcased to brands for potential collaborations.
                            </li>

                            <li className="mb-4 pl-1">
                                Influencers must ensure content doesn&#39;t negatively impact brands. Violations may result in
                                termination of collaboration and financial liability.
                            </li>

                            <li className="mb-4 pl-1">
                                No participation in campaigns with conflicts of interest (including employer/competitor campaigns).
                            </li>

                            <li className="mb-4 pl-1">
                                Must provide accurate platform and audience data. **Misrepresentation voids agreements**.
                            </li>

                            <li className="mb-4 pl-1">
                                Payments require:
                                <ul className="list-disc pl-5 mt-2 marker:text-indigo-500">
                                    <li>Published content approved in writing by Influence-Me</li>
                                    <li>Performance analytics submitted within 7 days of going live</li>
                                </ul>
                            </li>

                            <li className="mb-4 pl-1">
                                Unapproved content must be removed with no payment issued.
                            </li>

                            <li className="mb-4 pl-1">
                                Payments processed within **4 weeks** after receiving analytics.
                            </li>

                            <li className="mb-4 pl-1">
                                Influencers are tax responsible. TDS deducted where applicable. PAN required above statutory thresholds.
                            </li>

                            <li className="mb-4 pl-1">
                                Payment methods: Bank transfer (with valid ID) or pre-agreed e-vouchers.
                            </li>

                            <li className="mb-4 pl-1">
                                **Direct brand solicitation prohibited**. Violations result in account suspension.
                            </li>

                            <li className="mb-4 pl-1">
                                Contact: <a href="mailto:support@influence-me.in" className="text-indigo-600 font-medium hover:underline transition duration-150">support@influenceme.in</a>
                            </li>

                            <li className="mb-4 pl-1">
                                Fraudulent metric manipulation voids agreements and payments.
                            </li>

                            <li className="mb-4 pl-1">
                                **Mandatory Disclosure:** All content must clearly state:
                                &#34;**Sponsored in collaboration with Influence-Me**&#34; or &#34;**Ad in collaboration with Influence-Me**&#34;.
                            </li>

                            <li className="mb-4 pl-1">
                                Legal disputes fall under the jurisdiction of the **High Court of Chennai**.
                            </li>

                            <li className="mb-4 pl-1">
                                Influence-Me reserves right to modify terms without prior notice.
                            </li>

                            <li className="mb-4 pl-1">
                                Compliance with <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline transition duration-150">
                                YouTube Terms of Service
                            </a> required.
                            </li>
                        </ol>
                    </section>

                    {/* Section: For Brands */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-indigo-700 pb-2 border-b border-gray-200 mb-6">For Brands</h2>
                        <ol className="list-decimal pl-5 marker:font-semibold marker:text-indigo-500">
                            <li className="mb-4 pl-1">
                                Influence-Me facilitates brand-influencer collaborations across India. Campaign launch implies agreement to:
                            </li>

                            <li className="mb-4 pl-1">
                                Provide complete and accurate product/service information pre-campaign.
                            </li>

                            <li className="mb-4 pl-1">
                                Pay agreed influencer incentives upon shortlisting.
                            </li>

                            <li className="mb-4 pl-1">
                                Influence-Me disburses payments upon campaign completion.
                            </li>

                            <li className="mb-4 pl-1">
                                Influence-Me reserves right to compensate influencers if engagement is fulfilled during disputes.
                            </li>

                            <li className="mb-4 pl-1">
                                No false/misleading information to influencers or Influence-Me.
                            </li>

                            <li className="mb-4 pl-1">
                                Brands responsible for all applicable campaign-related taxes.
                            </li>
                        </ol>
                    </section>
                </div>
            </div>
        </div>
    </div>
);

export default TermsAndConditionsPage;