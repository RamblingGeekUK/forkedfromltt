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
      loadAds(),
      loadFaq(),
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
            <button class="btn btn-primary btn-sm" onclick="editSuggestion('${suggestion.id}')">Edit</button>
            <button class="btn btn-success btn-sm" onclick="approveSuggestion('${suggestion.id}')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSuggestion('${suggestion.id}')">Delete</button>
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
        <td><button class="btn btn-sm btn-outline-primary" onclick="viewDetails('${edit.id}', 'edit')">View Changes</button></td>
        <td>
          <div class="btn-group-compact">
            <button class="btn btn-success btn-sm" onclick="applyEdit('${edit.id}')">Apply</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEdit('${edit.id}')">Delete</button>
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
    const response = await fetch('/api/admin/creators');
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
          <button class="btn btn-primary btn-sm btn-action" onclick="editCreator('${creator.id}')">Edit</button>
          <button class="btn btn-danger btn-sm btn-action" onclick="deleteCreator('${creator.id}', '${escapeHtml(creator.name)}')">Delete</button>
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
      fetch('/api/admin/creators'),
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
async function approveSuggestion(id) {
  if (!confirm('Are you sure you want to approve this suggestion and add it to the creators list?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggestions/${id}/approve`, {
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
async function editSuggestion(id) {
  try {
    const response = await fetch('/api/admin/suggestions');
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    
    const suggestions = await response.json();
    const suggestion = suggestions.find(s => s.id === id);
    
    if (!suggestion) {
      alert('Suggestion not found');
      return;
    }
    
    // Store the id for later use
    document.getElementById('editSuggestionIndex').value = id;
    
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
    document.getElementById('editYoutube2').value = socials.youtube?.[1]?.url || '';
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
  const id = document.getElementById('editSuggestionIndex').value;
  const updatedData = getFormData();
  
  try {
    const response = await fetch(`/api/admin/suggestions/${id}`, {
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
  
  const id = document.getElementById('editSuggestionIndex').value;
  const updatedData = getFormData();
  
  try {
    // First, update the suggestion
    const updateResponse = await fetch(`/api/admin/suggestions/${id}`, {
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
    const approveResponse = await fetch(`/api/admin/suggestions/${id}/approve`, {
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
  const fullyForked = document.getElementById('editFullyForked').value === 'true';
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
  
  const youtubeUrl2 = document.getElementById('editYoutube2').value.trim();
  if (youtubeUrl2) socials.youtube.push({ channelId: "", url: youtubeUrl2, visible: true });
  
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
async function deleteSuggestion(id) {
  if (!confirm('Are you sure you want to delete this suggestion?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggestions/${id}`, {
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
async function applyEdit(id) {
  if (!confirm('Are you sure you want to apply this edit to the creator?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggested-edits/${id}/apply`, {
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
async function deleteEdit(id) {
  if (!confirm('Are you sure you want to delete this suggested edit?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/suggested-edits/${id}`, {
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
async function deleteCreator(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}" from the creators list?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/creators/${id}`, {
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

// Track what we're editing
let editingCreatorId = null;
let editingType = 'suggestion'; // 'suggestion' or 'creator'

// Edit existing creator
async function editCreator(id) {
  try {
    const response = await fetch(`/api/admin/creators/${id}`);
    if (!response.ok) throw new Error('Failed to fetch creator');
    
    const creator = await response.json();
    
    if (!creator) {
      alert('Creator not found');
      return;
    }
    
    // Set edit mode to creator
    editingCreatorId = id;
    editingType = 'creator';
    
    // Update modal title
    const modalTitle = document.querySelector('#editSuggestionModal .modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Creator';
    }
    
    // Hide the "Save Changes" button (it's for suggestions), show only "Save Creator" 
    const saveBtn = document.querySelector('#editSuggestionModal .btn-info');
    const approveBtn = document.querySelector('#editSuggestionModal .btn-success');
    if (saveBtn) saveBtn.style.display = 'none';
    if (approveBtn) {
      approveBtn.textContent = 'Save Creator';
      approveBtn.onclick = saveCreatorEdit;
    }
    
    // Store the id
    document.getElementById('editSuggestionIndex').value = id;
    
    // Populate form fields
    document.getElementById('editName').value = creator.name || '';
    document.getElementById('editImage').value = creator.image || '';
    document.getElementById('editNotes').value = creator.Notes || '';
    
    // Set dates
    if (creator.CreatedDate) {
      const createdDate = new Date(creator.CreatedDate);
      document.getElementById('editCreatedDate').value = createdDate.toISOString().split('T')[0];
    } else {
      document.getElementById('editCreatedDate').value = '';
    }
    if (creator.ExitDate) {
      const exitDate = new Date(creator.ExitDate);
      document.getElementById('editExitDate').value = exitDate.toISOString().split('T')[0];
    } else {
      document.getElementById('editExitDate').value = '';
    }
    
    // Set Fully Forked status via select
    document.getElementById('editFullyForked').value = creator.FullyForked === true ? 'true' : 'false';
    
    // Set nicknames
    if (creator.nicknames && creator.nicknames.length > 0) {
      document.getElementById('editNicknames').value = creator.nicknames.join(', ');
    } else {
      document.getElementById('editNicknames').value = '';
    }
    
    // Set social media fields
    const socials = creator.socials || {};
    document.getElementById('editYoutube').value = socials.youtube?.[0]?.url || '';
    document.getElementById('editYoutube2').value = socials.youtube?.[1]?.url || '';
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
    
    // Reset modal when closed
    document.getElementById('editSuggestionModal').addEventListener('hidden.bs.modal', resetEditModal, { once: true });
    
  } catch (error) {
    console.error('Error loading creator for edit:', error);
    alert('Failed to load creator details: ' + error.message);
  }
}

// Save creator edit
async function saveCreatorEdit() {
  const id = editingCreatorId;
  const updatedData = getFormData();
  
  try {
    const response = await fetch(`/api/admin/creators/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Creator updated successfully!');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editSuggestionModal'));
      modal.hide();
      
      // Reload data
      await loadAllData();
    } else {
      alert('Failed to update creator: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error saving creator:', error);
    alert('Failed to save creator');
  }
}

// Reset modal to default state (for suggestions)
function resetEditModal() {
  editingCreatorId = null;
  editingType = 'suggestion';
  
  const modalTitle = document.querySelector('#editSuggestionModal .modal-title');
  if (modalTitle) {
    modalTitle.textContent = 'Edit Suggestion';
  }
  
  const saveBtn = document.querySelector('#editSuggestionModal .btn-info');
  const approveBtn = document.querySelector('#editSuggestionModal .btn-success');
  if (saveBtn) saveBtn.style.display = '';
  if (approveBtn) {
    approveBtn.textContent = 'Save & Approve';
    approveBtn.onclick = approveEditedSuggestion;
  }
}

// View details in modal
async function viewDetails(id, type) {
  try {
    let data;
    let originalData = null;
    
    if (type === 'suggestion') {
      const response = await fetch('/api/admin/suggestions');
      const suggestions = await response.json();
      data = suggestions.find(s => s.id === id);
    } else {
      const response = await fetch('/api/admin/suggested-edits');
      const edits = await response.json();
      data = edits.find(e => e.id === id);
      
      // Fetch the original creator for comparison
      if (data && data.parentId) {
        const originalResponse = await fetch(`/api/admin/creators/${data.parentId}`);
        if (originalResponse.ok) {
          originalData = await originalResponse.json();
        }
      }
    }
    
    let details = '';
    
    if (type === 'edit' && originalData) {
      // Show comparison view for edits
      details = buildComparisonView(originalData, data);
    } else {
      // Show simple view for new suggestions
      details = buildSimpleView(data);
    }
    
    document.getElementById('editDetailsContent').innerHTML = details;
    const modal = new bootstrap.Modal(document.getElementById('viewEditModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error viewing details:', error);
    alert('Failed to load details');
  }
}

// Build comparison view showing original vs proposed changes
function buildComparisonView(original, proposed) {
  let html = `
    <div class="comparison-container">
      <style>
        .comparison-container { color: var(--text-primary, #fafafa); }
        .comparison-header {
          display: grid;
          grid-template-columns: 140px 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-surface, #27272a);
          border-radius: 8px;
          margin-bottom: 1rem;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted, #71717a);
        }
        .comparison-row {
          display: grid;
          grid-template-columns: 140px 1fr 1fr;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
          align-items: start;
        }
        .comparison-row:last-child { border-bottom: none; }
        .comparison-label {
          font-weight: 500;
          color: var(--text-muted, #71717a);
          font-size: 0.875rem;
        }
        .comparison-value {
          font-size: 0.875rem;
          word-break: break-word;
        }
        .comparison-value.original {
          color: var(--text-secondary, #a1a1aa);
        }
        .comparison-value.proposed {
          color: var(--text-primary, #fafafa);
        }
        .comparison-value.changed {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          color: #4ade80;
        }
        .comparison-value.unchanged {
          color: var(--text-muted, #71717a);
          font-style: italic;
        }
        .comparison-section {
          margin-bottom: 1.5rem;
        }
        .comparison-section h6 {
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
          font-size: 0.875rem;
          font-weight: 600;
        }
        .comparison-image {
          max-width: 120px;
          border-radius: 6px;
          border: 1px solid var(--border, rgba(255,255,255,0.1));
        }
        .no-change { opacity: 0.5; }
        .badge-changed {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 500;
          margin-left: 0.5rem;
        }
      </style>
      
      <div class="comparison-section">
        <h6>Basic Information</h6>
        <div class="comparison-header">
          <span>Field</span>
          <span>Current Value</span>
          <span>Proposed Change</span>
        </div>
  `;
  
  // Compare basic fields
  html += buildComparisonRow('Name', original.name, proposed.name);
  html += buildComparisonRow('Fully Forked', 
    original.FullyForked ? 'Yes' : 'No', 
    proposed.FullyForked ? 'Yes' : 'No',
    'badge'
  );
  html += buildComparisonRow('Exit Date', original.ExitDate || 'Not set', proposed.ExitDate || 'Not set');
  html += buildComparisonRow('Notes', original.Notes || 'None', proposed.Notes || 'None');
  html += buildComparisonRow('Nicknames', 
    (original.nicknames || []).join(', ') || 'None', 
    (proposed.nicknames || []).join(', ') || 'None'
  );
  
  // Compare images
  const originalImg = original.image ? `<img src="${original.image}" class="comparison-image" onerror="this.src='images/default-creator.png'">` : '<span class="text-muted">No image</span>';
  const proposedImg = proposed.image ? `<img src="${proposed.image}" class="comparison-image" onerror="this.src='images/default-creator.png'">` : '<span class="text-muted">No image</span>';
  const imageChanged = original.image !== proposed.image;
  
  html += `
    <div class="comparison-row">
      <span class="comparison-label">Image${imageChanged ? '<span class="badge-changed">Changed</span>' : ''}</span>
      <div class="comparison-value original">${originalImg}</div>
      <div class="comparison-value proposed ${imageChanged ? 'changed' : 'unchanged'}">${proposedImg}</div>
    </div>
  `;
  
  html += `</div>`;
  
  // Compare social media
  html += `
    <div class="comparison-section">
      <h6>Social Media</h6>
      <div class="comparison-header">
        <span>Platform</span>
        <span>Current</span>
        <span>Proposed</span>
      </div>
  `;
  
  // Get all platforms from both original and proposed
  const allPlatforms = new Set([
    ...Object.keys(original.socials || {}),
    ...Object.keys(proposed.socials || {})
  ]);
  
  allPlatforms.forEach(platform => {
    const originalLinks = (original.socials?.[platform] || []).map(l => l.url).join(', ') || 'None';
    const proposedLinks = (proposed.socials?.[platform] || []).map(l => l.url).join(', ') || 'None';
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    html += buildComparisonRow(platformName, originalLinks, proposedLinks);
  });
  
  if (allPlatforms.size === 0) {
    html += '<p class="text-muted" style="padding: 1rem;">No social media links</p>';
  }
  
  html += `</div></div>`;
  
  return html;
}

// Build a single comparison row
function buildComparisonRow(label, originalValue, proposedValue, type = 'text') {
  const hasChanged = originalValue !== proposedValue;
  const changedBadge = hasChanged ? '<span class="badge-changed">Changed</span>' : '';
  
  let originalDisplay = escapeHtml(originalValue);
  let proposedDisplay = escapeHtml(proposedValue);
  
  if (type === 'badge') {
    const origClass = originalValue === 'Yes' ? 'bg-success' : 'bg-secondary';
    const propClass = proposedValue === 'Yes' ? 'bg-success' : 'bg-secondary';
    originalDisplay = `<span class="badge ${origClass}">${originalValue}</span>`;
    proposedDisplay = `<span class="badge ${propClass}">${proposedValue}</span>`;
  }
  
  return `
    <div class="comparison-row ${hasChanged ? '' : 'no-change'}">
      <span class="comparison-label">${label}${changedBadge}</span>
      <div class="comparison-value original">${originalDisplay}</div>
      <div class="comparison-value proposed ${hasChanged ? 'changed' : 'unchanged'}">${proposedDisplay}</div>
    </div>
  `;
}

// Build simple view for new suggestions
function buildSimpleView(data) {
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
            <div class="detail-image"><img src="${data.image}" alt="${escapeHtml(data.name)}" onerror="this.src='images/default-creator.png'"></div>
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
  
  return details;
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

// ==================== ADS FUNCTIONS ====================

// Load ads
async function loadAds() {
  try {
    const response = await fetch('/api/admin/ads');
    const ads = await response.json();
    
    const tbody = document.getElementById('adsTable');
    tbody.innerHTML = '';
    
    if (ads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No ads found</td></tr>';
      return;
    }
    
    ads.forEach(ad => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(ad.name)}</td>
        <td>${ad.image ? `<img src="${escapeHtml(ad.image)}" alt="${escapeHtml(ad.name)}" style="max-height: 40px; border-radius: 4px;">` : '-'}</td>
        <td>${ad.website ? `<a href="${escapeHtml(ad.website)}" target="_blank" class="text-info">${escapeHtml(ad.website)}</a>` : '-'}</td>
        <td>${ad.ad ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="editAd('${ad.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAd('${ad.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading ads:', error);
  }
}

// Show add ad modal
function showAddAdModal() {
  document.getElementById('adModalLabel').textContent = 'Add Ad';
  document.getElementById('adId').value = '';
  document.getElementById('adName').value = '';
  document.getElementById('adImage').value = '';
  document.getElementById('adWebsite').value = '';
  document.getElementById('adIsAd').checked = true;
  
  const modal = new bootstrap.Modal(document.getElementById('adModal'));
  modal.show();
}

// Edit ad
async function editAd(id) {
  try {
    const response = await fetch(`/api/admin/ads/${id}`);
    const ad = await response.json();
    
    document.getElementById('adModalLabel').textContent = 'Edit Ad';
    document.getElementById('adId').value = ad.id;
    document.getElementById('adName').value = ad.name;
    document.getElementById('adImage').value = ad.image || '';
    document.getElementById('adWebsite').value = ad.website || '';
    document.getElementById('adIsAd').checked = ad.ad;
    
    const modal = new bootstrap.Modal(document.getElementById('adModal'));
    modal.show();
  } catch (error) {
    console.error('Error loading ad:', error);
    alert('Failed to load ad');
  }
}

// Save ad
async function saveAd() {
  const id = document.getElementById('adId').value;
  const ad = {
    name: document.getElementById('adName').value,
    image: document.getElementById('adImage').value,
    website: document.getElementById('adWebsite').value,
    ad: document.getElementById('adIsAd').checked
  };
  
  if (!ad.name.trim()) {
    alert('Ad name is required');
    return;
  }
  
  try {
    const url = id ? `/api/admin/ads/${id}` : '/api/admin/ads';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ad)
    });
    
    const result = await response.json();
    
    if (result.success) {
      bootstrap.Modal.getInstance(document.getElementById('adModal')).hide();
      await loadAds();
    } else {
      alert(result.error || 'Failed to save ad');
    }
  } catch (error) {
    console.error('Error saving ad:', error);
    alert('Failed to save ad');
  }
}

// Delete ad
async function deleteAd(id) {
  if (!confirm('Are you sure you want to delete this ad?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/ads/${id}`, { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      await loadAds();
    } else {
      alert(result.error || 'Failed to delete ad');
    }
  } catch (error) {
    console.error('Error deleting ad:', error);
    alert('Failed to delete ad');
  }
}

// ==================== FAQ FUNCTIONS ====================

// Load FAQ
async function loadFaq() {
  try {
    const response = await fetch('/api/admin/faq');
    const faqList = await response.json();
    
    const tbody = document.getElementById('faqTable');
    tbody.innerHTML = '';
    
    if (faqList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No FAQ items found</td></tr>';
      return;
    }
    
    faqList.forEach(faq => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(faq.question)}</td>
        <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(faq.answer.substring(0, 100))}${faq.answer.length > 100 ? '...' : ''}</td>
        <td>${faq.expanded ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="editFaq('${faq.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFaq('${faq.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading FAQ:', error);
  }
}

// Show add FAQ modal
function showAddFaqModal() {
  document.getElementById('faqModalLabel').textContent = 'Add FAQ';
  document.getElementById('faqId').value = '';
  document.getElementById('faqQuestion').value = '';
  document.getElementById('faqAnswer').value = '';
  document.getElementById('faqExpanded').checked = false;
  
  const modal = new bootstrap.Modal(document.getElementById('faqModal'));
  modal.show();
}

// Edit FAQ
async function editFaq(id) {
  try {
    const response = await fetch(`/api/admin/faq/${id}`);
    const faq = await response.json();
    
    document.getElementById('faqModalLabel').textContent = 'Edit FAQ';
    document.getElementById('faqId').value = faq.id;
    document.getElementById('faqQuestion').value = faq.question;
    document.getElementById('faqAnswer').value = faq.answer;
    document.getElementById('faqExpanded').checked = faq.expanded;
    
    const modal = new bootstrap.Modal(document.getElementById('faqModal'));
    modal.show();
  } catch (error) {
    console.error('Error loading FAQ:', error);
    alert('Failed to load FAQ');
  }
}

// Save FAQ
async function saveFaq() {
  const id = document.getElementById('faqId').value;
  const faq = {
    question: document.getElementById('faqQuestion').value,
    answer: document.getElementById('faqAnswer').value,
    expanded: document.getElementById('faqExpanded').checked
  };
  
  if (!faq.question.trim() || !faq.answer.trim()) {
    alert('Question and answer are required');
    return;
  }
  
  try {
    const url = id ? `/api/admin/faq/${id}` : '/api/admin/faq';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(faq)
    });
    
    const result = await response.json();
    
    if (result.success) {
      bootstrap.Modal.getInstance(document.getElementById('faqModal')).hide();
      await loadFaq();
    } else {
      alert(result.error || 'Failed to save FAQ');
    }
  } catch (error) {
    console.error('Error saving FAQ:', error);
    alert('Failed to save FAQ');
  }
}

// Delete FAQ
async function deleteFaq(id) {
  if (!confirm('Are you sure you want to delete this FAQ?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/faq/${id}`, { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      await loadFaq();
    } else {
      alert(result.error || 'Failed to delete FAQ');
    }
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    alert('Failed to delete FAQ');
  }
}
