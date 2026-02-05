# GitHub OAuth Setup Instructions

This project now includes GitHub OAuth authentication for admin access.

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the application details:
   - **Application name**: Forked From LTT (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy the **Client Secret**

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your GitHub OAuth credentials:
   ```
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   SESSION_SECRET=your_random_session_secret_here
   ADMIN_GITHUB_USERNAMES=your_github_username
   ```

3. Replace:
   - `your_github_client_id_here` with your GitHub OAuth Client ID
   - `your_github_client_secret_here` with your GitHub OAuth Client Secret
   - `your_random_session_secret_here` with a random string (e.g., generate one at https://randomkeygen.com/)
   - `your_github_username` with your GitHub username (or comma-separated usernames for multiple admins)

### 3. Start the Server

```bash
npm start
```

### 4. Access the Admin Panel

1. Navigate to http://localhost:3000
2. Click "Admin Login" in the navigation bar
3. Click "Sign in with GitHub"
4. Authorize the application
5. You'll be redirected to the admin dashboard if your GitHub username is in the `ADMIN_GITHUB_USERNAMES` list

## Features

### Admin Dashboard
- View and manage creator suggestions
- View and manage suggested edits
- Approve or delete suggestions
- Manage all creators in the database
- View statistics (total creators, pending suggestions, etc.)

### Security
- Only users with GitHub accounts listed in `ADMIN_GITHUB_USERNAMES` can access the admin panel
- Session-based authentication with 24-hour expiration
- Protected API routes requiring admin privileges

## Production Deployment

For production deployment:

1. Update the GitHub OAuth App settings:
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://yourdomain.com/auth/github/callback`

2. Update your `.env` file:
   ```
   NODE_ENV=production
   GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback
   SESSION_SECRET=use_a_strong_random_secret_here
   ```

3. Enable secure cookies by setting `NODE_ENV=production`

## Troubleshooting

### "Not authenticated" error
- Make sure your `.env` file is properly configured
- Verify your GitHub username is in `ADMIN_GITHUB_USERNAMES`
- Check that the OAuth callback URL matches your GitHub app settings

### Session issues
- Clear your browser cookies and try again
- Generate a new `SESSION_SECRET` in your `.env` file

### Authorization callback error
- Verify the callback URL in your GitHub OAuth app settings matches your environment
- For local development: `http://localhost:3000/auth/github/callback`
- For production: `https://yourdomain.com/auth/github/callback`
