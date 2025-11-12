// Get grid element
const allCreatorsGrid = document.getElementById("allCreatorsGrid");

// Hide grid initially
if (allCreatorsGrid) allCreatorsGrid.style.display = "none";

// Function to create creator card HTML
function createCreatorCard(channel) {
  const col = document.createElement("div");
  col.className = "col-lg-4 col-md-6 col-12 d-flex";
  
  if (channel.isAd) {
    // Render AD card
    const notAdLabel = channel.ad === false ? `<span style="font-size:0.8em;" class="badge bg-warning text-dark ms-2">NOT AN AD</span>` : '';
    col.innerHTML = `
      <div class="card h-100 shadow-lg border-0 border-warning" style="border-width: 2px !important;">
        <img src="${channel.thumbnail || channel.image || ''}" class="card-img-top" alt="${channel.channel}" style="border-top-left-radius: 1rem; border-top-right-radius: 1rem; object-fit: cover; height: 220px; background: #23272a;">
        <div class="card-body d-flex flex-column justify-content-between">
          <h5 class="card-title fw-semibold text-warning">${channel.channel} ${notAdLabel}</h5>
          <a href="${channel.website}" target="_blank" class="btn btn-warning w-100 mt-auto">Visit Website</a>
        </div>
      </div>
    `;
  } else {
    // Render normal creator card with flip functionality
    const hasVideoData = channel.videoId && channel.thumbnail;
    const creatorImageSrc = channel.image || channel.thumbnail || '';
    const defaultImage = 'images/default-creator.png';
    const finalImageSrc = creatorImageSrc && creatorImageSrc.trim() !== '' ? creatorImageSrc : defaultImage;
    
    // Build social media icons dynamically
    let socialIcons = '';
    let socialDetails = '';
    if (channel.socials) {
      // YouTube
      if (channel.socials.youtube && Array.isArray(channel.socials.youtube)) {
        let youtubeChannels = channel.socials.youtube.filter(yt => yt.visible && yt.url);
        youtubeChannels.forEach(yt => {
          socialIcons += `<a href="${yt.url}" target="_blank" title="YouTube" class="me-3"><svg width="28" height="28" fill="#ff0000" viewBox="0 0 24 24"><path d="M23.498 6.186a2.994 2.994 0 0 0-2.112-2.12C19.228 3.5 12 3.5 12 3.5s-7.228 0-9.386.566A2.994 2.994 0 0 0 .502 6.186C0 8.344 0 12 0 12s0 3.656.502 5.814a2.994 2.994 0 0 0 2.112 2.12C4.772 20.5 12 20.5 12 20.5s7.228 0 9.386-.566a2.994 2.994 0 0 0 2.112-2.12C24 15.656 24 12 24 12s0-3.656-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>`;
        });
        if (youtubeChannels.length > 0) {
          socialDetails += `<div class="social-detail"><strong>YouTube:</strong> <span class="social-count">${youtubeChannels.length} channel${youtubeChannels.length > 1 ? 's' : ''}</span></div>`;
        }
      }
      // Twitter
      if (channel.socials.twitter && Array.isArray(channel.socials.twitter)) {
        let twitterAccounts = channel.socials.twitter.filter(tw => tw.visible && tw.url);
        twitterAccounts.forEach(tw => {
          socialIcons += `<a href="${tw.url}" target="_blank" title="Twitter/X" class="me-3"><svg width="28" height="28" fill="#1da1f2" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195A4.92 4.92 0 0 0 16.616 3c-2.73 0-4.942 2.21-4.942 4.932 0 .386.045.763.127 1.124C7.728 8.807 4.1 6.884 1.671 3.965c-.423.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 0 1-2.237-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 0 1-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0 0 24 4.557z"/></svg></a>`;
        });
        if (twitterAccounts.length > 0) {
          socialDetails += `<div class="social-detail"><strong>Twitter/X:</strong> <span class="social-count">${twitterAccounts.length} account${twitterAccounts.length > 1 ? 's' : ''}</span></div>`;
        }
      }
      // Instagram
      if (channel.socials.instagram && Array.isArray(channel.socials.instagram)) {
        let instagramAccounts = channel.socials.instagram.filter(ig => ig.visible && ig.url);
        instagramAccounts.forEach(ig => {
          socialIcons += `<a href="${ig.url}" target="_blank" title="Instagram" class="me-3"><svg width="28" height="28" fill="#E4405F" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>`;
        });
        if (instagramAccounts.length > 0) {
          socialDetails += `<div class="social-detail"><strong>Instagram:</strong> <span class="social-count">${instagramAccounts.length} account${instagramAccounts.length > 1 ? 's' : ''}</span></div>`;
        }
      }
      // Website
      if (channel.socials.website && Array.isArray(channel.socials.website)) {
        let websites = channel.socials.website.filter(web => web.visible && web.url);
        websites.forEach(web => {
          socialIcons += `<a href="${web.url}" target="_blank" title="Website" class="me-3"><svg width="28" height="28" fill="#b0b3b8" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></a>`;
        });
        if (websites.length > 0) {
          socialDetails += `<div class="social-detail"><strong>Website:</strong> <span class="social-count">${websites.length} site${websites.length > 1 ? 's' : ''}</span></div>`;
        }
      }
      // Bluesky
      if (channel.socials.bluesky && Array.isArray(channel.socials.bluesky)) {
        let blueskyAccounts = channel.socials.bluesky.filter(bs => bs.visible && bs.url);
        blueskyAccounts.forEach(bs => {
          socialIcons += `<a href="${bs.url}" target="_blank" title="Bluesky" class="me-3"><svg width="28" height="28" fill="#0077ff" viewBox="0 0 24 24"><path d="M12 2c1.657 0 3 1.343 3 3 0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.657 1.343-3 3-3zm0 18c-1.657 0-3-1.343-3-3 0-1.657 1.343-3 3-3s3 1.343 3 3c0 1.657-1.343 3-3 3zm9-9c0 1.657-1.343 3-3 3s-3-1.343-3-3c0-1.657 1.343-3 3-3s3 1.343 3 3zm-18 0c0 1.657 1.343 3 3 3s3-1.343 3-3c0-1.657-1.343-3-3-3s-3 1.343-3 3z"/></svg></a>`;
        });
        if (blueskyAccounts.length > 0) {
          socialDetails += `<div class="social-detail"><strong>Bluesky:</strong> <span class="social-count">${blueskyAccounts.length} account${blueskyAccounts.length > 1 ? 's' : ''}</span></div>`;
        }
      }
      // Twitch
      if (channel.socials.twitch && Array.isArray(channel.socials.twitch)) {
        let twitchAccounts = channel.socials.twitch.filter(tw => tw.visible && tw.url);
        twitchAccounts.forEach(tw => {
          socialIcons += `<a href="${tw.url}" target="_blank" title="Twitch" class="me-3"><svg width="28" height="28" fill="#9146ff" viewBox="0 0 24 24"><path d="M2.089 0L.525 4.175v16.694h5.736V24h3.132l3.127-3.132h4.695l6.26-6.258V0H2.089zm2.086 2.085H21.39v11.479l-3.652 3.652H12l-3.127 3.132v-3.132H4.175V2.085z"/><path d="M9.915 12.522h2.086V6.26H9.915v6.262zm5.736 0h2.086V6.26h-2.086v6.262z"/></svg></a>`;
        });
        if (twitchAccounts.length > 0) {
          socialDetails += `<div class="social-detail"><strong>Twitch:</strong> <span class="social-count">${twitchAccounts.length} account${twitchAccounts.length > 1 ? 's' : ''}</span></div>`;
        }
      }
      // SoundCloud
      if (channel.socials.soundcloud && Array.isArray(channel.socials.soundcloud)) {
        channel.socials.soundcloud.forEach(bs => {
          if (bs.visible && bs.url) {
            socialIcons += `<a href="${bs.url}" target="_blank" title="SoundCloud" class="me-3"><svg width="28" height="28" fill="#ff5500" viewBox="0 0 24 24"><path d="M1.175 12.225c-.051 0-.094.046-.101.105l-.233 2.154.233 2.105c.007.059.05.105.101.105.053 0 .094-.046.101-.105l.255-2.105-.255-2.154c-.007-.059-.048-.105-.101-.105zm1.336.054c-.078 0-.14.068-.151.158l-.18 2.072.18 2.053c.011.09.073.158.151.158.078 0 .14-.068.151-.158l.201-2.053-.201-2.072c-.011-.09-.073-.158-.151-.158zm1.317.081c-.104 0-.191.094-.204.215l-.159 1.937.159 1.918c.013.121.1.215.204.215.106 0 .191-.094.204-.215l.18-1.918-.18-1.937c-.013-.121-.098-.215-.204-.215zm1.308.095c-.131 0-.24.117-.256.269l-.139 1.823.139 1.806c.016.152.125.269.256.269.133 0 .24-.117.256-.269l.158-1.806-.158-1.823c-.016-.152-.123-.269-.256-.269zm1.292.12c-.159 0-.291.14-.312.322l-.118 1.706.118 1.689c.021.182.153.322.312.322.161 0 .293-.14.312-.322l.139-1.689-.139-1.706c-.019-.182-.151-.322-.312-.322zm1.291.144c-.186 0-.34.163-.363.374l-.099 1.562.099 1.543c.023.211.177.374.363.374.188 0 .34-.163.363-.374l.118-1.543-.118-1.562c-.023-.211-.175-.374-.363-.374zm1.274.17c-.214 0-.393.186-.42.43l-.078 1.392.078 1.373c.027.244.206.43.42.43.216 0 .393-.186.42-.43l.099-1.373-.099-1.392c-.027-.244-.204-.43-.42-.43zm1.259.2c-.243 0-.444.209-.475.482l-.058 1.192.058 1.175c.031.273.232.482.475.482.245 0 .444-.209.475-.482l.078-1.175-.078-1.192c-.031-.273-.23-.482-.475-.482zm1.243.23c-.271 0-.495.232-.529.535l-.039.992.039.974c.034.303.258.535.529.535.273 0 .495-.232.529-.535l.058-.974-.058-.992c-.034-.303-.256-.535-.529-.535zm1.224.26c-.299 0-.548.255-.585.588l-.019.792.019.775c.037.333.286.588.585.588.301 0 .548-.255.585-.588l.039-.775-.039-.792c-.037-.333-.284-.588-.585-.588zm1.203.29c-.327 0-.599.278-.64.642l.001.592-.001.575c.041.364.313.642.64.642.329 0 .599-.278.64-.642l.019-.575-.019-.592c-.041-.364-.311-.642-.64-.642zm1.183.32c-.355 0-.651.301-.695.695v.392c.044.394.34.695.695.695.357 0 .651-.301.695-.695v-.392c-.044-.394-.338-.695-.695-.695zm1.162.35c-.383 0-.702.324-.75.75v.192c.048.426.367.75.75.75.385 0 .702-.324.75-.75v-.192c-.048-.426-.365-.75-.75-.75z"/></svg></a>`;
          }
        });
      }
    }

    col.innerHTML = `
      <div class="flip-card">
        <div class="flip-card-inner">
          <!-- Front of card -->
          <div class="flip-card-front">
            <div class="card h-100 shadow-lg border-0 position-relative">
              <div class="position-relative">
                ${hasVideoData ? 
                  `<a href="https://youtube.com/watch?v=${channel.videoId}" target="_blank" onclick="event.stopPropagation();">
                    <img src="${channel.thumbnail}" class="card-img-top" alt="${channel.channel}" style="border-top-left-radius: 1rem; border-top-right-radius: 1rem; object-fit: cover; height: 220px; background: #23272a;">
                  </a>` :
                  `<img src="${finalImageSrc}" class="card-img-top" alt="${channel.channel}" style="border-top-left-radius: 1rem; border-top-right-radius: 1rem; object-fit: cover; height: 220px; background: #23272a;">`
                }
                <!-- Status Label -->
                <div class="status-label ${channel.FullyForked ? 'fully-forked' : 'branching-out'}">
                  ${channel.FullyForked ? 'Fully Forked' : 'Branching Out'}
                </div>
              </div>
              <div class="card-body d-flex flex-column justify-content-between">
                <div class="d-flex flex-column align-items-center mb-2 mt-2">
                  <span style="color: #b0b3b8; font-size: 1.05em;">${channel.channel}</span>
                  ${channel.nicknames && channel.nicknames.length > 0 ? 
                    `<small style="color: #888; font-size: 0.8em; margin-top: 2px;">"${channel.nicknames[0]}"</small>` : ''
                  }
                </div>
                ${hasVideoData ? 
                  `<div class="mb-2">
                    <span style="font-size:0.95em; color:#aaa;">${channel.title || ''}</span>
                  </div>` :
                  ``
                }
                <div class="social-icons mb-2">
                  ${socialIcons}
                </div>
                ${hasVideoData ? 
                  `<a href="https://youtube.com/watch?v=${channel.videoId}" target="_blank" class="btn btn-primary w-100 mt-auto" onclick="event.stopPropagation();">Watch Latest Video</a>` :
                  `<div class="mt-auto"></div>`
                }
              </div>
              <!-- Flip Icon -->
              <div class="flip-icon" onclick="event.stopPropagation(); this.closest('.flip-card').classList.toggle('flipped');" title="View more info">
                <svg width="18" height="18" fill="#8f94fb" viewBox="0 0 24 24">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- Back of card -->
          <div class="flip-card-back">
            <div class="card card-back h-100 shadow-lg position-relative">
              <div class="card-body d-flex flex-column position-relative">
                <h5 class="card-title text-center mb-3" style="color: #8f94fb;">${channel.channel}</h5>
                
                <div class="card-pages flex-grow-1">
                  <!-- Page 1: Basic Info -->
                  <div class="card-page active">
                    <div class="mb-3">
                      <h6 style="color: #b0b3b8;">Status:</h6>
                      <span class="badge ${channel.FullyForked ? 'bg-success' : 'bg-info'}">${channel.FullyForked ? 'Fully Forked' : 'Branching Out'}</span>
                    </div>
                    ${socialDetails ? `
                      <div class="mb-3">
                        <h6 style="color: #b0b3b8;">Social Media:</h6>
                        ${socialDetails}
                      </div>
                    ` : ''}
                  </div>
                  
                  ${channel.notes ? `
                    <!-- Page 2: Notes -->
                    <div class="card-page">
                      <div class="mb-3">
                        <h6 style="color: #b0b3b8;">Notes:</h6>
                        <div class="social-detail">
                          <small style="color: #ddd; line-height: 1.4;">${channel.notes}</small>
                        </div>
                      </div>
                    </div>
                  ` : ''}
                </div>
                
                <!-- Pagination dots -->
                <div class="card-pagination">
                  <div class="page-dot active" onclick="showPage(event, 0)"></div>
                  ${channel.notes ? '<div class="page-dot" onclick="showPage(event, 1)"></div>' : ''}
                </div>
              </div>
              <!-- Flip Icon for back -->
              <div class="flip-icon" onclick="event.stopPropagation(); this.closest('.flip-card').classList.toggle('flipped');" title="Flip back to front">
                <svg width="18" height="18" fill="#8f94fb" viewBox="0 0 24 24">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return col;
}

// Function to handle page navigation in flip cards
function showPage(event, pageIndex) {
  event.stopPropagation(); // Prevent card flip
  
  const cardBack = event.target.closest('.flip-card-back');
  const pages = cardBack.querySelectorAll('.card-page');
  const dots = cardBack.querySelectorAll('.page-dot');
  
  // Hide all pages and deactivate all dots
  pages.forEach(page => page.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));
  
  // Show selected page and activate corresponding dot
  if (pages[pageIndex]) {
    pages[pageIndex].classList.add('active');
  }
  if (dots[pageIndex]) {
    dots[pageIndex].classList.add('active');
  }
}

// Function to populate a grid with creators
function populateGrid(gridElement, creators, showNoResultsMessage = true) {
  gridElement.innerHTML = "";
  if (creators.length === 0 && showNoResultsMessage) {
    gridElement.innerHTML = '<div class="text-center text-info w-100 py-5">No creators found.</div>';
  } else {
    creators.forEach(creator => {
      const col = createCreatorCard(creator);
      gridElement.appendChild(col);
    });
  }
  gridElement.style.display = "";
}

// Global variables for search functionality
let allCreatorsData = [];
let originalAllCreators = [];
let currentFilter = 'all';

// Fetch creators and populate both tabs
fetch("/api/creators")
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(allCreators => {
    // Store all creators data globally for search
    allCreatorsData = allCreators;
    
    // Combine all creators and shuffle
    const allCreatorsShuffled = [...allCreators].sort(() => Math.random() - 0.5);
    originalAllCreators = [...allCreatorsShuffled];
    
    // Populate single grid with all creators
    if (allCreatorsGrid) {
      populateGrid(allCreatorsGrid, allCreatorsShuffled);
    }
    
    // Initialize search functionality after data is loaded
    initializeSearch();
  })
  .catch(err => {
    console.error("Failed to load creators", err);
    if (allCreatorsGrid) {
      allCreatorsGrid.style.display = "";
      allCreatorsGrid.innerHTML = '<div class="text-center text-danger w-100 py-5">Failed to load creators.</div>';
    }
  });

// Search functionality
function initializeSearch() {
  const searchInput = document.getElementById('creatorSearch');
  const searchResults = document.getElementById('searchResults');
  const statusFilter = document.getElementById('statusFilter');
  
  if (!searchInput || !searchResults || !statusFilter) {
    // Search elements not loaded yet, try again after a short delay
    setTimeout(initializeSearch, 100);
    return;
  }
  
  let searchTimeout;
  
  // Handle search input
  searchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      hideSearchResults();
      applyFilters();
      return;
    }
    
    if (query.length < 2) {
      hideSearchResults();
      return;
    }
    
    // Debounce search
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 200);
  });
  
  // Hide search results when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container')) {
      hideSearchResults();
    }
  });
  
  // Handle escape key
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      hideSearchResults();
      applyFilters();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = searchResults.querySelector('.search-result-item');
      if (firstResult) {
        firstResult.click();
      }
    }
  });
  
  // Handle filter change
  statusFilter.addEventListener('change', function(e) {
    currentFilter = e.target.value;
    const query = searchInput.value.trim();
    
    if (query.length >= 2) {
      // Re-perform search with new filter
      performSearch(query);
    } else {
      // Just apply filter without search
      applyFilters();
    }
  });
}

function performSearch(query) {
  const searchResults = document.getElementById('searchResults');
  const searchQuery = query.toLowerCase().trim();
  
  // Search through all creators
  let matchingCreators = allCreatorsData.filter(creator => {
    if (!creator) return false;
    
    // Search in channel name (the server sends 'channel' field, not 'name')
    let nameMatch = false;
    if (creator.channel && typeof creator.channel === 'string') {
      nameMatch = creator.channel.toLowerCase().includes(searchQuery);
    }
    
    // Search in nicknames with better null checking
    let nicknameMatch = false;
    if (creator.nicknames && Array.isArray(creator.nicknames)) {
      nicknameMatch = creator.nicknames.some(nickname => {
        if (nickname && typeof nickname === 'string') {
          return nickname.toLowerCase().includes(searchQuery);
        }
        return false;
      });
    }
    
    return nameMatch || nicknameMatch;
  });
  
  // Apply status filter to search results
  matchingCreators = applyStatusFilter(matchingCreators);
  
  // Show search results dropdown
  displaySearchResults(matchingCreators, query);
  
  // Filter the main grids
  filterMainGrids(matchingCreators);
}

function displaySearchResults(creators, query) {
  const searchResults = document.getElementById('searchResults');
  
  if (creators.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">No creators found</div>';
  } else {
    const resultsHTML = creators.slice(0, 8).map((creator, index) => {
      const defaultImage = 'images/default-creator.png';
      const imageSrc = (creator.image && creator.image.trim() !== '') ? creator.image : defaultImage;
      const nickname = (creator.nicknames && creator.nicknames.length > 0) ? creator.nicknames[0] : '';
      const creatorName = creator.channel || creator.name || 'Unknown Creator';
      
      return `
        <div class="search-result-item" onclick="selectCreator(${index})">
          <img src="${imageSrc}" alt="${creatorName}" class="search-result-avatar" onerror="this.src='images/default-creator.png'">
          <div class="search-result-info">
            <p class="search-result-name">${creatorName}</p>
            ${nickname ? `<p class="search-result-nickname">"${nickname}"</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    searchResults.innerHTML = resultsHTML;
    
    // Store current search results for selection
    window.currentSearchResults = creators.slice(0, 8);
  }
  
  searchResults.style.display = 'block';
}

function hideSearchResults() {
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.style.display = 'none';
  }
}

function selectCreator(index) {
  const searchInput = document.getElementById('creatorSearch');
  
  if (window.currentSearchResults && window.currentSearchResults[index]) {
    const selectedCreator = window.currentSearchResults[index];
    searchInput.value = selectedCreator.channel || selectedCreator.name || '';
    hideSearchResults();
    
    // Filter to show only this creator
    filterMainGrids([selectedCreator]);
  }
}

function filterMainGrids(filteredCreators) {
  // Update single grid with filtered creators
  if (allCreatorsGrid) {
    populateGrid(allCreatorsGrid, filteredCreators, false);
  }
}

function applyStatusFilter(creators) {
  if (currentFilter === 'all') {
    return creators;
  } else if (currentFilter === 'fully-forked') {
    return creators.filter(c => c.FullyForked === true || c.isAd);
  } else if (currentFilter === 'branching-out') {
    return creators.filter(c => c.FullyForked === false && !c.isAd);
  }
  return creators;
}

function applyFilters() {
  // Apply current filter to original data
  const filteredCreators = applyStatusFilter(originalAllCreators);
  
  if (allCreatorsGrid) {
    populateGrid(allCreatorsGrid, filteredCreators);
  }
}

function resetToOriginalResults() {
  // Reset to original shuffled results with current filter applied
  currentFilter = 'all';
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.value = 'all';
  }
  applyFilters();
}
