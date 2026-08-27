import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CMSPage from '../models/cmsPage';

// Load environment variables
dotenv.config();

// Privacy Policy Content (HTML format)
const privacyPolicyContent = `
<div class="privacy-policy">
  <div class="header">
    <h1>Privacy Policy</h1>
    <div class="meta-info">
      <p>Effective Date: December 01, 2025</p>
      <p>Last Updated: December 17, 2025</p>
      <p>Website: <a href="https://influence-me.in">https://influence-me.in</a></p>
    </div>
  </div>

  <section>
    <p>Thank you for using <strong>InfluenceMe</strong> (also known as <strong>Influence-Me</strong>). Your privacy is very important to us. Our users are at the center of everything we do, and we are committed to providing you with a secure and personalized experience.</p>
    <p>This Privacy Policy explains what information we collect, why we collect it, how we use it, and the choices you have. It applies to our website and our mobile application.</p>

    <div class="info-box">
      <h2>Who We Are</h2>
      <p><strong>App/Service:</strong> InfluenceMe (Influence-Me) — influencer marketing platform.</p>
      <p><strong>Business/Owner:</strong> NISA MEDIA LLP.</p>
      <p><strong>Contact:</strong> <a href="mailto:contact-us@influence-me.in">contact-us@influence-me.in</a></p>
    </div>
  </section>

  <section>
    <h2>Information We Collect</h2>
    <h3>Personal Information</h3>
    <p>You may browse influenceme.in without revealing personal details. However, to access certain features or services, you may voluntarily provide personal information such as:</p>
    <ul>
      <li>Full Name</li>
      <li>Email Address</li>
      <li>Phone Number</li>
      <li>Billing/Shipping Address</li>
      <li>Gender, Occupation, Marital Status</li>
      <li>Interests and Preferences</li>
      <li>Credit Card or Payment Information</li>
    </ul>
    <p>We may also collect information related to your purchases, order history, or communications with us.</p>

    <h3>Meta Platform Data (Instagram and Facebook)</h3>
    <p>When you connect your Instagram or Facebook account to Influence-Me, we collect and process Platform Data from Meta (Facebook, Inc.) in accordance with Meta's Platform Terms. This data is collected only with your explicit consent and authorization through Meta's OAuth flow.</p>
    
    <h4>Types of Meta Platform Data We Collect:</h4>
    <h5>Instagram Data (when you connect Instagram Business/Creator account):</h5>
    <ul>
      <li>Profile information: username, profile picture, biography, website URL</li>
      <li>Account statistics: follower count, following count, media count</li>
      <li>Account type: Business or Creator account status</li>
      <li>Media content: posts, images, videos, captions, timestamps</li>
      <li>Engagement metrics: likes, comments, shares on your posts</li>
      <li>Insights data (if permission granted): impressions, reach, profile views, website clicks, engagement metrics, and analytics data</li>
      <li>Account ID: Instagram Business Account ID for API access</li>
    </ul>

    <h5>Facebook Data (when you connect Facebook Page):</h5>
    <ul>
      <li>Page information: page name, page ID, category, profile picture</li>
      <li>Page statistics: fan count (followers), page likes</li>
      <li>Page posts: content, images, videos, captions, timestamps</li>
      <li>Engagement metrics: likes, comments, shares on page posts</li>
      <li>Page insights (if permission granted): reach, impressions, engagement metrics</li>
    </ul>

    <p><strong>How We Obtain This Data:</strong> We access Meta Platform Data through Meta's official APIs (Instagram Graph API and Facebook Graph API) using access tokens that you authorize through Meta's OAuth consent flow. We do not store your Meta account passwords.</p>
  </section>

  <section>
    <h2>How We Use Your Information</h2>
    <p>We may use the information we collect to:</p>
    <ul>
      <li>Process and fulfill your orders</li>
      <li>Communicate with you regarding your transactions or inquiries</li>
      <li>Customize and enhance your browsing experience</li>
      <li>Improve our products, services, and customer support</li>
      <li>Detect and prevent fraud or abuse</li>
      <li>Send promotional materials, offers, or updates that may interest you</li>
      <li>Analyze website usage and customer preferences</li>
      <li>Comply with legal obligations and protect our legal rights</li>
    </ul>

    <h3>How We Use Meta Platform Data</h3>
    <p>We use Meta Platform Data (Instagram and Facebook data) exclusively for the following purposes:</p>
    <ul>
      <li><strong>Profile Display:</strong> To display your Instagram or Facebook profile information (username, profile picture, bio, follower count) to brands and potential collaborators on our platform</li>
      <li><strong>Content Portfolio:</strong> To showcase your Instagram posts, images, videos, and Facebook page content to brands for collaboration opportunities</li>
      <li><strong>Analytics and Insights:</strong> To calculate and display engagement metrics, analytics, and insights (impressions, reach, profile views, etc.) to help brands evaluate your content performance</li>
      <li><strong>Platform Matching:</strong> To match influencers with brands based on follower count, engagement rates, content type, and other metrics</li>
      <li><strong>Account Verification:</strong> To verify that you own and operate the connected social media accounts</li>
      <li><strong>Service Improvement:</strong> To improve our matching algorithms and platform features (using aggregated, anonymized data only)</li>
    </ul>
    <p><strong>We do NOT:</strong> Sell Meta Platform Data to third parties, use it for advertising purposes outside our platform, or share it with unauthorized parties. We only use this data to provide the core functionality of our influencer marketing platform.</p>
  </section>

  <section>
    <h2>Information Sharing</h2>
    <h3>Sharing of Meta Platform Data</h3>
    <p><strong>With Brands and Potential Collaborators:</strong> When you connect your Instagram or Facebook account, we share your public profile information and content portfolio with brands registered on our platform who are seeking influencer collaboration opportunities. This includes:</p>
    <ul>
      <li>Your Instagram username, profile picture, biography, and follower count</li>
      <li>Your Instagram posts, images, and videos (as displayed on your public Instagram profile)</li>
      <li>Engagement metrics and analytics (likes, comments, engagement rates, insights data)</li>
      <li>Your Facebook page name, profile picture, fan count, and public page posts</li>
    </ul>
    <p>This sharing is essential for our platform's core functionality: connecting influencers with brands. Brands can only view your public profile data and content that you have already made public on Instagram or Facebook. We do not share your private messages, email addresses, phone numbers, or any non-public data from your Meta accounts.</p>

    <h3>With Third-Party Service Providers</h3>
    <p>We work with trusted partners to provide services such as:</p>
    <ul>
      <li>Payment processing</li>
      <li>Order fulfillment and shipping</li>
      <li>Website hosting and analytics</li>
      <li>Email marketing and communications</li>
    </ul>
    <p>These partners are granted access to your information only as necessary to perform their services and are obligated to maintain confidentiality.</p>

    <h3>Legal Compliance & Fraud Prevention</h3>
    <p>We may disclose your information if required to:</p>
    <ul>
      <li>Comply with legal obligations or governmental requests</li>
      <li>Investigate suspected fraud or violations of our policies</li>
      <li>Protect the safety of users or others</li>
      <li>Enforce our agreements and legal rights</li>
    </ul>
  </section>

  <section>
    <h2>Data Security</h2>
    <p>We implement robust security measures, including SSL encryption, to protect your personal information. While we strive for complete security, no method of transmission over the Internet is 100% secure.</p>
  </section>

  <section>
    <h2>Accessing, Updating, or Deleting Your Information</h2>
    <p>You may access, correct, or request deletion of your personal data by:</p>
    <ul>
      <li>Logging into your account and visiting the account settings page</li>
      <li>Emailing us at <a href="mailto:contact-us@influenceme.in">contact-us@influenceme.in</a></li>
    </ul>
    <p>We retain your data as long as your account is active or as required by law.</p>
  </section>

  <section>
    <h2>Your Choices</h2>
    <p>You can opt out of promotional communications at any time by:</p>
    <ul>
      <li>Clicking the "unsubscribe" link in our emails</li>
      <li>Contacting our customer service team</li>
      <li>Informing us during a call</li>
    </ul>
    <p><strong>Please note:</strong> Service-related communications (e.g., order confirmations) are essential and not subject to opt-out.</p>
  </section>

  <section>
    <h2>Changes to this Policy</h2>
    <p>We may update this Privacy Policy periodically. Continued use of our website after changes are posted constitutes your acceptance of the revised policy.</p>
  </section>

  <section>
    <h2>Contact Us</h2>
    <p>If you have questions or concerns about this Privacy Policy or your data, please contact us at:</p>
    <p><a href="mailto:contact-us@influenceme.in">contact-us@influenceme.in</a></p>
  </section>
</div>
`;

// Terms & Conditions Content (HTML format)
const termsConditionsContent = `
<div class="terms-conditions">
  <header>
    <h1>Terms & Conditions</h1>
  </header>

  <section>
    <h2>For Influencers</h2>
    <ol>
      <li>Influence-Me connects brands with influencers and content creators (collectively <strong>Influencers</strong>). Final selection for campaigns is at the sole discretion of the brand in collaboration with Influence-Me.</li>
      <li>Influencers must be <strong>18+ years</strong> to participate in any campaign.</li>
      <li>Registered influencers may be showcased to brands for potential collaborations.</li>
      <li>Influencers must ensure content doesn't negatively impact brands. Violations may result in termination of collaboration and financial liability.</li>
      <li>No participation in campaigns with conflicts of interest (including employer/competitor campaigns).</li>
      <li>Must provide accurate platform and audience data. <strong>Misrepresentation voids agreements</strong>.</li>
      <li>Payments require:
        <ul>
          <li>Published content approved in writing by Influence-Me</li>
          <li>Performance analytics submitted within 7 days of going live</li>
        </ul>
      </li>
      <li>Unapproved content must be removed with no payment issued.</li>
      <li>Payments processed within <strong>4 weeks</strong> after receiving analytics.</li>
      <li>Influencers are tax responsible. TDS deducted where applicable. PAN required above statutory thresholds.</li>
      <li>Payment methods: Bank transfer (with valid ID) or pre-agreed e-vouchers.</li>
      <li><strong>Direct brand solicitation prohibited</strong>. Violations result in account suspension.</li>
      <li>Contact: <a href="mailto:support@influence-me.in">support@influence-me.in</a></li>
      <li>Fraudulent metric manipulation voids agreements and payments.</li>
      <li><strong>Mandatory Disclosure:</strong> All content must clearly state: "<strong>Sponsored in collaboration with Influence-Me</strong>" or "<strong>Ad in collaboration with Influence-Me</strong>".</li>
      <li>Legal disputes fall under the jurisdiction of the <strong>High Court of Chennai</strong>.</li>
      <li>Influence-Me reserves right to modify terms without prior notice.</li>
      <li>Compliance with <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a> required.</li>
    </ol>
  </section>

  <section>
    <h2>For Brands</h2>
    <ol>
      <li>Influence-Me facilitates brand-influencer collaborations across India. Campaign launch implies agreement to:</li>
      <li>Provide complete and accurate product/service information pre-campaign.</li>
      <li>Pay agreed influencer incentives upon shortlisting.</li>
      <li>Influence-Me disburses payments upon campaign completion.</li>
      <li>Influence-Me reserves right to compensate influencers if engagement is fulfilled during disputes.</li>
      <li>No false/misleading information to influencers or Influence-Me.</li>
      <li>Brands responsible for all applicable campaign-related taxes.</li>
    </ol>
  </section>
</div>
`;

// About Us Content (HTML format)
const aboutUsContent = `
<div class="about-us">
  <section>
    <h1>Welcome to Influence-Me</h1>
    <h2>— where influencers, brands, and vendors unite</h2>
    
    <p>We're a vibrant, forward-thinking team of experienced entrepreneurs with a bold vision: to create a seamless platform that empowers influencers and businesses—hospitality, lifestyle, health & wellness, beauty, fashion and more—to easily find and build powerful partnerships.</p>
    
    <p>At Influence-Me, we believe in the power of purposeful collaboration. Our platform bridges the gap between influencers and brands, simplifying the process of discovering the right partners for impactful campaigns.</p>
  </section>
</div>
`;

const seedCMSPages = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ MONGO_URI not found in environment variables');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Seed Privacy Policy
        const privacyPolicy = await CMSPage.findOneAndUpdate(
            { pageType: 'privacy_policy' },
            {
                pageType: 'privacy_policy',
                title: 'Privacy Policy',
                content: privacyPolicyContent,
                metaTitle: 'Privacy Policy - InfluenceMe',
                metaDescription: 'Learn how InfluenceMe protects your privacy and handles your personal information.',
                isActive: true,
                version: 1,
            },
            { upsert: true, new: true }
        );
        console.log('✅ Privacy Policy seeded');

        // Seed Terms & Conditions
        const termsConditions = await CMSPage.findOneAndUpdate(
            { pageType: 'terms_conditions' },
            {
                pageType: 'terms_conditions',
                title: 'Terms & Conditions',
                content: termsConditionsContent,
                metaTitle: 'Terms & Conditions - InfluenceMe',
                metaDescription: 'Read the terms and conditions for using InfluenceMe platform.',
                isActive: true,
                version: 1,
            },
            { upsert: true, new: true }
        );
        console.log('✅ Terms & Conditions seeded');

        // Seed About Us
        const aboutUs = await CMSPage.findOneAndUpdate(
            { pageType: 'about_us' },
            {
                pageType: 'about_us',
                title: 'About InfluenceMe',
                content: aboutUsContent,
                metaTitle: 'About Us - InfluenceMe',
                metaDescription: 'Learn more about InfluenceMe, where influencers, brands, and vendors unite.',
                isActive: true,
                version: 1,
            },
            { upsert: true, new: true }
        );
        console.log('✅ About Us seeded');

        console.log('\n🎉 All CMS pages seeded successfully!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding CMS pages:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run the seed function
seedCMSPages();

