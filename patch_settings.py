import re

with open('public/settings.html', 'r') as f:
    content = f.read()

# Replace the single form start with two forms
content = content.replace(
    '<form @submit.prevent="saveSettings" class="p-6 space-y-6">',
    '''<div class="mb-4"><h3 class="text-lg font-medium text-gray-900 mb-2">Account Login</h3></div>
    <form @submit.prevent="saveAuthSettings" class="p-6 space-y-6 border-b border-gray-200">'''
)

# Insert the first submit button and close the form, start second form
# Look for <hr class="border-gray-200"> before Localization Settings
content = content.replace(
    '''<p class="mt-2 text-sm text-gray-500" id="password-description">Changing your password will update your login token and log you out elsewhere.</p>

                <hr class="border-gray-200">

                <div>
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Localization Settings</h3>''',
    '''<p class="mt-2 text-sm text-gray-500" id="password-description">Changing your password will update your login token and log you out elsewhere.</p>
                <div class="pt-4 flex justify-end">
                    <button type="submit" :disabled="loadingAuth" 
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <svg x-show="loadingAuth" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Save Account Settings
                    </button>
                </div>
            </form>

            <form @submit.prevent="saveGeneralSettings" class="p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Localization Settings</h3>'''
)

# Update loading state references for the second form
content = content.replace(
    '''<button type="submit" :disabled="loading" 
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <svg x-show="loading" ''',
    '''<button type="submit" :disabled="loadingGeneral" 
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        <svg x-show="loadingGeneral" '''
)

content = content.replace(
    'Save Settings',
    'Save General Settings',
    1 # Only replace the first occurrence (which is the button text)
)

# JS Updates
js_old = '''loading: false,
            error: null,
            success: null,'''
js_new = '''loadingAuth: false,
            loadingGeneral: false,
            error: null,
            success: null,'''
content = content.replace(js_old, js_new)


# replace the saveSettings method
method_old = """            async saveSettings() {
                if (this.password && this.password !== this.confirmPassword) {
                    this.error = "New passwords do not match.";
                    return;
                }
                
                this.loading = true;
                this.error = null;
                this.success = null;
                
                const token = localStorage.getItem('bricklayer_token');
                
                try {
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            email: this.email,
                            currentPassword: this.currentPassword,
                            password: this.password ? this.password : undefined,
                            githubClientId: this.githubClientId,
                            githubClientSecret: this.githubClientSecret,
                            currency: this.currency
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        this.success = 'Settings saved successfully!';
                        this.currentPassword = '';
                        this.password = ''; 
                        this.confirmPassword = '';
                        
                        // If token changed (because password changed), update local storage
                        if (data.token) {
                            localStorage.setItem('bricklayer_token', data.token);
                        }
                    } else {
                        this.error = data.error || 'Failed to save settings.';
                    }
                } catch (err) {
                    this.error = 'Network error. Could not connect to API.';
                } finally {
                    this.loading = false;
                }
            },"""

method_new = """            async saveAuthSettings() {
                if (this.password && this.password !== this.confirmPassword) {
                    this.error = "New passwords do not match.";
                    return;
                }
                if (!this.currentPassword && (this.email || this.password)) {
                    this.error = "Current password is required to change email or password.";
                    return;
                }
                
                this.loadingAuth = true;
                this.error = null;
                this.success = null;
                
                const token = localStorage.getItem('bricklayer_token');
                
                try {
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            email: this.email,
                            currentPassword: this.currentPassword,
                            password: this.password ? this.password : undefined
                        })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        this.success = 'Account settings saved successfully!';
                        this.currentPassword = '';
                        this.password = ''; 
                        this.confirmPassword = '';
                        if (data.token) localStorage.setItem('bricklayer_token', data.token);
                    } else {
                        this.error = data.error || 'Failed to save account settings.';
                    }
                } catch (err) {
                    this.error = 'Network error.';
                } finally {
                    this.loadingAuth = false;
                }
            },

            async saveGeneralSettings() {
                this.loadingGeneral = true;
                this.error = null;
                this.success = null;
                
                const token = localStorage.getItem('bricklayer_token');
                
                try {
                    const response = await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            githubClientId: this.githubClientId,
                            githubClientSecret: this.githubClientSecret,
                            currency: this.currency
                        })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        this.success = 'General settings saved successfully!';
                    } else {
                        this.error = data.error || 'Failed to save general settings.';
                    }
                } catch (err) {
                    this.error = 'Network error.';
                } finally {
                    this.loadingGeneral = false;
                }
            },"""

content = content.replace(method_old, method_new)

# make the current password input no longer 'required' since we don't need it for general settings
content = content.replace(
    'x-model="currentPassword" required placeholder',
    'x-model="currentPassword" placeholder'
)
content = content.replace(
    '<label for="currentPassword" class="block text-sm font-medium text-gray-700">Current Password (Required)</label>',
    '<label for="currentPassword" class="block text-sm font-medium text-gray-700">Current Password (Required to change email or password)</label>'
)

with open('public/settings.html', 'w') as f:
    f.write(content)
