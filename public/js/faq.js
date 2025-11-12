// FAQ Loading functionality
let faqDataLoaded = false;

function initializeFAQ() {
  console.log('initializeFAQ called');
  const faqModal = document.getElementById('faqModal');
  if (faqModal) {
    console.log('FAQ modal found, adding event listener');
    faqModal.addEventListener('show.bs.modal', function() {
      console.log('FAQ modal show event triggered, faqDataLoaded:', faqDataLoaded);
      if (!faqDataLoaded) {
        loadFAQData();
        faqDataLoaded = true;
      }
    });
  } else {
    console.error('FAQ modal not found');
  }
}

function loadFAQData() {
  console.log('loadFAQData called');
  const faqAccordion = document.getElementById('faqAccordion');
  const faqLoading = document.getElementById('faqLoading');
  
  console.log('FAQ elements found:', { faqAccordion: !!faqAccordion, faqLoading: !!faqLoading });
  
  if (!faqAccordion || !faqLoading) {
    console.error('FAQ elements not found');
    return;
  }
  
  console.log('Fetching FAQ data from /api/faq');
  fetch('/api/faq')
    .then(response => {
      console.log('FAQ API response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(faqData => {
      console.log('FAQ data received:', faqData);
      
      // Hide loading spinner
      faqLoading.style.display = 'none';
      
      // Generate FAQ accordion items
      const faqHTML = faqData.map((faq, index) => {
        const isExpanded = faq.expanded ? 'show' : '';
        const buttonExpanded = faq.expanded ? 'true' : 'false';
        const buttonCollapsed = faq.expanded ? '' : 'collapsed';
        
        return `
          <div class="accordion-item bg-dark text-light border-secondary">
            <h2 class="accordion-header" id="${faq.id}-heading">
              <button class="accordion-button ${buttonCollapsed} bg-dark text-info fw-bold shadow-sm" 
                      type="button" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#${faq.id}" 
                      aria-expanded="${buttonExpanded}" 
                      aria-controls="${faq.id}" 
                      style="border-bottom:1px solid #444; font-size:1.15rem; letter-spacing:0.5px;">
                ${faq.question}
              </button>
            </h2>
            <div id="${faq.id}" 
                 class="accordion-collapse collapse ${isExpanded}" 
                 aria-labelledby="${faq.id}-heading" 
                 data-bs-parent="#faqAccordion">
              <div class="accordion-body bg-dark text-white" 
                   style="border-top:1px solid #444; font-size:1rem;">
                ${faq.answer}
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      console.log('Generated FAQ HTML, inserting into DOM');
      // Add the FAQ items after the loading div
      faqLoading.insertAdjacentHTML('afterend', faqHTML);
      console.log('FAQ items added to DOM');
    })
    .catch(error => {
      console.error('Error loading FAQ data:', error);
      faqLoading.innerHTML = `
        <div class="text-center py-4 text-danger">
          <p>Error loading FAQ. Please try again later.</p>
          <small>Error: ${error.message}</small>
        </div>
      `;
    });
}

// Initialize when modals are loaded
document.addEventListener('modalsLoaded', function() {
  console.log('modalsLoaded event received');
  initializeFAQ();
});