import React, { FC } from 'react';

/**
 * PolicyPage component renders the complete Privacy Policy document.
 * Using Tailwind CSS for a modern, responsive, and readable layout.
 * This is designed as a Next.js page component.
 */
const PolicyPage: FC = () => {
    return (
        // Top margin added to ensure content is visible below a typical fixed header
        <div className="min-h-screen pt-20 bg-gray-50">

            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                    <div className="p-8 md:p-12">
                        {/* Header */}
                        <div className="border-b border-gray-200 pb-6 mb-8">
                            <h1 className="text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
                            <div className="mt-3 text-sm text-gray-600">
                                <p>Effective Date: December 01, 2025</p>
                                <p>Last Updated: December 17, 2025</p>
                                <p>
                                    Website:{' '}
                                    <a
                                        href="https://influence-me.in"
                                        className="text-indigo-600 hover:text-indigo-800 hover:underline transition duration-150"
                                    >
                                        https://influence-me.in
                                    </a>
                                </p>
                            </div>
                        </div>

                        {/* Introduction */}
                        <section className="mt-8">
                            <p className="text-gray-700 leading-relaxed">
                                Thank you for using <strong>InfluenceMe</strong> (also known as <strong>Influence-Me</strong>). Your privacy is very important to us. Our users are at the center of everything we do, and we are committed to providing you with a secure and personalized experience.
                            </p>
                            <p className="mt-4 text-gray-700 leading-relaxed">
                                This Privacy Policy explains what information we collect, why we collect it, how we use it, and the choices you have. It applies to our website and our mobile application.
                            </p>

                            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                                <h2 className="text-lg font-semibold text-gray-900">Who We Are</h2>
                                <p className="mt-2 text-gray-700">
                                    <strong>App/Service:</strong> InfluenceMe (Influence-Me) — influencer marketing platform.
                                </p>
                                <p className="mt-2 text-gray-700">
                                    <strong>Business/Owner:</strong> NISA MEDIA LLP.
                                </p>
                                <p className="mt-2 text-gray-700">
                                    <strong>Contact:</strong>{' '}
                                    <a
                                        href="mailto:contact-us@influence-me.in"
                                        className="text-indigo-600 hover:text-indigo-800 hover:underline transition duration-150"
                                    >
                                        contact-us@influence-me.in
                                    </a>
                                </p>
                            </div>
                        </section>

                        {/* Information We Collect */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Information We Collect</h2>
                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                                <p className="mt-4 text-gray-700">
                                    You may browse influenceme.in without revealing personal details. However, to access certain features or services, you may voluntarily provide personal information such as:
                                </p>
                                <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 list-disc pl-5 text-gray-700 marker:text-indigo-500">
                                    <li>Full Name</li>
                                    <li>Email Address</li>
                                    <li>Phone Number</li>
                                    <li>Billing/Shipping Address</li>
                                    <li>Gender, Occupation, Marital Status</li>
                                    <li>Interests and Preferences</li>
                                    <li>Credit Card or Payment Information</li>
                                </ul>
                                <p className="mt-4 text-gray-700">
                                    We may also collect information related to your purchases, order history, or communications with us.
                                </p>
                            </div>

                            {/* Meta Platform Data (Instagram/Facebook) */}
                            <div className="mt-8">
                                <h3 className="text-xl font-semibold text-gray-900">Meta Platform Data (Instagram and Facebook)</h3>
                                <p className="mt-4 text-gray-700">
                                    When you connect your Instagram or Facebook account to Influence-Me, we collect and process Platform Data from Meta (Facebook, Inc.) in accordance with Meta&apos;s Platform Terms. This data is collected only with your explicit consent and authorization through Meta&apos;s OAuth flow.
                                </p>
                                
                                <h4 className="text-lg font-semibold text-gray-900 mt-6">Types of Meta Platform Data We Collect:</h4>
                                <div className="mt-4">
                                    <h5 className="text-base font-semibold text-gray-800 mb-2">Instagram Data (when you connect Instagram Business/Creator account):</h5>
                                    <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1 marker:text-indigo-500">
                                        <li>Profile information: username, profile picture, biography, website URL</li>
                                        <li>Account statistics: follower count, following count, media count</li>
                                        <li>Account type: Business or Creator account status</li>
                                        <li>Media content: posts, images, videos, captions, timestamps</li>
                                        <li>Engagement metrics: likes, comments, shares on your posts</li>
                                        <li>Insights data (if permission granted): impressions, reach, profile views, website clicks, engagement metrics, and analytics data</li>
                                        <li>Account ID: Instagram Business Account ID for API access</li>
                                    </ul>
                                </div>

                                <div className="mt-4">
                                    <h5 className="text-base font-semibold text-gray-800 mb-2">Facebook Data (when you connect Facebook Page):</h5>
                                    <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1 marker:text-indigo-500">
                                        <li>Page information: page name, page ID, category, profile picture</li>
                                        <li>Page statistics: fan count (followers), page likes</li>
                                        <li>Page posts: content, images, videos, captions, timestamps</li>
                                        <li>Engagement metrics: likes, comments, shares on page posts</li>
                                        <li>Page insights (if permission granted): reach, impressions, engagement metrics</li>
                                    </ul>
                                </div>

                                <p className="mt-4 text-gray-700">
                                    <strong>How We Obtain This Data:</strong> We access Meta Platform Data through Meta&apos;s official APIs (Instagram Graph API and Facebook Graph API) using access tokens that you authorize through Meta&apos;s OAuth consent flow. We do not store your Meta account passwords.
                                </p>
                            </div>
                        </section>

                        {/* How We Use Your Information */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">How We Use Your Information</h2>
                            <p className="mt-4 text-gray-700">
                                We may use the information we collect to:
                            </p>
                            <ul className="mt-4 space-y-2 list-disc pl-5 text-gray-700 marker:text-indigo-500">
                                <li>Process and fulfill your orders</li>
                                <li>Communicate with you regarding your transactions or inquiries</li>
                                <li>Customize and enhance your browsing experience</li>
                                <li>Improve our products, services, and customer support</li>
                                <li>Detect and prevent fraud or abuse</li>
                                <li>Send promotional materials, offers, or updates that may interest you</li>
                                <li>Analyze website usage and customer preferences</li>
                                <li>Comply with legal obligations and protect our legal rights</li>
                            </ul>

                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900">How We Use Meta Platform Data</h3>
                                <p className="mt-4 text-gray-700">
                                    We use Meta Platform Data (Instagram and Facebook data) exclusively for the following purposes:
                                </p>
                                <ul className="mt-4 space-y-2 list-disc pl-5 text-gray-700 marker:text-indigo-500">
                                    <li><strong>Profile Display:</strong> To display your Instagram or Facebook profile information (username, profile picture, bio, follower count) to brands and potential collaborators on our platform</li>
                                    <li><strong>Content Portfolio:</strong> To showcase your Instagram posts, images, videos, and Facebook page content to brands for collaboration opportunities</li>
                                    <li><strong>Analytics and Insights:</strong> To calculate and display engagement metrics, analytics, and insights (impressions, reach, profile views, etc.) to help brands evaluate your content performance</li>
                                    <li><strong>Platform Matching:</strong> To match influencers with brands based on follower count, engagement rates, content type, and other metrics</li>
                                    <li><strong>Account Verification:</strong> To verify that you own and operate the connected social media accounts</li>
                                    <li><strong>Service Improvement:</strong> To improve our matching algorithms and platform features (using aggregated, anonymized data only)</li>
                                </ul>
                                <p className="mt-4 text-gray-700">
                                    <strong>We do NOT:</strong> Sell Meta Platform Data to third parties, use it for advertising purposes outside our platform, or share it with unauthorized parties. We only use this data to provide the core functionality of our influencer marketing platform.
                                </p>
                            </div>
                        </section>

                        {/* Information Sharing */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Information Sharing</h2>
                            
                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900">Sharing of Meta Platform Data</h3>
                                <p className="mt-4 text-gray-700">
                                    <strong>With Brands and Potential Collaborators:</strong> When you connect your Instagram or Facebook account, we share your public profile information and content portfolio with brands registered on our platform who are seeking influencer collaboration opportunities. This includes:
                                </p>
                                <ul className="mt-4 list-disc pl-5 text-gray-700 space-y-2 marker:text-indigo-500">
                                    <li>Your Instagram username, profile picture, biography, and follower count</li>
                                    <li>Your Instagram posts, images, and videos (as displayed on your public Instagram profile)</li>
                                    <li>Engagement metrics and analytics (likes, comments, engagement rates, insights data)</li>
                                    <li>Your Facebook page name, profile picture, fan count, and public page posts</li>
                                </ul>
                                <p className="mt-4 text-gray-700">
                                    This sharing is essential for our platform&apos;s core functionality: connecting influencers with brands. Brands can only view your public profile data and content that you have already made public on Instagram or Facebook. We do not share your private messages, email addresses, phone numbers, or any non-public data from your Meta accounts.
                                </p>
                                <p className="mt-4 text-gray-700">
                                    <strong>With Meta (Facebook, Inc.):</strong> We share certain information with Meta as required by Meta&apos;s Platform Terms, including:
                                </p>
                                <ul className="mt-4 list-disc pl-5 text-gray-700 space-y-2 marker:text-indigo-500">
                                    <li>Access tokens and API usage data for authentication and data access</li>
                                    <li>Data deletion requests when you request removal of your Meta Platform Data</li>
                                    <li>Compliance reports as required by Meta&apos;s Platform Terms</li>
                                </ul>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900">With Third-Party Service Providers</h3>
                                <p className="mt-4 text-gray-700">
                                    We work with trusted partners to provide services such as:
                                </p>
                                <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 list-disc pl-5 text-gray-700 marker:text-indigo-500">
                                    <li>Payment processing</li>
                                    <li>Order fulfillment and shipping</li>
                                    <li>Website hosting and analytics</li>
                                    <li>Email marketing and communications</li>
                                </ul>
                                <p className="mt-4 text-gray-700">
                                    These partners are granted access to your information only as necessary to perform their services and are obligated to maintain confidentiality. <strong>We do not share Meta Platform Data with third-party service providers except as necessary for platform hosting and technical operations (e.g., storing data on secure servers).</strong>
                                </p>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900">Legal Compliance & Fraud Prevention</h3>
                                <p className="mt-4 text-gray-700">
                                    We may disclose your information if required to:
                                </p>
                                <ul className="mt-4 list-disc pl-5 text-gray-700 space-y-2 marker:text-indigo-500">
                                    <li>Comply with legal obligations or governmental requests</li>
                                    <li>Investigate suspected fraud or violations of our policies</li>
                                    <li>Protect the safety of users or others</li>
                                    <li>Enforce our agreements and legal rights</li>
                                </ul>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-xl font-semibold text-gray-900">Business Transfers</h3>
                                <p className="mt-4 text-gray-700">
                                    In the event of a merger, acquisition, or sale of assets, your personal information may be part of the transferred business assets.
                                </p>
                            </div>
                        </section>

                        {/* Non-Personal and Anonymous Data */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Non-Personal and Anonymous Data</h2>
                            <p className="mt-4 text-gray-700">
                                We may collect non-identifiable information through cookies, IP addresses, and similar technologies. This helps us analyze website performance, user behavior, and demographic trends. This data is used in aggregate and does not identify individual users.
                            </p>
                        </section>

                        {/* Cookies and Tracking Technologies */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Cookies and Tracking Technologies</h2>
                            <p className="mt-4 text-gray-700">
                                Influence-Me uses cookies, web beacons, and similar tools to enhance user experience and gather analytics. These tools help us:
                            </p>
                            <ul className="mt-4 list-disc pl-5 text-gray-700 space-y-2 marker:text-indigo-500">
                                <li>Track visits and interactions</li>
                                <li>Understand preferences and behavior</li>
                                <li>Measure marketing effectiveness</li>
                                <li>Personalize content and offers</li>
                            </ul>
                            <p className="mt-4 text-gray-700">
                                You may disable cookies in your browser settings, but some features of our site may not function properly as a result.
                            </p>
                        </section>

                        {/* Third-Party Information */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Third-Party Information</h2>
                            <p className="mt-4 text-gray-700">
                                If you refer a friend or use a gift service, we may request their email address or shipping details to fulfill your request. This information is used solely for that purpose and is not shared or stored beyond its necessity.
                            </p>
                        </section>

                        {/* User Content and Public Forums */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">User Content and Public Forums</h2>
                            <p className="mt-4 text-gray-700">
                                We may publish testimonials or customer stories with prior consent. Our site may also include blogs or forums where any information disclosed becomes public. Please use discretion. For removal requests, contact us at <a href="mailto:contact-us@influenceme.in" className="text-indigo-600 hover:text-indigo-800 hover:underline transition duration-150">contact-us@influenceme.in</a>.
                            </p>
                        </section>

                        {/* Children’s Privacy */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Children’s Privacy</h2>
                            <p className="mt-4 text-gray-700">
                                Influence-Me does not knowingly collect personal data from children under 13. If such information is inadvertently collected, it will be promptly deleted.
                            </p>
                        </section>

                        {/* External Links */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">External Links</h2>
                            <p className="mt-4 text-gray-700">
                                Our website may link to third-party sites. We are not responsible for their privacy practices and encourage you to review their policies separately.
                            </p>
                        </section>

                        {/* Data Security */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Data Security</h2>
                            <p className="mt-4 text-gray-700">
                                We implement robust security measures, including SSL encryption, to protect your personal information. While we strive for complete security, no method of transmission over the Internet is 100% secure.
                            </p>
                        </section>

                        {/* Accessing, Updating, or Deleting Your Information */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Accessing, Updating, or Deleting Your Information</h2>
                            <p className="mt-4 text-gray-700">
                                You may access, correct, or request deletion of your personal data by:
                            </p>
                            <ul className="mt-4 list-disc pl-5 text-gray-700 space-y-2 marker:text-indigo-500">
                                <li>Logging into your account and visiting the account settings page</li>
                                <li>Emailing us at <a href="mailto:contact-us@influenceme.in" className="text-indigo-600 hover:text-indigo-800 hover:underline transition duration-150">contact-us@influenceme.in</a></li>
                            </ul>
                            <p className="mt-4 text-gray-700">
                                We retain your data as long as your account is active or as required by law.
                            </p>
                        </section>

                        {/* Your Choices */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Your Choices</h2>
                            <p className="mt-4 text-gray-700">
                                You can opt out of promotional communications at any time by:
                            </p>
                            <ul className="mt-4 list-disc pl-5 text-gray-700 space-y-2 marker:text-indigo-500">
                                <li>Clicking the &ldquo;unsubscribe&rdquo; link in our emails</li>
                                <li>Contacting our customer service team</li>
                                <li>Informing us during a call</li>
                            </ul>
                            <p className="mt-4 text-gray-700">
                                <span className="font-bold">Please note:</span> Service-related communications (e.g., order confirmations) are essential and not subject to opt-out.
                            </p>
                        </section>

                        {/* Changes to this Policy */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Changes to this Policy</h2>
                            <p className="mt-4 text-gray-700">
                                We may update this Privacy Policy periodically. Continued use of our website after changes are posted constitutes your acceptance of the revised policy.
                            </p>
                        </section>

                        {/* Contact Us */}
                        <section className="mt-12">
                            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Contact Us</h2>
                            <p className="mt-4 text-gray-700">
                                If you have questions or concerns about this Privacy Policy or your data, please contact us at:
                            </p>
                            <p className="mt-2">
                                <a href="mailto:contact-us@influenceme.in" className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline transition duration-150">📧 contact-us@influenceme.in</a>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyPage;