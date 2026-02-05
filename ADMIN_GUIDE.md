# Admin Suggestions Management Guide

## Managing Suggestions in the Admin Panel

The admin panel now includes a comprehensive form for editing and managing creator suggestions before approval.

### Features

#### 1. **Edit Suggestions**
- Click the **Edit** button next to any suggestion
- A modal form opens with all suggestion details pre-populated
- Edit any field including:
  - Creator name
  - Image URL
  - Created/Exit dates
  - Fully Forked status
  - Nicknames (comma-separated)
  - All social media links (YouTube, Twitter, Instagram, Twitch, Bluesky, LinkedIn, Reddit, SoundCloud, LTT Forum, Website)
  - Notes

#### 2. **Save Changes**
After editing, you have two options:

**Save Changes**
- Updates the suggestion in `suggestions.json`
- Keeps it in the pending queue
- Useful for cleaning up data before final approval

**Save & Approve**
- Updates the suggestion with your edits
- Immediately moves it to `creators.json`
- Removes it from the suggestions queue
- One-click workflow to edit and approve

#### 3. **Direct Approve**
- Click **Approve** button to move the suggestion to creators without editing
- The suggestion is moved to `creators.json` exactly as submitted

#### 4. **Delete**
- Remove unwanted or spam suggestions
- Permanently deletes from `suggestions.json`

### Workflow Examples

#### Scenario 1: Quick Approval
User submitted a perfect suggestion → Click **Approve** → Done!

#### Scenario 2: Needs Minor Edits
1. Click **Edit** on the suggestion
2. Fix typos, add missing social links, update Fully Forked status
3. Click **Save & Approve**
4. Suggestion is updated and added to creators in one step

#### Scenario 3: Needs Review Later
1. Click **Edit** on the suggestion
2. Update with correct information
3. Click **Save Changes**
4. Review later and click **Approve** when ready

### Tips

- **Required Fields**: Only Creator Name and Fully Forked status are required
- **Social Media**: Enter full URLs (e.g., `https://youtube.com/@channel`)
- **Nicknames**: Separate multiple nicknames with commas
- **Dates**: Use the date picker for proper formatting
- **Images**: Provide full image URLs for best results

### API Endpoints Used

All endpoints require admin authentication:

- `GET /api/admin/suggestions` - List all suggestions
- `PUT /api/admin/suggestions/:index` - Update a suggestion
- `POST /api/admin/suggestions/:index/approve` - Approve and move to creators
- `DELETE /api/admin/suggestions/:index` - Delete a suggestion
