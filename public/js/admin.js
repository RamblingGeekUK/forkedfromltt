// Admin Dashboard JavaScript

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/auth/user');
    const data = await response.json();
    
    if (!data.authenticated || !data.user.isAdmin) {
      // Redirect to login if not authenticated or not admin
      window.location.href = '/login.html';
      return;
    }
    
    // Set user info
    document.getElementById('userName').textContent = data.user.displayName || data.user.username;
    if (data.user.avatarUrl) {
      document.getElementById('userAvatar').src = data.user.avatarUrl;
    }
    
    // Load initial data
    await loadAllData();
    
    // Setup tab navigation
    setupTabNavigation();
    
  } catch (error) {
    console.error('Authentication error:', error);
    window.location.href = '/login.html';
  }
});

// Setup tab navigation
function setupTabNavigation() {
  const navLinks = document.querySelectorAll('.admin-nav .nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Show corresponding tab content
      const tabName = link.getAttribute('data-tab');
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(tab => tab.classList.remove('active'));
      document.getElementById(`tab-${tabName}`).classList.add('active');
    });
  });
}

// Load all data
async function loadAllData() {
  showLoading(true);
  
  try {
    await Promise.all([
      loadSuggestions(),
      loadSuggestedEdits(),
      loadCreators(),
      updateStats()
    ]);
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Failed to load data. Please refresh the page.');
  } finally {
    showLoading(false);
  }
}

// Load suggestions
async function loadSuggestions() {
  try {
    const response = await fetch('/api/admin/suggestions');
    const suggestions = await response.json();
    
    const tbody = document.getElementById('suggestionsTable');
    tbody.innerHTML = '';
    
    if (suggestions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending suggestions</td></tr>';
      return;
    }
    
    suggestions.forEach((suggestion, index) => {
      const row = document.createElement('tr');
      
      // Format socials
      const socials = [];
      Object.entries(suggestion.socials || {}).forEach(([platform, links]) => {
        if (links && links.length > 0) {
          socials.push(platform);
        }
      });
      
      row.innerHTML = `
        <td><strong>${escapeHtml(suggestion.name)}</strong></td>
        <td><span class="badge ${suggestion.FullyForked ? 'bg-success' : 'bg-secondary'}">${suggestion.FullyForked ? 'Yes' : 'No'}</span></td>
        <td>${formatDate(suggestion.submissionDate)}</td>
        <td class="social-links">${socials.join(', ') || 'None'}</td>
        <td>${escapeHtml(suggestion.Notes || '-')}</td>
        <td>
          <div class="btn-group-compact">
            <button class="btn btn-primary btn-sm" onclick="editSuggestion(${index})">Edit</button>
            <button class="btn btn-success btn-sm" onclick="approveSuggestion(${index})">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSuggestion(${index})">Delete</button>
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading suggestions:', error);
  }
}

// Load suggested edits
async function loadSuggestedEdits() {
  try {
    const response = await fetch('/api/admin/suggested-edits');
    const edits = await response.json();
    
    const tbody = document.getElementById('editsTable');
    tbody.innerHTML = '';
    
    if (edits.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending edit suggestions</td></tr>';
      return;
    }
    
    edits.forEach((edit, index) => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${escapeHtml(edit.originalCreatorName)}</td>
        <td><strong>${escapeHtml(edit.name)}</strong></td>
        <td><span class="badge ${edit.FullyForked ? 'bg-success' : 'bg-secondary'}">${edit.FullyForked ? 'Yes' : 'No'}</span></td>
        <td>${formatDate(edit.submissionDate)}</td>
        <td><button class="btn btn-sm btn-outline-primary" onclick="viewDetails(${index}, 'edit')">View Changes</button></td>
        <td>
          <div class="btn-group-compact">
            <button class="btn btn-success btn-sm" onclick="applyEdit(${index})">Apply</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEdit(${index})">Delete</button>
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading suggested edits:', error);
  }
}

// Load creators
async function loadCreators() {
  try {
    const response = await fetch('/data/creators.json');
    const creators = await response.json();
    
    const tbody = document.getElementById('creatorsTable');
    tbody.innerHTML = '';
    
    creators.forEach((creator, index) => {
      const row = document.createElement('tr');
      
      // Format socials
      const socials = [];
      Object.entries(creator.socials || {}).forEach(([platform, links]) => {
        if (links && links.length > 0) {
          socials.push(platform);
        }
      });
      
      row.innerHTML = `
        <td><strong>${escapeHtml(creator.name)}</strong></td>
        <td>${creator.image ? '<img src="' + creator.image + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">' : 'No image'}</td>
        <td><span class="badge ${creator.FullyForked ? 'bg-success' : 'bg-secondary'}">${creator.FullyForked ? 'Yes' : 'No'}</span></td>
        <td class="social-links">${socials.join(', ') || 'None'}</td>
        <td>
          <button class="btn btn-primary btn-sm btn-action" onclick="alert('Edit functionality coming soon')">Edit</button>
          <button class="btn btn-danger btn-sm btn-action" onclick="deleteCreator(${index}, '${escapeHtml(creator.name)}')">Delete</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading creators:', error);
  }
}

// Update statistics
async function updateStats() {
  try {
    const [creatorsRes, suggestionsRes, editsRes] = await Promise.all([
      fetch('/data/creators.json'),
      fetch('/api/admin/suggestions'),
      fetch('/api/admin/suggested-edits')
    ]);
    
    const creators = await creatorsRes.json();
    const suggestions = await suggestionsRes.json();
    const edits = await editsRes.json();
    
    const fullyForkedCount = creators.filter(c => c.FullyForked === true).length;
    
    document.getElementById('totalCreators').textContent = creators.length;
    document.getElementById('pendingSuggestions').textContent = suggestions.length;
    document.getElementById('pendingEdits').textContent = edits.length;
    document.getElementById('fullyForked').textContent = fullyForkedCount;
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Approve suggestion
async function approveSuggestion(index) {
  if (!confirm('Are you sure you want to approve this suggestion and add it to the creators list?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggestions/${index}/approve`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Suggestion approved successfully!');
      await loadAllData();
    } else {
      alert('Failed to approve suggestion: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error approving suggestion:', error);
    alert('Failed to approve suggestion');
  }
}

// Edit suggestion - open modal with form
async function editSuggestion(index) {
  try {
    const response = await fetch('/api/admin/suggestions');
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    
    const suggestions = await response.json();
    const suggestion = suggestions[index];
    
    if (!suggestion) {
      alert('Suggestion not found');
      return;
    }
    
    // Store the index for later use
    document.getElementById('editSuggestionIndex').value = index;
    
    // Populate form fields
    document.getElementById('editName').value = suggestion.name || '';
    document.getElementById('editImage').value = suggestion.image || '';
    document.getElementById('editNotes').value = suggestion.Notes || '';
    
    // Set dates
    if (suggestion.CreatedDate) {
      const createdDate = new Date(suggestion.CreatedDate);
      document.getElementById('editCreatedDate').value = createdDate.toISOString().split('T')[0];
    }
    if (suggestion.ExitDate) {
      const exitDate = new Date(suggestion.ExitDate);
      document.getElementById('editExitDate').value = exitDate.toISOString().split('T')[0];
    }
    
    // Set Fully Forked status
    if (suggestion.FullyForked === true) {
      document.getElementById('editFullyForked').value = 'true';
    } else {
      document.getElementById('editFullyForked').value = 'false';
    }
    
    // Set nicknames
    if (suggestion.nicknames && suggestion.nicknames.length > 0) {
      document.getElementById('editNicknames').value = suggestion.nicknames.join(', ');
    }
    
    // Set social media fields
    const socials = suggestion.socials || {};
    document.getElementById('editYoutube').value = socials.youtube?.[0]?.url || '';
    document.getElementById('editTwitter').value = socials.twitter?.[0]?.url || '';
    document.getElementById('editInstagram').value = socials.instagram?.[0]?.url || '';
    document.getElementById('editTwitch').value = socials.twitch?.[0]?.url || '';
    document.getElementById('editBluesky').value = socials.bluesky?.[0]?.url || '';
    document.getElementById('editLinkedin').value = socials.linkedin?.[0]?.url || '';
    document.getElementById('editReddit').value = socials.reddit?.[0]?.url || '';
    document.getElementById('editSoundcloud').value = socials.soundcloud?.[0]?.url || '';
    document.getElementById('editLttforum').value = socials.lttforum?.[0]?.url || '';
    document.getElementById('editWebsite').value = socials.website?.[0]?.url || '';
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editSuggestionModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error loading suggestion for edit:', error);
    alert('Failed to load suggestion details: ' + error.message);
  }
}

// Save edited suggestion (update without approving)
async function saveEditedSuggestion() {
  const index = document.getElementById('editSuggestionIndex').value;
  const updatedData = getFormData();
  
  try {
    const response = await fetch(`/api/admin/suggestions/${index}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Suggestion updated successfully!');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editSuggestionModal'));
      modal.hide();
      
      // Reload data
      await loadAllData();
    } else {
      alert('Failed to update suggestion: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error saving suggestion:', error);
    alert('Failed to save suggestion');
  }
}

// Approve edited suggestion (save and move to creators)
async function approveEditedSuggestion() {
  if (!confirm('Are you sure you want to save changes and approve this suggestion?')) {
    return;
  }
  
  const index = document.getElementById('editSuggestionIndex').value;
  const updatedData = getFormData();
  
  try {
    // First, update the suggestion
    const updateResponse = await fetch(`/api/admin/suggestions/${index}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    const updateResult = await updateResponse.json();
    
    if (!updateResult.success) {
      alert('Failed to update suggestion: ' + (updateResult.error || 'Unknown error'));
      return;
    }
    
    // Then approve it
    const approveResponse = await fetch(`/api/admin/suggestions/${index}/approve`, {
      method: 'POST'
    });
    
    const approveResult = await approveResponse.json();
    
    if (approveResult.success) {
      alert('Suggestion updated and approved successfully!');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editSuggestionModal'));
      modal.hide();
      
      // Reload data
      await loadAllData();
    } else {
      alert('Failed to approve suggestion: ' + (approveResult.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error approving edited suggestion:', error);
    alert('Failed to approve suggestion');
  }
}

// Get form data from edit modal
function getFormData() {
  const name = document.getElementById('editName').value.trim();
  const image = document.getElementById('editImage').value.trim();
  const notes = document.getElementById('editNotes').value.trim();
  const createdDate = document.getElementById('editCreatedDate').value;
  const exitDate = document.getElementById('editExitDate').value;
  const fullyForked = document.getElementById('editFullyForkedYes').checked;
  const nicknamesStr = document.getElementById('editNicknames').value.trim();
  
  // Parse nicknames
  const nicknames = nicknamesStr ? nicknamesStr.split(',').map(n => n.trim()).filter(n => n) : [];
  
  // Build socials object
  const socials = {
    youtube: [],
    twitter: [],
    instagram: [],
    twitch: [],
    bluesky: [],
    linkedin: [],
    reddit: [],
    soundcloud: [],
    lttforum: [],
    website: []
  };
  
  // Add social URLs if provided
  const youtubeUrl = document.getElementById('editYoutube').value.trim();
  if (youtubeUrl) socials.youtube.push({ channelId: "", url: youtubeUrl, visible: true });
  
  const twitterUrl = document.getElementById('editTwitter').value.trim();
  if (twitterUrl) socials.twitter.push({ url: twitterUrl, visible: true });
  
  const instagramUrl = document.getElementById('editInstagram').value.trim();
  if (instagramUrl) socials.instagram.push({ url: instagramUrl, visible: true });
  
  const twitchUrl = document.getElementById('editTwitch').value.trim();
  if (twitchUrl) socials.twitch.push({ url: twitchUrl, visible: true });
  
  const blueskyUrl = document.getElementById('editBluesky').value.trim();
  if (blueskyUrl) socials.bluesky.push({ url: blueskyUrl, visible: true });
  
  const linkedinUrl = document.getElementById('editLinkedin').value.trim();
  if (linkedinUrl) socials.linkedin.push({ url: linkedinUrl, visible: true });
  
  const redditUrl = document.getElementById('editReddit').value.trim();
  if (redditUrl) socials.reddit.push({ url: redditUrl, visible: true });
  
  const soundcloudUrl = document.getElementById('editSoundcloud').value.trim();
  if (soundcloudUrl) socials.soundcloud.push({ url: soundcloudUrl, visible: true });
  
  const lttforumUrl = document.getElementById('editLttforum').value.trim();
  if (lttforumUrl) socials.lttforum.push({ url: lttforumUrl, visible: true });
  
  const websiteUrl = document.getElementById('editWebsite').value.trim();
  if (websiteUrl) socials.website.push({ url: websiteUrl, visible: true });
  
  return {
    name,
    image,
    CreatedDate: createdDate ? new Date(createdDate).toISOString() : new Date().toISOString(),
    ExitDate: exitDate ? new Date(exitDate).toISOString() : "",
    nicknames,
    FullyForked: fullyForked,
    socials,
    Notes: notes,
    status: "pending"
  };
}

// Delete suggestion
async function deleteSuggestion(index) {
  if (!confirm('Are you sure you want to delete this suggestion?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggestions/${index}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Suggestion deleted successfully!');
      await loadAllData();
    } else {
      alert('Failed to delete suggestion: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    alert('Failed to delete suggestion');
  }
}

// Apply suggested edit (update creator with edit data)
async function applyEdit(index) {
  if (!confirm('Are you sure you want to apply this edit to the creator?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggested-edits/${index}/apply`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Edit applied successfully!');
      await loadAllData();
    } else {
      alert('Failed to apply edit: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error applying edit:', error);
    alert('Failed to apply edit');
  }
}

// Delete suggested edit
async function deleteEdit(index) {
  if (!confirm('Are you sure you want to delete this suggested edit?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggested-edits/${index}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Edit deleted successfully!');
      await loadAllData();
    } else {
      alert('Failed to delete edit: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error deleting edit:', error);
    alert('Failed to delete edit');
  }
}

// Delete creator
async function deleteCreator(index, name) {
  if (!confirm(`Are you sure you want to delete "${name}" from the creators list?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/creators/${index}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Creator deleted successfully!');
      await loadAllData();
    } else {
      alert('Failed to delete creator: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error deleting creator:', error);
    alert('Failed to delete creator');
  }
}

// View details in modal
async function viewDetails(index, type) {
  try {
    let data;
    
    if (type === 'suggestion') {
      const response = await fetch('/api/admin/suggestions');
      const suggestions = await response.json();
      data = suggestions[index];
    } else {
      const response = await fetch('/api/admin/suggested-edits');
      const edits = await response.json();
      data = edits[index];
    }
    
    // Build detailed view HTML
    let details = `
      <div class="details-container">
        <div class="detail-section">
          <h6>Basic Information</h6>
          <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${escapeHtml(data.name)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fully Forked:</span>
            <span class="detail-value"><span class="badge ${data.FullyForked ? 'bg-success' : 'bg-secondary'}">${data.FullyForked ? 'Yes' : 'No'}</span></span>
          </div>
          ${data.image ? `
            <div class="detail-row">
              <span class="detail-label">Image:</span>
              <div class="detail-image"><img src="${data.image}" alt="${escapeHtml(data.name)}"></div>
            </div>
          ` : ''}
          ${data.Notes ? `
            <div class="detail-row">
              <span class="detail-label">Notes:</span>
              <span class="detail-value">${escapeHtml(data.Notes)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="detail-section">
          <h6>Social Media</h6>
    `;
    
    let hasSocials = false;
    Object.entries(data.socials || {}).forEach(([platform, links]) => {
      if (links && links.length > 0) {
        hasSocials = true;
        links.forEach(link => {
          const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
          details += `
            <div class="detail-row">
              <span class="detail-label">${platformName}:</span>
              <span class="detail-value"><a href="${link.url}" target="_blank" class="text-info">${escapeHtml(link.url)}</a></span>
            </div>
          `;
        });
      }
    });
    
    if (!hasSocials) {
      details += '<p class="text-muted">No social media links provided</p>';
    }
    
    details += `
        </div>
      </div>
    `;
    
    document.getElementById('editDetailsContent').innerHTML = details;
    const modal = new bootstrap.Modal(document.getElementById('viewEditModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error viewing details:', error);
    alert('Failed to load details');
  }
}

// Show/hide loading indicator
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (show) {
    loading.classList.add('active');
  } else {
    loading.classList.remove('active');
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
