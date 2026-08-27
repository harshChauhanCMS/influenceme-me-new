# Vendor Flow for Influencers - Mobile Implementation 🚀

## Progress Status: ✅ Foundation Complete (Models + API)

### Completed ✅

#### 1. Data Models (`lib/models/vendor_models.dart`)
- ✅ **Service Categories** (matching backend)
  - photography, videography, event-planning, makeup-artist, hair-stylist, catering, decoration, sound-system, lighting, content-creation, graphic-design, social-media-management, other
  
- ✅ **Requirement Status Enum**
  - open, in-progress, completed, cancelled, closed
  
- ✅ **Requirement Priority Enum**
  - low, medium, high, urgent
  
- ✅ **Vendor Offer Status Enum**
  - pending, accepted, declined, negotiating, withdrawn

- ✅ **VendorRequirement Model**
  - Complete model for influencers to post their vendor needs
  - Fields: title, description, category, budget, location, deadline, priority, status, tags, requirements list
  - Full serialization (toJson/fromJson) with backend alignment
  
- ✅ **VendorOfferTerms Model**
  - Pricing, delivery time, revisions, additional services
  
- ✅ **VendorOffer Model**
  - Complete model for vendors' proposals
  - Includes terms, negotiation history, client response, shortlist flag
  - Populated vendor and requirement info support
  
- ✅ **VendorReview Model**
  - Rating, review text, project details
  - Verified flag, helpful count, vendor response support

#### 2. API Service (`lib/services/vendor_api_service.dart`)
- ✅ **Vendor APIs**
  - `getVendors()` - Fetch vendors with filters (category, search, pagination)
  - `getVendorById()` - Get vendor details by ID
  
- ✅ **Requirement APIs**
  - `getAllRequirements()` - Public requirements with filters
  - `getMyRequirements()` - Influencer's own requirements
  - `getRequirementById()` - Single requirement details
  - `createRequirement()` - Post new requirement
  - `updateRequirement()` - Edit requirement
  - `deleteRequirement()` - Remove requirement
  
- ✅ **Offer APIs**
  - `getOffersForRequirement()` - All offers for a requirement
  - `acceptOffer()` - Accept vendor proposal
  - `declineOffer()` - Decline vendor proposal
  
- ✅ **Review APIs**
  - `getVendorReviews()` - Fetch vendor reviews with pagination
  - `createReview()` - Submit vendor review

### Backend Routes (Already Exists)

```
Vendors:
GET    /api/users/vendors             - Get all vendors
GET    /api/users/:id                 - Get vendor by ID

Requirements:
POST   /api/vendor-requirement/create                       - Create requirement
GET    /api/vendor-requirement/requirements                 - All requirements
GET    /api/vendor-requirement/requirement/:id              - Get requirement
PUT    /api/vendor-requirement/requirement/:id              - Update requirement
DELETE /api/vendor-requirement/requirement/:id              - Delete requirement
GET    /api/vendor-requirement/user/requirements            - My requirements

Offers:
POST   /api/vendor-offer/create                             - Send offer
GET    /api/vendor-offer/requirement/:requirementId/offers  - Get offers
POST   /api/vendor-offer/offer/:id/accept                   - Accept offer
POST   /api/vendor-offer/offer/:id/decline                  - Decline offer
GET    /api/vendor-offer/user/offers                        - Vendor's offers
GET    /api/vendor-offer/client/received                    - Client's received offers

Reviews:
POST   /api/vendor-review/create                            - Create review
GET    /api/vendor-review/vendor/:vendorId/reviews          - Get reviews
```

### Next Steps (UI Implementation) 🎨

#### High Priority
1. **Fix Main Page Navigation** ⚠️
   - File: `lib/pages/home/main_page.dart`
   - Issue: Index 1 shows `ChatUsers` instead of Vendors page
   - Fix: Add `VendorsPage()` at index 1
   
2. **Create Vendors Listing Page** 📋
   - Path: `lib/pages/vendors/vendors_page.dart`
   - Features:
     - Grid/List view of vendors
     - Filter by category (photography, catering, etc.)
     - Search functionality
     - Rating display
     - Tap to view vendor profile
   - Components to use:
     - `CustomText` for all text
     - `InputField` for search
     - `PrimaryButton` for actions
     - App theming/colors

3. **Create Vendor Profile Page** 👤
   - Path: `lib/pages/vendors/vendor_profile_page.dart`
   - Similar to Brand Profile design (professional, clean)
   - Tabs:
     - **About**: Business name, description, experience, service areas
     - **Services**: List of services offered with prices
     - **Reviews**: Rating + review list
     - **Portfolio**: Images/work samples
   - Actions:
     - Contact Vendor button
     - Write Review button
   - Use existing components and theming

4. **Create Requirements Page** 📝
   - Path: `lib/pages/vendors/requirements_page.dart`
   - Two sections:
     - Browse Requirements (public, for vendors)
     - My Requirements (influencer's own posts)
   - Features:
     - FAB to create new requirement
     - Status filters
     - Category filters
     - Tap to view details

5. **Create Requirement Form** ✍️
   - Path: `lib/pages/vendors/create_requirement_page.dart`
   - Fields:
     - Title (required)
     - Description (required)
     - Category dropdown (required)
     - Budget (optional)
     - Location (optional, with Google Maps picker)
     - Start/End Date (optional)
     - Deadline (optional)
     - Priority dropdown
     - Tags (chips input)
     - Requirements list (multi-line)
   - Use `InputField`, `PrimaryButton`, `$strings`

6. **My Requirements Page** 📊
   - Path: `lib/pages/vendors/my_requirements_page.dart`
   - Show requirements with:
     - Status badge
     - Total offers count
     - Actions: View Offers, Edit, Delete
   - Tap to see offers

7. **Requirement Details & Offers** 💰
   - Path: `lib/pages/vendors/requirement_offers_page.dart`
   - Top: Requirement details
   - Bottom: List of vendor offers
   - Each offer shows:
     - Vendor name, image, rating
     - Proposed price
     - Delivery time
     - Message
     - Actions: Accept, Decline, Negotiate
   - Status indicators

8. **Write Review Dialog** ⭐
   - Path: `lib/bottom_sheets/write_vendor_review_dialog.dart`
   - Fields:
     - Star rating (1-5)
     - Review text
     - Project type (optional)
     - Project date (optional)
   - Professional, clean design

#### Medium Priority
9. **Contact Vendor** 📞
   - Integration with existing chat system
   - Or phone/email quick actions
   
10. **Search & Filters** 🔍
    - Advanced filters for vendors
    - Location-based search
    - Rating filters

### Design Guidelines 🎨

**Follow Existing App Structure:**
- ✅ Use `CustomText` instead of `Text`
- ✅ Use `InputField` for all inputs
- ✅ Use `PrimaryButton` for main actions
- ✅ Use `$strings` for all text/labels
- ✅ Use app theming (`$styles.colors.*`)
- ✅ Use navigation utilities (`navigate()`, `navigatePop()`)
- ✅ Professional, clean UI (like Brand Profile & Campaign Details)
- ✅ Material Design principles
- ✅ Gradient buttons (users like them!)

**Color Scheme:**
- Primary: `$styles.colors.primary` (Green)
- Secondary: `$styles.colors.secondary`
- Cards: White with subtle shadows
- Text: Gray hierarchy
- Status badges: Color-coded

### File Structure

```
lib/
├── models/
│   └── vendor_models.dart ✅ DONE
├── services/
│   └── vendor_api_service.dart ✅ DONE
├── pages/
│   ├── home/
│   │   └── main_page.dart ⚠️ NEEDS FIX
│   └── vendors/ (NEW)
│       ├── vendors_page.dart
│       ├── vendor_profile_page.dart
│       ├── requirements_page.dart
│       ├── create_requirement_page.dart
│       ├── my_requirements_page.dart
│       └── requirement_offers_page.dart
├── bottom_sheets/ (if needed)
│   └── write_vendor_review_dialog.dart
└── components/ (use existing)
    ├── custom_text.dart
    ├── input_field.dart
    ├── primary_button.dart
    └── ...
```

### Example: Vendors Page Structure

```dart
class VendorsPage extends StatefulWidget {
  @override
  State<VendorsPage> createState() => _VendorsPageState();
}

class _VendorsPageState extends State<VendorsPage> {
  List<Map<String, dynamic>> _vendors = [];
  bool _loading = true;
  String? _selectedCategory;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadVendors();
  }

  Future<void> _loadVendors() async {
    try {
      setState(() => _loading = true);
      final vendors = await VendorApiService.getVendors(
        category: _selectedCategory,
        search: _searchQuery.isEmpty ? null : _searchQuery,
      );
      setState(() {
        _vendors = vendors;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      snackBar(context, "Error", e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: CustomText($strings.vendors, fontSize: 20, isBold: true),
        // ... filters, search
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator())
          : GridView.builder(
              padding: EdgeInsets.all(16),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.75,
              ),
              itemCount: _vendors.length,
              itemBuilder: (context, index) {
                return VendorCard(
                  vendor: _vendors[index],
                  onTap: () => _viewVendorProfile(_vendors[index]),
                );
              },
            ),
    );
  }
}
```

### Testing Checklist ✅

- [ ] Vendors listing loads correctly
- [ ] Filter by category works
- [ ] Search functionality works
- [ ] Vendor profile displays all info
- [ ] Can create requirement
- [ ] Can view my requirements
- [ ] Can see offers for requirement
- [ ] Can accept/decline offers
- [ ] Can write review
- [ ] All text uses $strings
- [ ] All components use existing custom widgets
- [ ] Theme colors are consistent
- [ ] Navigation flows correctly

---

## Current Status Summary

**✅ Backend**: Fully implemented and deployed  
**✅ Models**: All models created (1115 lines)  
**✅ API Service**: Complete API integration (326 lines)  
**⏳ UI**: Not started yet  

**Next**: Fix main_page.dart navigation and create vendor pages with professional UI.

**Estimated Remaining Work**: 8-10 UI pages/dialogs

---

**Date**: October 28, 2025  
**Status**: Foundation Complete - Ready for UI Implementation


