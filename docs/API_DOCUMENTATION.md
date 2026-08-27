# InfluenceMe New - API Documentation

## Authentication API Endpoints

Base URL: `http://localhost:5000/api`

### Health Check Endpoints

#### GET `/health`
- **Description**: General server health check
- **Access**: Public
- **Response**:
```json
{
  "success": true,
  "code": 200,
  "message": "InfluenceMe API is running!",
  "data": {
    "timestamp": "2025-01-20T12:00:00.000Z"
  }
}
```

#### GET `/auth/health`
- **Description**: Authentication service health check
- **Access**: Public
- **Response**:
```json
{
  "status": true,
  "code": 200,
  "message": "Auth service is running",
  "data": {
    "timestamp": "2025-01-20T12:00:00.000Z",
    "version": "1.0.0",
    "service": "authentication"
  }
}
```

### Public Authentication Endpoints

#### POST `/auth/register`
- **Description**: Register a new user (brand, vendor, admin)
- **Access**: Public
- **Rate Limit**: 5 requests per 15 minutes
- **Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com", // Either email or phone required
  "phone": "+1234567890", // Either email or phone required
  "phoneCode": "+1",
  "password": "securepassword", // Required for non-influencer roles
  "role": "brand", // Required: "brand", "vendor", or "admin"
  "fullName": "John Doe",
  "country": "USA"
}
```
- **Success Response** (201):
```json
{
  "status": true,
  "code": 201,
  "message": "User registered successfully",
  "data": {
    "user": { /* User object */ },
    "token": "jwt-token-here"
  }
}
```

#### POST `/auth/register/influencer`
- **Description**: Register a new influencer (password optional)
- **Access**: Public
- **Rate Limit**: 5 requests per 15 minutes
- **Body**:
```json
{
  "name": "Jane Influencer",
  "email": "jane@example.com", // Either email or phone required
  "phone": "+1234567890", // Either email or phone required
  "fullName": "Jane Smith",
  "about": "Fashion and lifestyle influencer",
  "country": "USA",
  "dateOfBirth": "1995-05-15",
  "spokenLanguages": ["English", "Spanish"],
  "maritalStatus": "single",
  "children": 0,
  "pets": 1,
  "influencerType": "micro",
  "workType": "full-time",
  "influencerSince": 2020,
  "addresses": {
    "streetAddress": "123 Main St",
    "state": "California",
    "country": "USA",
    "pinCode": "90210"
  }
}
```

#### POST `/auth/login`
- **Description**: Login user (all roles)
- **Access**: Public
- **Rate Limit**: 5 requests per 15 minutes
- **Body**:
```json
{
  "email": "user@example.com", // Either email or phone required
  "phone": "+1234567890", // Either email or phone required
  "password": "password" // Optional for influencers who may not have passwords
}
```

#### POST `/auth/check-user`
- **Description**: Check if user exists by email or phone
- **Access**: Public
- **Body**:
```json
{
  "email": "user@example.com", // Either email or phone required
  "phone": "+1234567890" // Either email or phone required
}
```
- **Response**:
```json
{
  "status": true,
  "code": 200,
  "message": "User does not exist",
  "data": {
    "exists": false
  }
}
```

#### GET `/auth/influencers`
- **Description**: Get all influencers with filters (public endpoint)
- **Access**: Public (optional authentication)
- **Query Parameters**:
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 20)
  - `name` (string): Search by name
  - `platform` (string): Filter by social media platform
  - `influencerType` (string): "micro", "macro", "mega", "nano"
  - `city` (string): Filter by city/state
  - `locationInCity` (string): Filter by street address
  - `maritalStatus` (string): "single", "married", "divorced", "widowed"
  - `hasChildren` (boolean): Filter by having children
  - `hasPets` (boolean): Filter by having pets
  - `languages` (string): Comma-separated languages
  - `workType` (string): "full-time", "part-time", "freelance"
  - `minFollowers` (number): Minimum followers count
  - `maxFollowers` (number): Maximum followers count
  - `ageBracket` (string): "18-24", "25-34", "35-44", "45-54", "55+"

### Protected Endpoints (Authentication Required)

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

#### GET `/auth/profile`
- **Description**: Get current user profile
- **Access**: Private
- **Response**: User object with additional computed fields (totalFollowers, activePlatforms)

#### PUT `/auth/profile`
- **Description**: Update user profile
- **Access**: Private
- **Body**: Same as registration but all fields optional (except password/role/email/phone cannot be updated here)

#### POST `/auth/logout`
- **Description**: Logout user (client-side token removal)
- **Access**: Private

#### PUT `/auth/change-password`
- **Description**: Change password (for users who have passwords)
- **Access**: Private
- **Rate Limit**: 3 requests per 15 minutes
- **Body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword",
  "confirmPassword": "newpassword"
}
```

#### POST `/auth/set-password`
- **Description**: Set password (for influencers who don't have a password)
- **Access**: Private (Influencers only)
- **Rate Limit**: 3 requests per 15 minutes
- **Body**:
```json
{
  "password": "newpassword"
}
```

### Admin-Only Endpoints

#### GET `/auth/users`
- **Description**: Get all users (placeholder - to be implemented)
- **Access**: Private (Admin only)

#### PUT `/auth/users/:id/status`
- **Description**: Update user status (placeholder - to be implemented)
- **Access**: Private (Admin only)

### Business User Endpoints

#### GET `/auth/business/dashboard`
- **Description**: Get business dashboard data (placeholder)
- **Access**: Private (Brand, Vendor, Admin roles only)

## Error Responses

All endpoints use standardized error responses:

```json
{
  "status": false,
  "code": 400,
  "message": "Error message",
  "data": null // or error details
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request / Validation Error
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Failed
- **429**: Too Many Requests (Rate Limited)
- **500**: Internal Server Error

## Rate Limiting

- **Authentication endpoints** (login, register): 5 requests per 15 minutes
- **Password management endpoints**: 3 requests per 15 minutes
- **Other endpoints**: No rate limiting (yet)

## Authentication Flow

1. **Registration**: Use `/auth/register` or `/auth/register/influencer`
2. **Login**: Use `/auth/login` with email/phone + password
3. **Access Protected Routes**: Include JWT token in Authorization header
4. **Profile Management**: Use `/auth/profile` endpoints
5. **Logout**: Call `/auth/logout` and remove token from client

## User Roles

- **influencer**: Content creators (password optional)
- **brand**: Companies looking for influencers
- **vendor**: Service providers
- **admin**: Platform administrators

## Database Schema

The system uses a unified User model that handles all user types with role-based differentiation. Key features:

- Flexible authentication (email or phone)
- Social media platform integration
- Rich profile information for influencers
- Built-in address and personal information support
- Virtual age calculation
- Social media metrics tracking