// Shared modal logic
// Assumes Bootstrap 5 is loaded

document.addEventListener('modalsLoaded', function () {
  const feedbackForm = document.getElementById('feedbackForm');
  const submitButton = document.getElementById('submitFeedback');
  const spinner = document.getElementById('feedbackSubmitSpinner');
  const successAlert = document.getElementById('feedbackSuccess');
  const errorAlert = document.getElementById('feedbackError');
  const successMessage = document.getElementById('feedbackSuccessMessage');
  const errorMessage = document.getElementById('feedbackErrorMessage');
  const feedbackModal = document.getElementById('feedbackModal');

  if (!feedbackForm || !submitButton || !spinner || !successAlert || !errorAlert) {
    return;
  }

  feedbackForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    successAlert.classList.add('d-none');
    errorAlert.classList.add('d-none');

    const formData = new FormData(feedbackForm);
    const payload = {
      name: (formData.get('name') || '').toString().trim(),
      email: (formData.get('email') || '').toString().trim(),
      type: (formData.get('type') || 'other').toString().trim(),
      message: (formData.get('message') || '').toString().trim()
    };

    if (!payload.message) {
      errorMessage.textContent = 'Please add your feedback message.';
      errorAlert.classList.remove('d-none');
      return;
    }

    submitButton.disabled = true;
    spinner.classList.remove('d-none');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      successMessage.textContent = result.message || 'Thanks! Your feedback was submitted.';
      successAlert.classList.remove('d-none');
      feedbackForm.reset();

      setTimeout(() => {
        const modalInstance = bootstrap.Modal.getInstance(feedbackModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }, 2000);
    } catch (error) {
      console.error('Feedback submission error:', error);
      errorMessage.textContent = error.message || 'Unable to submit feedback right now.';
      errorAlert.classList.remove('d-none');
    } finally {
      submitButton.disabled = false;
      spinner.classList.add('d-none');
    }
  });

  if (feedbackModal) {
    feedbackModal.addEventListener('hidden.bs.modal', function () {
      feedbackForm.reset();
      successAlert.classList.add('d-none');
      errorAlert.classList.add('d-none');
    });
  }
});
