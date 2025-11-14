// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const alertContainer = document.getElementById('alert-container');

    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password'),
            rememberMe: formData.get('rememberMe') === 'on'
        };

        try {
            showAlert('Signing you in...', 'info');
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                showAlert('Login successful! Redirecting...', 'success');
                
                // Store authentication token if provided
                if (result.token) {
                    localStorage.setItem('authToken', result.token);
                }
                
                // Redirect to dashboard or intended page
                setTimeout(() => {
                    window.location.href = result.redirect || 'index.html';
                }, 1500);
            } else {
                showAlert(result.message || 'Login failed. Please check your credentials.', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('An error occurred during login. Please try again.', 'danger');
        }
    });

    // Handle forgot password form submission
    forgotPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(forgotPasswordForm);
        const resetData = {
            email: formData.get('resetEmail')
        };

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(resetData)
            });

            const result = await response.json();

            if (response.ok) {
                showAlert('Password reset link sent to your email!', 'success');
                // Close modal after short delay
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                    modal.hide();
                    forgotPasswordForm.reset();
                }, 2000);
            } else {
                showAlert(result.message || 'Failed to send reset email. Please try again.', 'danger');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            showAlert('An error occurred. Please try again.', 'danger');
        }
    });

    // Show alert function
    function showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHtml;

        // Auto-dismiss info and success alerts after 5 seconds
        if (type === 'info' || type === 'success') {
            setTimeout(() => {
                const alert = alertContainer.querySelector('.alert');
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, 5000);
        }
    }

    // Check if user is already logged in
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Verify token with server
        fetch('/api/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.valid) {
                // User is already logged in, redirect to dashboard
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            // Token verification failed, remove invalid token
            localStorage.removeItem('authToken');
        });
    }
});

// Show forgot password modal
function showForgotPassword() {
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
}

// Form input focus effects
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.borderColor = '#8f94fb';
            this.style.boxShadow = '0 0 0 0.2rem rgba(143, 148, 251, 0.25)';
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    });
});