# Meta App Review - Instagram Business API Permissions

## App Information
**App Name**: InfluenceMe  
**Platform**: Mobile Application (Android & iOS)  
**Purpose**: Influencer Marketing Platform connecting Brands with Content Creators  
**Submission Date**: October 2025

---

## 📋 Permission Request Summary

We are requesting the following Instagram Business API permissions:

1. ✅ **instagram_business_basic**
2. ✅ **instagram_business_manage_insights**

---

## 1️⃣ instagram_business_basic Permission

### 📝 How This App Uses This Permission

**InfluenceMe** is an influencer marketing platform that connects brands with content creators (influencers). The `instagram_business_basic` permission is essential for our core functionality:

#### **Primary Use Cases:**

1. **Influencer Profile Verification & Display**
   - Allow influencers to connect their Instagram Business accounts during signup/onboarding
   - Verify that the influencer is a legitimate content creator
   - Display authentic Instagram profile information to potential brand partners

2. **Content Portfolio Showcase**
   - Fetch and display the influencer's Instagram media (posts, reels, videos)
   - Show their content library to brands evaluating collaboration opportunities
   - Enable brands to assess content quality and style before engagement

3. **Audience Statistics**
   - Display follower count, following count, and total media count
   - Provide basic account information (username, bio, profile picture, website)
   - Help brands make informed decisions about influencer partnerships

4. **Account Authentication**
   - Verify ownership of Instagram Business accounts
   - Ensure only legitimate influencers with business accounts can register
   - Prevent fraudulent account claims

### 🎯 Detailed Functionality Description

#### **A. Profile Connection Flow**
When an influencer signs up on InfluenceMe:
1. User taps "Connect Instagram" button
2. OAuth flow redirects to Instagram Business login
3. User authorizes the app to access basic profile data
4. App retrieves:
   - Profile ID, username, name
   - Biography and website URL
   - Profile picture
   - Follower count, following count, media count
   - Account type (Business/Creator)

#### **B. Content Gallery Display**
After connection:
1. App fetches recent Instagram media (up to 50 posts)
2. For each media item, we retrieve:
   - Media ID, type (image/video/carousel)
   - Caption text
   - Thumbnail/media URL
   - Timestamp
   - Permalink
   - Like count, comment count
3. Media is displayed in the influencer's profile for brands to review

#### **C. Profile Synchronization**
- Automatic daily sync to keep profile data current
- Manual refresh option for users
- Cached data for offline viewing (24-hour cache)

### 📱 User Experience Flow

**Step 1: Influencer Onboarding**
```
[Signup Screen]
   ↓
[Connect Social Media Screen]
   ↓
[Tap "Connect Instagram Business"] → Instagram OAuth
   ↓
[Grant Permissions] → instagram_business_basic
   ↓
[Profile Data Fetched & Displayed]
   ↓
[Continue to Complete Profile]
```

**Step 2: Brand Viewing Influencer Profile**
```
[Browse Influencers Screen]
   ↓
[Select Influencer]
   ↓
[View Profile with Instagram Data]:
   - Profile Picture & Bio
   - Follower/Following Stats
   - Content Gallery (Posts/Reels)
   - Engagement Metrics
   ↓
[Send Collaboration Offer]
```

### 🎬 Screencast Demonstration

**Screencast will demonstrate:**

1. **Influencer Sign Up & Instagram Connection (0:00-0:45)**
   - Create new influencer account
   - Navigate to "Social Media Links" section
   - Tap "Connect Instagram"
   - Complete Instagram OAuth flow
   - Grant `instagram_business_basic` permission
   - View successfully connected profile

2. **Profile Data Display (0:45-1:30)**
   - Show influencer profile page with:
     - Instagram username and profile picture
     - Follower count, following count, post count
     - Biography and website
   - Navigate to "Content Gallery" tab
   - Scroll through Instagram media grid
   - Tap on individual posts to view details

3. **Brand Perspective (1:30-2:15)**
   - Switch to brand account view
   - Browse available influencers
   - Open an influencer's profile
   - Review Instagram statistics
   - View content portfolio
   - Demonstrate how brands use this data for decision-making

4. **Data Refresh (2:15-2:30)**
   - Pull-to-refresh to sync latest Instagram data
   - Show updated follower count and new posts

### ✅ Compliance with Allowed Usage

**We comply with Instagram Platform Terms and will:**

✅ Only access data for users who explicitly authorize our app  
✅ Display Instagram data only within our app for legitimate business purposes  
✅ Not store media content permanently (only cache URLs for 24 hours)  
✅ Respect user privacy and data deletion requests  
✅ Not use data for advertising or marketing outside app functionality  
✅ Not share Instagram data with third parties without user consent  
✅ Implement proper data security measures (encryption, secure storage)  
✅ Provide clear disclosure of data usage in our Privacy Policy  
✅ Allow users to disconnect Instagram accounts at any time  
✅ Not create derivative works from Instagram content  

### 🔒 Data Security & Privacy

- All API calls use HTTPS/TLS encryption
- Access tokens stored securely using platform-specific secure storage
- Tokens refreshed automatically before expiration
- User can revoke access at any time from app settings
- Comply with GDPR, CCPA, and other privacy regulations

### 📊 Specific API Endpoints Used

```
1. GET /{instagram-business-account-id}
   Fields: id, username, name, biography, profile_picture_url, 
           followers_count, follows_count, media_count, website, account_type

2. GET /{instagram-business-account-id}/media
   Fields: id, caption, media_type, media_url, thumbnail_url, 
           permalink, timestamp, like_count, comments_count

3. GET /{ig-user-id}/media
   To fetch paginated media (limit: 50 per request)
```

---

## 2️⃣ instagram_business_manage_insights Permission

### 📝 How This App Uses This Permission

The `instagram_business_manage_insights` permission enables **InfluenceMe** to provide valuable analytics to both influencers and brands:

#### **Primary Use Cases:**

1. **Influencer Performance Analytics**
   - Provide influencers with insights into their content performance
   - Help creators understand what content resonates with their audience
   - Enable data-driven content strategy decisions

2. **Campaign Performance Tracking**
   - Track performance of sponsored posts created through our platform
   - Measure ROI for brand-influencer collaborations
   - Provide transparent performance reports to brands

3. **Audience Engagement Metrics**
   - Display engagement rate calculations
   - Show reach and impression data
   - Track post saves and video views

4. **Brand Decision Support**
   - Help brands evaluate influencer effectiveness
   - Compare potential influencer partners based on real engagement data
   - Assess content performance trends

### 🎯 Detailed Functionality Description

#### **A. Individual Post Insights**
For each Instagram media item, we fetch:
- **Impressions**: Total number of times the post was viewed
- **Reach**: Unique accounts that viewed the post
- **Engagement**: Total interactions (likes, comments, saves, shares)
- **Saves**: Number of times post was bookmarked
- **Video Views**: For video content, total view count

#### **B. Account-Level Analytics**
We calculate and display:
- **Total Reach**: Aggregate reach across recent posts
- **Total Impressions**: Aggregate impressions
- **Average Engagement Rate**: (Total Engagement / Total Followers) × 100
- **Engagement Trends**: Growth/decline patterns over time
- **Top Performing Content**: Posts with highest engagement

#### **C. Analytics Dashboard**
Influencer Dashboard displays:
- Overview metrics (last 30 days)
- Follower growth chart
- Engagement rate trends
- Top posts by engagement
- Best performing hashtags
- Content type performance (images vs. videos vs. carousels)

#### **D. Brand Campaign Reports**
For active campaigns:
- Pre-campaign baseline metrics
- Post-campaign performance data
- Comparison of campaign posts vs. organic posts
- ROI calculations based on engagement

### 📱 User Experience Flow

**Influencer Analytics View:**
```
[Influencer Dashboard]
   ↓
[Tap "Instagram Analytics"]
   ↓
[View Analytics Dashboard]:
   Tab 1: Overview
     - Total followers
     - Avg. engagement rate
     - Total reach (30 days)
     - Total impressions (30 days)
   
   Tab 2: Content Performance
     - Media grid with insights per post
     - Tap post → View detailed insights
       • Impressions
       • Reach
       • Engagement
       • Saves
       • Video views (if applicable)
   
   Tab 3: Trends
     - Engagement rate chart (line graph)
     - Top hashtags bar chart
     - Content type breakdown (pie chart)
```

**Brand Campaign Reporting:**
```
[Brand Dashboard]
   ↓
[Active Campaigns]
   ↓
[Select Campaign]
   ↓
[View Campaign Performance]:
   - Participating influencers list
   - Per-influencer metrics:
     • Post reach
     • Post impressions
     • Engagement count
     • Engagement rate
     • Estimated audience reached
   - Campaign totals
   - ROI calculations
```

### 🎬 Screencast Demonstration

**Screencast will demonstrate:**

1. **Influencer Analytics Dashboard (0:00-1:00)**
   - Login as influencer with connected Instagram
   - Navigate to "Analytics" section
   - View overview tab:
     - Follower count
     - Average engagement rate (calculated)
     - Total reach and impressions
   - Show engagement rate chart over time

2. **Post-Level Insights (1:00-2:00)**
   - Navigate to "Content Performance" tab
   - View media grid with insight indicators
   - Tap on a specific post
   - Display detailed insights:
     - Impressions: [number]
     - Reach: [number]
     - Engagement: [number]
     - Saves: [number]
     - Video views: [number] (if video)
   - Show multiple posts with varying performance

3. **Analytics Charts & Trends (2:00-2:45)**
   - Navigate to "Trends" tab
   - Show engagement rate line chart
   - Display top hashtags with usage count
   - View content type breakdown
   - Demonstrate how insights inform content strategy

4. **Brand Campaign Reporting (2:45-3:30)**
   - Switch to brand account
   - Open active campaign
   - View campaign performance report:
     - List of influencers in campaign
     - Per-influencer post insights
     - Campaign totals (aggregate reach, impressions, engagement)
     - Cost-per-engagement calculation
   - Show how brands use this data to measure ROI

5. **Data Refresh & Sync (3:30-3:45)**
   - Pull to refresh analytics
   - Show loading indicator
   - Display updated insights
   - Demonstrate 24-hour caching for performance

### ✅ Compliance with Allowed Usage

**We comply with Instagram Insights API terms and will:**

✅ Only access insights for accounts that authorized our app  
✅ Use insights exclusively for analytics within our app  
✅ Not share raw insights data with unauthorized third parties  
✅ Present insights in aggregated and meaningful ways  
✅ Not use insights for advertising targeting outside our platform  
✅ Not attempt to de-anonymize aggregated data  
✅ Respect Instagram's rate limits and API guidelines  
✅ Not reverse engineer or attempt to recreate Instagram's algorithms  
✅ Cache insights appropriately (24-hour cache) to minimize API calls  
✅ Delete insights data when user disconnects their account  
✅ Provide clear attribution that data comes from Instagram  
✅ Not present insights in misleading or deceptive ways  

### 🔒 Data Security & Privacy

- Insights data encrypted in transit and at rest
- Access restricted to authenticated users only
- Insights only shown to:
  - The account owner (influencer)
  - Brands who have active campaigns with that influencer
- No public exposure of insights data
- User can opt-out of insights collection via settings
- Data retention: 90 days, then automatically deleted
- Comply with data protection regulations (GDPR, CCPA)

### 📊 Specific API Endpoints Used

```
1. GET /{ig-media-id}/insights
   Metrics: impressions, reach, engagement, saves, video_views
   Period: lifetime (for posts)
   
2. GET /{instagram-business-account-id}/insights
   Metrics: reach, impressions, profile_views, website_clicks
   Period: days (last 30)
   
3. GET /{instagram-business-account-id}/media (with insights)
   To fetch media and associated insights in batch
```

### 📈 Business Value

**For Influencers:**
- Understand content performance
- Optimize posting strategy
- Demonstrate value to potential brand partners
- Track professional growth

**For Brands:**
- Make data-driven influencer selection
- Measure campaign effectiveness
- Calculate true ROI of influencer partnerships
- Optimize marketing spend

---

## 🎥 Screencast Requirements Summary

### Technical Specifications
- **Duration**: 3-5 minutes total
- **Format**: MP4 or MOV
- **Resolution**: 1080p minimum
- **Audio**: Clear narration explaining each step
- **File Size**: Under 500MB

### Content Structure

**Section 1: instagram_business_basic (1.5-2 minutes)**
1. Influencer signup and Instagram connection
2. OAuth flow and permission grant
3. Profile data display (username, bio, followers, etc.)
4. Content gallery (media grid)
5. Brand view of influencer profile

**Section 2: instagram_business_manage_insights (1.5-2 minutes)**
6. Influencer analytics dashboard
7. Post-level insights display
8. Engagement trends and charts
9. Brand campaign performance report
10. Data refresh demonstration

**Section 3: User Controls (0.5-1 minute)**
11. Privacy settings
12. Account disconnection process
13. Data deletion confirmation

---

## 📋 Customized Questions Response

### Q1: How does your app help influencers grow their business?
**Answer:**  
InfluenceMe connects influencers with brands seeking authentic partnerships. By integrating Instagram Business data:
- Influencers showcase their authentic content portfolio to brands
- Real engagement metrics help influencers demonstrate their value
- Analytics help creators optimize their content strategy
- Transparent performance data builds trust with brand partners
- Automated matching connects influencers with relevant collaboration opportunities

### Q2: How will Instagram data be displayed in your app?
**Answer:**  
Instagram data is displayed in three primary locations:

1. **Influencer Profile Page**
   - Profile picture, username, bio (with Instagram branding)
   - Follower/following counts with Instagram icon
   - Content grid showing Instagram posts
   - Each post displays: image, caption, like count, comment count
   - Clear "View on Instagram" links

2. **Analytics Dashboard**
   - Insights charts showing reach, impressions, engagement
   - "Data from Instagram Insights" attribution
   - Last updated timestamp
   - Refresh button to sync latest data

3. **Brand Marketplace**
   - Influencer cards with Instagram handle
   - Preview of recent posts
   - Engagement rate calculated from Instagram data
   - "Instagram Verified" badge when applicable

All displays include proper Instagram attribution and branding per platform guidelines.

### Q3: Why do you need access to Instagram Business Account data?
**Answer:**  
Our platform's core value proposition requires authentic Instagram Business data:

**Verification**: We need to verify that influencers are legitimate business accounts with real audiences, preventing fraudulent accounts.

**Transparency**: Brands need to see actual content and engagement metrics to make informed partnership decisions, reducing risk of influencer fraud.

**Performance Tracking**: Measuring campaign success requires access to post-level insights (reach, impressions, engagement) to calculate ROI.

**User Experience**: Influencers should not need to manually input their Instagram stats; automated sync provides seamless experience and ensures data accuracy.

**Business Intelligence**: Analytics help both influencers and brands optimize their strategies based on real performance data.

Without Instagram Business access, our platform cannot fulfill its core promise of connecting brands with verified, data-driven influencer partnerships.

### Q4: How frequently will your app access Instagram data?
**Answer:**  
- **Initial Connection**: One-time comprehensive data fetch (profile + recent 50 posts)
- **Daily Background Sync**: Automatic update once per day (follower counts, new posts)
- **User-Initiated Refresh**: When user manually pulls to refresh (limited to once per hour)
- **Campaign Tracking**: Insights for campaign posts fetched daily during active campaigns
- **API Calls**: Approximately 5-10 calls per user per day during active usage
- **Caching**: 24-hour cache reduces redundant API calls
- **Rate Limiting**: Implemented to stay within Instagram's API limits

### Q5: Will you share Instagram data with third parties?
**Answer:**  
**No, we do not share raw Instagram data with unauthorized third parties.**

Permitted sharing:
- ✅ Brands view influencer Instagram data when evaluating partnership opportunities (legitimate business purpose)
- ✅ Influencers view their own insights and analytics
- ✅ Campaign performance reports shared between brands and participating influencers

Not permitted:
- ❌ No selling of Instagram data
- ❌ No sharing with advertisers outside our platform
- ❌ No data aggregation for public datasets
- ❌ No cross-app data sharing
- ❌ No use for AI training or model development

All data sharing is:
1. Consensual (users opt-in via OAuth)
2. Transparent (disclosed in Privacy Policy)
3. Purposeful (limited to platform functionality)
4. Secure (encrypted, access-controlled)

### Q6: How do you handle user data privacy and security?
**Answer:**  
**Security Measures:**
- All API communications use HTTPS/TLS 1.3
- Access tokens stored in platform secure storage (Keychain/Keystore)
- Tokens encrypted at rest using AES-256
- Backend data encrypted with field-level encryption
- No Instagram passwords ever stored
- Rate limiting and abuse detection

**Privacy Controls:**
- Users can disconnect Instagram at any time
- Account disconnection deletes all cached Instagram data within 48 hours
- Users can view what data we store in app settings
- GDPR-compliant data export and deletion
- Privacy Policy clearly explains Instagram data usage
- Users opt-in to each permission explicitly

**Data Retention:**
- Active accounts: Data synced daily, old data replaced
- Inactive accounts: Data deleted after 90 days
- Disconnected accounts: Immediate deletion scheduled
- Campaign insights: Retained for 1 year for historical reporting

**Compliance:**
- GDPR (EU)
- CCPA (California)
- COPPA (under-13 users not permitted)
- SOC 2 Type II certification (in progress)
- Regular security audits

---

## 📚 Supporting Documentation

### App Store Links
- **Google Play**: [To be provided after initial release]
- **App Store**: [To be provided after initial release]
- **TestFlight Beta**: [Available for reviewer testing]

### Privacy Policy
- URL: `https://influence-me.in/privacy-policy`
- Last Updated: October 2025
- Includes detailed Instagram data usage section

### Terms of Service
- URL: `https://influence-me.in/terms-of-service`
- Instagram Platform Terms compliance confirmed

### Data Processing Agreement
- Available upon request for enterprise clients
- GDPR-compliant data processing terms

---

## 🤝 Meta Platform Compliance Commitment

**We, the InfluenceMe team, commit to:**

1. ✅ Follow Instagram Platform Terms and Policies
2. ✅ Use permissions only for stated purposes
3. ✅ Protect user privacy and data security
4. ✅ Respond to platform policy updates within required timeframes
5. ✅ Participate in regular platform security reviews
6. ✅ Disclose data usage transparently to users
7. ✅ Implement proper Instagram branding and attribution
8. ✅ Not engage in prohibited practices (spam, fraud, misuse)
9. ✅ Respect user rights (access, deletion, portability)
10. ✅ Maintain clear communication channels for user support

**Authorized Representative:**  
[Name]  
[Title]  
[Email]  
[Company: InfluenceMe]

**Date**: October 24, 2025

---

## 📞 Contact Information

**Technical Contact:**  
Email: dev@influence-me.in  
Phone: [To be provided]

**Privacy Contact:**  
Email: privacy@influence-me.in

**App Support:**  
Email: support@influence-me.in  
In-App: Settings → Help & Support

---

## ✅ Submission Checklist

- [ ] App screenshots uploaded (6-8 screenshots showing Instagram integration)
- [ ] Screencast video uploaded (3-5 minutes, MP4/MOV, <500MB)
- [ ] Privacy Policy URL provided and accessible
- [ ] Terms of Service URL provided and accessible
- [ ] App icon uploaded (1024x1024 PNG)
- [ ] All permission use cases explained in detail
- [ ] Compliance agreements checked and accepted
- [ ] Test credentials provided for reviewer access
- [ ] App binary uploaded for testing
- [ ] Instagram test accounts provided (if needed)

---

## 🔐 Test Credentials for Review

**Influencer Test Account:**
- Email: `influencer.test@influence-me.in`
- Password: `[Provided securely to Meta reviewer]`
- Instagram: Already connected for testing

**Brand Test Account:**
- Email: `brand.test@influence-me.in`
- Password: `[Provided securely to Meta reviewer]`

**Test Flow:**
1. Login with influencer account
2. View Instagram profile integration
3. Check analytics dashboard
4. Login with brand account
5. Browse influencers
6. View Instagram data in influencer profiles
7. Create test campaign
8. View campaign performance with Instagram insights

---

**Thank you for reviewing our Instagram Business API permission request. We are committed to building a platform that benefits both content creators and brands while respecting user privacy and following Meta's platform policies.**



