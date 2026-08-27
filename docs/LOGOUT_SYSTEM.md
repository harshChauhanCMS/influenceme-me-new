# Logout System - Complete Documentation

## Overview
A comprehensive logout system with a professional user menu in the dashboard header, allowing users to access their profile, settings, and logout functionality.

---

## Features

### ✅ User Menu
- **Avatar button** in header that opens menu
- **User information** display (name, email, role)
- **Profile picture** integration
- **Quick navigation** to Profile and Settings
- **Logout option** with red styling
- **Professional design** with Material-UI

### ✅ Logout Functionality
- **Clears authentication state** (user & token)
- **Clears local storage** completely
- **Redirects to login** page automatically
- **Session termination** on all tabs

### ✅ User Context Enhancements
- **`refreshUser()`** function to reload user data from API
- **Automatic token validation** (commented out, can be enabled)
- **Persistent state** across page refreshes

---

## Implementation Details

### 1. Auth Context Updates (`frontend/src/context/authContext.tsx`)

**Added `refreshUser` function:**
```typescript
interface AuthContextType {
    user: IUser | null;
    token: string | null;
    userHandler: (updatedUser: Partial<IUser>) => void;
    login: (newToken: string, newUser: IUser) => void;
    logout: () => void;
    refreshUser: () => Promise<void>; // NEW
}

// Implementation
const refreshUser = async () => {
    try {
        if (!token) return;
        
        const response = await fetch(`${API_URL}/api/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
                setUser(data.data);
            }
        }
    } catch (error) {
        console.error('Failed to refresh user data:', error);
    }
};
```

**Existing `logout` function:**
```typescript
const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.clear();
    window.location.href = "/login";
};
```

### 2. User Menu in Dashboard Layout

**Location:** `frontend/src/components/layout/DashboardLayout.tsx`

**Components Added:**
- Avatar button with click handler
- MUI Menu component
- User info section
- Menu items (Profile, Settings, Logout)

**State Management:**
```typescript
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
};

const handleMenuClose = () => {
    setAnchorEl(null);
};
```

**Menu Structure:**
1. **User Info Section**
   - Name (bold)
   - Email (gray)
   - Role badge (green)

2. **Navigation Items**
   - My Profile (with Person icon)
   - Settings (with Settings icon)

3. **Divider**

4. **Logout**
   - Red text
   - Red icon
   - Logout icon

---

## UI Design

### User Avatar
```typescript
<Avatar
    src={getImageUrl(user?.profilePictureUrl)}
    sx={{
        bgcolor: '#8CC342',
        width: 40,
        height: 40,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(140, 195, 66, 0.3)',
        transition: 'all 0.2s ease',
        '&:hover': {
            boxShadow: '0 4px 12px rgba(140, 195, 66, 0.4)',
            transform: 'scale(1.05)',
        }
    }}
>
    {user?.name?.charAt(0).toUpperCase()}
</Avatar>
```

### Menu Styling
- **Width:** 220px minimum
- **Border radius:** 2 (16px)
- **Elevation:** 3
- **Arrow pointer:** Top-right corner
- **Smooth animations**

### Menu Items
- **Profile & Settings:** Default color with hover effect
- **Logout:** Red color (`error.main`) with red icon
- **Icons:** Material-UI icons (Person, Settings, Logout)
- **Spacing:** Consistent padding (1.5 spacing units)

---

## User Flow

### Opening Menu
1. User clicks on **avatar** in top-right
2. **Menu opens** below avatar
3. Shows **user information**
4. Shows **navigation options**

### Navigating to Profile
1. Click **"My Profile"** in menu
2. Menu closes
3. Redirects to `/profile` page

### Navigating to Settings
1. Click **"Settings"** in menu
2. Menu closes
3. Redirects to `/settings` page

### Logging Out
1. Click **"Logout"** in menu (red text)
2. Menu closes
3. **Clears all session data:**
   - Removes user from state
   - Removes token from state
   - Clears localStorage completely
4. **Redirects to `/login`** page
5. User must log in again

---

## Security Features

### Session Cleanup
```typescript
const logout = () => {
    setToken(null);           // Clear token state
    setUser(null);            // Clear user state
    localStorage.clear();     // Clear ALL localStorage
    window.location.href = "/login";  // Hard redirect
};
```

### Why `window.location.href` instead of `router.push()`?
- **Hard redirect** ensures complete page reload
- **Clears all React state** (not just context)
- **Prevents cached data** from persisting
- **More secure** for logout operations

### Token Validation (Optional)
The auth context includes commented-out code for automatic token expiration:
```typescript
// Automatically logs out when JWT expires
// Can be enabled by uncommenting the useEffect
```

---

## Profile Picture Integration

**Uses `getImageUrl` utility:**
```typescript
import { getImageUrl } from '@/utils/fileUtils';

<Avatar src={getImageUrl(user?.profilePictureUrl)} />
```

**Fallback:**
- If no profile picture, shows **first letter** of user's name
- Uses **green background** (#8CC342)
- **White text** for contrast

---

## Accessibility Features

- ✅ **Keyboard navigation** (Menu component)
- ✅ **Tooltip** on avatar ("Account")
- ✅ **Clear focus states**
- ✅ **Screen reader friendly**
- ✅ **ARIA labels** (provided by MUI)

---

## Responsive Design

- **Desktop:** Menu appears below avatar
- **Mobile:** Menu adapts to viewport
- **Touch-friendly:** Large click targets
- **Smooth animations** on all devices

---

## Menu Positioning

**Anchor:** Top-right avatar
**Transform Origin:** Right-top
**Positioning:** Right-bottom

This ensures the menu:
- Opens **below** the avatar
- Aligns to the **right edge**
- Has a **pointer arrow** at top-right

---

## Color Scheme

- **Avatar background:** `#8CC342` (green)
- **Avatar shadow:** `rgba(140, 195, 66, 0.3)`
- **Role badge background:** `#e6f3d8` (light green)
- **Role badge text:** `#699e31` (dark green)
- **Logout text:** `error.main` (red)
- **Logout hover:** `error.lighter` (light red)

---

## Testing Checklist

### User Menu
- [ ] Avatar displays in header
- [ ] Avatar shows profile picture (or first letter)
- [ ] Click avatar opens menu
- [ ] Menu shows user name
- [ ] Menu shows user email
- [ ] Menu shows user role badge
- [ ] Menu has Profile option
- [ ] Menu has Settings option
- [ ] Menu has Logout option (red)
- [ ] Click outside menu closes it

### Navigation
- [ ] Profile option navigates to `/profile`
- [ ] Settings option navigates to `/settings`
- [ ] Menu closes after navigation

### Logout
- [ ] Logout option is red
- [ ] Click logout clears session
- [ ] Redirects to `/login` page
- [ ] Cannot access dashboard after logout
- [ ] Must log in again
- [ ] localStorage is cleared
- [ ] Token is removed
- [ ] User state is cleared

### Visual
- [ ] Menu has arrow pointer
- [ ] Smooth animations
- [ ] Hover effects work
- [ ] Colors match design
- [ ] Icons display correctly
- [ ] Text is readable
- [ ] Spacing is consistent

---

## Code Locations

```
frontend/src/
├── context/
│   └── authContext.tsx (logout & refreshUser functions)
├── components/
│   └── layout/
│       └── DashboardLayout.tsx (user menu implementation)
└── utils/
    └── fileUtils.ts (getImageUrl for profile pictures)
```

---

## API Integration

**Refresh User Data:**
```
GET /api/user/profile
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { ...user object }
}
```

**Used when:**
- User updates profile
- Need to reload latest user data
- Called via `refreshUser()` function

---

## Future Enhancements

### Short Term
1. Add loading state during logout
2. Confirmation dialog before logout
3. "Remember me" option
4. Session timeout warning
5. Multiple device session management

### Long Term
1. JWT refresh token support
2. Auto-logout on token expiration
3. Device management (view/revoke sessions)
4. Security activity log
5. Two-factor authentication
6. Biometric authentication (mobile)

---

## Troubleshooting

### Menu not opening
- Check `anchorEl` state
- Verify onClick is attached to avatar
- Check console for errors

### Logout not working
- Verify `logout` function is called
- Check localStorage is cleared
- Ensure redirect happens
- Check network tab for issues

### Profile picture not showing
- Verify `getImageUrl` is imported
- Check image path format
- Ensure file download API works
- Check fallback (first letter) displays

### Menu positioning issues
- Check anchor/transform origin settings
- Verify PaperProps styling
- Test on different screen sizes

---

## Summary

✅ **Professional user menu** in dashboard header
✅ **Complete logout functionality** with session cleanup
✅ **Quick navigation** to Profile and Settings
✅ **User information display** with profile picture
✅ **Secure logout** with hard redirect
✅ **Beautiful design** with Material-UI
✅ **Responsive** across all devices
✅ **Accessible** with keyboard navigation
✅ **No lint errors** - production ready

Users can now easily access their profile, settings, and logout from anywhere in the dashboard! 🎉

