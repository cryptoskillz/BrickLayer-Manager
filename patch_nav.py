import os

html_files = [f for f in os.listdir('public') if f.endswith('.html') and f != 'login.html']

for file in html_files:
    filepath = os.path.join('public', file)
    with open(filepath, 'r') as f:
        content = f.read()

    # Add permissions getter if not exists
    if 'get permissions()' not in content and file != 'reset-password.html':
        content = content.replace(
            'async init() {',
            '''get permissions() {
                const token = localStorage.getItem('bricklayer_token');
                if (!token) return { role: 'viewer', can_finance: false, can_add_transactions: false, can_settings: false };
                try { return JSON.parse(atob(token.split('.')[1])); } catch(e) { return {}; }
            },
            async init() {'''
        )

    # Patch navbar links
    content = content.replace(
        '<a href="/finance.html" class="text-sm',
        '<a x-show="permissions.role === \'admin\' || permissions.can_finance" href="/finance.html" class="text-sm'
    )
    content = content.replace(
        '<a href="/users.html" class="text-sm',
        '<a x-show="permissions.role === \'admin\'" href="/users.html" class="text-sm'
    )
    content = content.replace(
        '<a href="/settings.html" class="text-sm',
        '<a x-show="permissions.role === \'admin\' || permissions.can_settings" href="/settings.html" class="text-sm'
    )

    with open(filepath, 'w') as f:
        f.write(content)
