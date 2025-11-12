// Handle creator suggestions form
document.addEventListener('modalsLoaded', function() {
  const suggestionsForm = document.getElementById('suggestionsForm');
  const submitButton = document.getElementById('submitSuggestion');
  const spinner = document.getElementById('submitSpinner');
  const submitIcon = document.getElementById('submitIcon');
  const successAlert = document.getElementById('suggestionSuccess');
  const errorAlert = document.getElementById('suggestionError');
  const successMessage = document.getElementById('suggestionSuccessMessage');
  const errorMessage = document.getElementById('suggestionErrorMessage');

  if (suggestionsForm) {
    // Add form validation and enhanced UX
    const inputs = suggestionsForm.querySelectorAll('.suggestion-input');
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
      });
      
      input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
      });
    });

    suggestionsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Enhanced loading state
      submitButton.disabled = true;
      spinner.classList.remove('d-none');
      if (submitIcon) submitIcon.classList.add('d-none');
      submitButton.style.pointerEvents = 'none';
      
      // Hide previous alerts with animation
      successAlert.classList.add('d-none');
      errorAlert.classList.add('d-none');

      try {
        // Get form data
        const formData = new FormData(suggestionsForm);
        const data = Object.fromEntries(formData.entries());

        // Validate required fields
        if (!data.name?.trim()) {
          throw new Error('Creator name is required');
        }

        // Submit to API
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
          // Success with enhanced animation
          successMessage.textContent = result.message || 'Suggestion submitted successfully!';
          successAlert.classList.remove('d-none');
          
          // Add success animation
          successAlert.style.animation = 'slideInUp 0.5s ease-out';
          
          // Reset form with delay
          setTimeout(() => {
            suggestionsForm.reset();
          }, 500);
          
          // Auto-close modal after 3 seconds with fade effect
          setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('suggestionsModal'));
            if (modal) {
              modal.hide();
            }
          }, 3000);
          
        } else {
          // Server error
          throw new Error(result.error || 'Failed to submit suggestion');
        }

      } catch (error) {
        console.error('Suggestion submission error:', error);
        errorMessage.textContent = error.message || 'Failed to submit suggestion. Please try again.';
        errorAlert.classList.remove('d-none');
        
        // Add error animation
        errorAlert.style.animation = 'shake 0.5s ease-out';
        
        // Shake the form slightly
        suggestionsForm.style.animation = 'shake 0.3s ease-out';
        setTimeout(() => {
          suggestionsForm.style.animation = '';
        }, 300);
        
      } finally {
        // Reset loading state with delay for better UX
        setTimeout(() => {
          submitButton.disabled = false;
          spinner.classList.add('d-none');
          if (submitIcon) submitIcon.classList.remove('d-none');
          submitButton.style.pointerEvents = 'auto';
        }, 500);
      }
    });

    // Reset animations when modal is hidden
    const modal = document.getElementById('suggestionsModal');
    if (modal) {
      modal.addEventListener('hidden.bs.modal', function() {
        successAlert.style.animation = '';
        errorAlert.style.animation = '';
        suggestionsForm.style.animation = '';
        suggestionsForm.reset();
        successAlert.classList.add('d-none');
        errorAlert.classList.add('d-none');
      });
    }
  }

  // Add CSS animations via JavaScript since they're not in the main CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
});