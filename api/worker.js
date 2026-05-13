import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';

const app = new Hono();

// Helper to get a setting in D1
const getSetting = async (env, key, defaultValue = null) => {
  const result = await env.BRICKLAYER_DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first('value');
  return result !== null ? result : defaultValue;
};

// Helper to set a setting in D1
const setSetting = async (env, key, value) => {
  await env.BRICKLAYER_DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind(key, value).run();
};

// Helper to send email via Cloudflare Email Routing
const sendEmail = async (env, to, subject, text) => {
  if (!env.EMAIL_SENDER) {
    console.warn("Email sender binding missing! Skipping email send.");
    return false;
  }
  
  try {
    // Dynamically import to prevent local dev crashes in miniflare
    const { EmailMessage } = await import('cloudflare:email');
    
    const senderEmail = await getSetting(env, 'SYSTEM:SENDER_EMAIL', 'noreply@basebrick.com');
    const msg = new EmailMessage(
      senderEmail,
      to,
      `Subject: ${subject}\n\n${text}`
    );
    await env.EMAIL_SENDER.send(msg);
    return true;
  } catch (e) {
    console.warn("Email sending skipped or failed (if local, this is expected):", e.message);
    return false;
  }
};

// Helper to get or generate a token on first install
const getOrGenerateToken = async (env) => {
  let token = await getSetting(env, 'SYSTEM:TRANSFER_TOKEN');
  if (!token) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    token = 'bl_';
    for (let i = 0; i < 24; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    await setSetting(env, 'SYSTEM:TRANSFER_TOKEN', token);
  }
  return token;
};

// Helper to get JWT secret
const getJwtSecret = async (env) => {
  let secret = await getSetting(env, 'SYSTEM:JWT_SECRET');
  if (!secret) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    secret = Array.from({length: 32}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    await setSetting(env, 'SYSTEM:JWT_SECRET', secret);
  }
  return secret;
};

// Basic Middleware for Authentication
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  // Check if it's the transfer token (for CLI)
  const activeToken = await getOrGenerateToken(c.env);
  if (token === activeToken) {
    c.set('user', { role: 'cli' });
    return next();
  }
  
  // Check if it's a valid JWT
  try {
    const secret = await getJwtSecret(c.env);
    const decodedPayload = await verify(token, secret, "HS256");
    c.set('user', decodedPayload);
    return next();
  } catch (e) {
    // Fallback for legacy admin password login
    const adminPassword = await getSetting(c.env, 'SYSTEM:ADMIN_PASSWORD', c.env.ADMIN_PASSWORD);
    if (token === adminPassword) {
       const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);
       c.set('user', { email: adminEmail, role: 'admin' });
       return next();
    }
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  
  const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);
  const adminPassword = await getSetting(c.env, 'SYSTEM:ADMIN_PASSWORD', c.env.ADMIN_PASSWORD);

  let userRole = null;
  let userEmail = null;

  if (email === adminEmail && password === adminPassword) {
    userRole = 'admin';
    userEmail = email;
  } else {
    // Check normal users
    const user = await c.env.BRICKLAYER_DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (user && user.password === password) { // Simple text match for now
      userRole = user.role;
      userEmail = user.email;
    }
  }

  if (userRole) {
    const secret = await getJwtSecret(c.env);
    const token = await sign({ email: userEmail, role: userRole, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, secret);
    return c.json({ token, role: userRole });
  }
  
  return c.json({ error: 'Invalid credentials' }, 401);
});

// Settings Endpoints
app.get('/api/settings', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);
  const githubClientId = await getSetting(c.env, 'SYSTEM:GITHUB_CLIENT_ID', '');
  const githubClientSecret = await getSetting(c.env, 'SYSTEM:GITHUB_CLIENT_SECRET', '');
  const currency = await getSetting(c.env, 'currency', 'USD');

  return c.json({ email: adminEmail, githubClientId, githubClientSecret, currency });
});

app.post('/api/settings', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (user && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    const { email, password, currentPassword, githubClientId, githubClientSecret, currency } = await c.req.json();
    
    // Validate current password
    const adminPassword = await getSetting(c.env, 'SYSTEM:ADMIN_PASSWORD', c.env.ADMIN_PASSWORD);
    if (currentPassword !== adminPassword) {
      return c.json({ error: 'Incorrect current password' }, 403);
    }

    if (email) await setSetting(c.env, 'SYSTEM:ADMIN_EMAIL', email);
    if (password) await setSetting(c.env, 'SYSTEM:ADMIN_PASSWORD', password);
    if (githubClientId !== undefined) await setSetting(c.env, 'SYSTEM:GITHUB_CLIENT_ID', githubClientId);
    if (githubClientSecret !== undefined) await setSetting(c.env, 'SYSTEM:GITHUB_CLIENT_SECRET', githubClientSecret);
    if (currency) await setSetting(c.env, 'currency', currency);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// GitHub Auth Endpoints
app.post('/api/auth/github', async (c) => {
  const clientId = await getSetting(c.env, 'SYSTEM:GITHUB_CLIENT_ID');
  if (!clientId) return c.json({ error: 'GitHub login not configured' }, 400);

  const redirectUri = new URL(c.req.url).origin + '/api/auth/github/callback';
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  
  return c.json({ url: githubUrl });
});

// Auth: GitHub callback endpoint
app.get('/api/auth/github/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ error: 'No code provided' }, 400);

  const clientId = await getSetting(c.env, 'SYSTEM:GITHUB_CLIENT_ID');
  const clientSecret = await getSetting(c.env, 'SYSTEM:GITHUB_CLIENT_SECRET');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) return c.json({ error: tokenData.error_description }, 400);

  const userRes = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'BricklayerManager' }
  });
  const userData = await userRes.json();
  const userEmail = userData.email;

  if (!userEmail) return c.json({ error: 'No public email found in GitHub profile' }, 400);

  const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);
  let userRole = 'viewer';

  if (userEmail === adminEmail) {
    userRole = 'admin';
  } else {
    const dbUser = await c.env.BRICKLAYER_DB.prepare('SELECT role FROM users WHERE email = ?').bind(userEmail).first('role');
    if (!dbUser) {
      return c.json({ error: 'User not authorized. Contact an administrator to add your email.' }, 403);
    }
    userRole = dbUser;
  }

  const secret = await getJwtSecret(c.env);
  const jwtToken = await sign({ email: userEmail, role: userRole, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, secret);

  const html = `
    <script>
      localStorage.setItem('bricklayer_token', '${jwtToken}');
      window.location.href = '/';
    </script>
  `;
  return c.html(html);
});

// Auth: Forgot Password
app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);
  
  // Verify user exists
  if (email !== adminEmail) {
    const dbUser = await c.env.BRICKLAYER_DB.prepare('SELECT email FROM users WHERE email = ?').bind(email).first('email');
    if (!dbUser) return c.json({ success: true }); // pretend it worked to prevent email enumeration
  }

  // Generate 32 char hex token
  const chars = '0123456789abcdef';
  const token = Array.from({length: 32}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  
  // Save token, expires in 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  await c.env.BRICKLAYER_DB.prepare('INSERT INTO reset_tokens (token, email, expires_at) VALUES (?, ?, ?)')
    .bind(token, email, expiresAt).run();

  // Send email
  const resetUrl = `${new URL(c.req.url).origin}/reset-password.html?token=${token}`;
  const text = `You have requested a password reset for Bricklayer Manager.\n\nPlease click the following link to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.`;
  await sendEmail(c.env, email, 'Bricklayer Manager - Password Reset', text);

  return c.json({ success: true });
});

// Auth: Reset Password
app.post('/api/auth/reset-password', async (c) => {
  const { token, password } = await c.req.json();
  const now = Math.floor(Date.now() / 1000);

  const resetRecord = await c.env.BRICKLAYER_DB.prepare('SELECT email FROM reset_tokens WHERE token = ? AND expires_at > ?')
    .bind(token, now).first();

  if (!resetRecord) return c.json({ error: 'Invalid or expired token' }, 400);

  const email = resetRecord.email;
  const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);

  if (email === adminEmail) {
    await setSetting(c.env, 'SYSTEM:ADMIN_PASSWORD', password);
  } else {
    await c.env.BRICKLAYER_DB.prepare('UPDATE users SET password = ? WHERE email = ?').bind(password, email).run();
  }

  // Delete token
  await c.env.BRICKLAYER_DB.prepare('DELETE FROM reset_tokens WHERE token = ?').bind(token).run();

  return c.json({ success: true });
});

// User Management Endpoints
app.get('/api/users', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  try {
    const users = await c.env.BRICKLAYER_DB.prepare('SELECT email, role, created_at FROM users').all();
    return c.json({ users: users.results });
  } catch (error) {
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Endpoint: Create or Update User
app.post('/api/users', authMiddleware, async (c) => {
  if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const { email, password, role } = await c.req.json();
  
  if (!email || !role) return c.json({ error: 'Email and role are required' }, 400);

  const adminEmail = await getSetting(c.env, 'SYSTEM:ADMIN_EMAIL', c.env.ADMIN_EMAIL);
  if (email === adminEmail) return c.json({ error: 'Cannot modify root admin' }, 400);

  const existingUser = await c.env.BRICKLAYER_DB.prepare('SELECT email FROM users WHERE email = ?').bind(email).first();

  await c.env.BRICKLAYER_DB.prepare(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET password = COALESCE(excluded.password, users.password), role = excluded.role'
  ).bind(email, password || null, role).run();

  // If new user and no password provided, trigger password setup email
  if (!existingUser && !password) {
    const chars = '0123456789abcdef';
    const token = Array.from({length: 32}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours
    
    await c.env.BRICKLAYER_DB.prepare('INSERT INTO reset_tokens (token, email, expires_at) VALUES (?, ?, ?)')
      .bind(token, email, expiresAt).run();

    const resetUrl = `${new URL(c.req.url).origin}/reset-password.html?token=${token}`;
    const text = `You have been invited to Bricklayer Manager.\n\nPlease click the following link to set your password and access your account:\n${resetUrl}\n\nThis link will expire in 24 hours.`;
    await sendEmail(c.env, email, 'Bricklayer Manager - You have been invited!', text);
  }

  return c.json({ success: true });
});

app.delete('/api/users/:email', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  try {
    const email = decodeURIComponent(c.req.param('email'));
    await c.env.BRICKLAYER_DB.prepare('DELETE FROM users WHERE email = ?').bind(email).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Endpoint for `bricklayer manage` CLI to push config
app.post('/api/sites', authMiddleware, async (c) => {
  try {
    const siteData = await c.req.json();
    const siteId = siteData.id || siteData.githubUrl || siteData.name || siteData.url || `site-${Date.now()}`;
    
    const existing = await c.env.BRICKLAYER_DB.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
    
    const name = siteData.name || (existing ? existing.name : '');
    const url = siteData.url || (existing ? existing.url : '');
    const description = siteData.description || (existing ? existing.description : '');
    const environment = siteData.environment || (existing ? existing.environment : '');
    const accountId = siteData.accountId || (existing ? existing.accountId : '');
    const githubUrl = siteData.githubUrl || (existing ? existing.githubUrl : '');
    const cmsUrl = siteData.cmsUrl || (existing ? existing.cmsUrl : '');
    const previewCmsUrl = siteData.previewCmsUrl || (existing ? existing.previewCmsUrl : '');
    const previewUrl = siteData.previewUrl || (existing ? existing.previewUrl : '');
    const vanityUrl = existing ? existing.vanityUrl : '';
    const vanityPreviewUrl = existing ? existing.vanityPreviewUrl : '';
    const vanityCmsUrl = existing ? existing.vanityCmsUrl : '';
    const vanityPreviewCmsUrl = existing ? existing.vanityPreviewCmsUrl : '';

    await c.env.BRICKLAYER_DB.prepare(`
      INSERT INTO sites (id, name, url, description, environment, accountId, githubUrl, cmsUrl, previewCmsUrl, previewUrl, vanityUrl, vanityPreviewUrl, vanityCmsUrl, vanityPreviewCmsUrl, lastUpdated) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name, 
        url = excluded.url, 
        description = excluded.description, 
        environment = excluded.environment, 
        accountId = excluded.accountId, 
        githubUrl = excluded.githubUrl,
        cmsUrl = excluded.cmsUrl,
        previewCmsUrl = excluded.previewCmsUrl,
        previewUrl = excluded.previewUrl,
        lastUpdated = CURRENT_TIMESTAMP
    `).bind(
      siteId, name, url, description, environment, accountId, githubUrl, cmsUrl, previewCmsUrl, previewUrl, vanityUrl, vanityPreviewUrl, vanityCmsUrl, vanityPreviewCmsUrl
    ).run();
    
    return c.json({ success: true, message: 'Site registered successfully', id: siteId });
  } catch (error) {
    return c.json({ error: 'Failed to register site' }, 500);
  }
});

app.put('/api/sites/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (user && user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

    const id = decodeURIComponent(c.req.param('id'));
    const updates = await c.req.json();
    
    const existing = await c.env.BRICKLAYER_DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();
    if (!existing) return c.json({ error: 'Site not found' }, 404);
    
    const url = updates.url !== undefined ? updates.url : existing.url;
    const previewUrl = updates.previewUrl !== undefined ? updates.previewUrl : existing.previewUrl;
    const cmsUrl = updates.cmsUrl !== undefined ? updates.cmsUrl : existing.cmsUrl;
    const previewCmsUrl = updates.previewCmsUrl !== undefined ? updates.previewCmsUrl : existing.previewCmsUrl;
    const vanityUrl = updates.vanityUrl !== undefined ? updates.vanityUrl : existing.vanityUrl;
    const vanityPreviewUrl = updates.vanityPreviewUrl !== undefined ? updates.vanityPreviewUrl : existing.vanityPreviewUrl;
    const vanityCmsUrl = updates.vanityCmsUrl !== undefined ? updates.vanityCmsUrl : existing.vanityCmsUrl;
    const vanityPreviewCmsUrl = updates.vanityPreviewCmsUrl !== undefined ? updates.vanityPreviewCmsUrl : existing.vanityPreviewCmsUrl;
    
    await c.env.BRICKLAYER_DB.prepare(`
      UPDATE sites SET 
        url = ?, 
        previewUrl = ?,
        cmsUrl = ?,
        previewCmsUrl = ?,
        vanityUrl = ?,
        vanityPreviewUrl = ?,
        vanityCmsUrl = ?,
        vanityPreviewCmsUrl = ?,
        lastUpdated = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      url, previewUrl, cmsUrl, previewCmsUrl, 
      vanityUrl, vanityPreviewUrl, vanityCmsUrl, vanityPreviewCmsUrl, 
      id
    ).run();
    
    const updatedSite = await c.env.BRICKLAYER_DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();
    return c.json({ success: true, site: updatedSite });
  } catch (error) {
    return c.json({ error: 'Failed to update site', details: error.message }, 500);
  }
});

// Endpoint to delete a site
app.delete('/api/sites/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user && user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

  try {
    const id = decodeURIComponent(c.req.param('id'));
    await c.env.BRICKLAYER_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete site' }, 500);
  }
});

// Endpoint for the Admin Dashboard to fetch all sites
app.get('/api/sites', authMiddleware, async (c) => {
  try {
    const result = await c.env.BRICKLAYER_DB.prepare('SELECT * FROM sites').all();
    return c.json({ sites: result.results });
  } catch (error) {
    return c.json({ error: 'Failed to fetch sites: ' + error.message, stack: error.stack }, 500);
  }
});

// Endpoint to get the current transfer token
app.get('/api/token', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user && user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

  const activeToken = await getOrGenerateToken(c.env);
  return c.json({ token: activeToken });
});

// Endpoint to rotate the transfer token
app.post('/api/token/rotate', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let newToken = 'bl_';
  for (let i = 0; i < 24; i++) newToken += chars.charAt(Math.floor(Math.random() * chars.length));
  
  await setSetting(c.env, 'SYSTEM:TRANSFER_TOKEN', newToken);
  return c.json({ token: newToken });
});

// Costings Endpoints
app.get('/api/sites/:id/costings', authMiddleware, async (c) => {
  try {
    const siteId = decodeURIComponent(c.req.param('id'));
    const result = await c.env.BRICKLAYER_DB.prepare('SELECT * FROM costings WHERE site_id = ? ORDER BY created_at DESC').bind(siteId).all();
    return c.json({ costings: result.results });
  } catch (error) {
    return c.json({ error: 'Failed to fetch costings' }, 500);
  }
});

app.post('/api/sites/:id/costings', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (user && user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);
    const siteId = decodeURIComponent(c.req.param('id'));
    const { description, amount, is_paid, frequency, created_at } = await c.req.json();
    
    if (!description || amount === undefined || !frequency) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (created_at) {
        await c.env.BRICKLAYER_DB.prepare(
          'INSERT INTO costings (site_id, description, amount, is_paid, frequency, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(siteId, description, amount, is_paid ? 1 : 0, frequency, created_at).run();
    } else {
        await c.env.BRICKLAYER_DB.prepare(
          'INSERT INTO costings (site_id, description, amount, is_paid, frequency) VALUES (?, ?, ?, ?, ?)'
        ).bind(siteId, description, amount, is_paid ? 1 : 0, frequency).run();
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to add costing' }, 500);
  }
});

app.put('/api/costings/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (user && user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);
    const id = c.req.param('id');
    const { description, amount, is_paid, frequency, created_at } = await c.req.json();

    if (created_at) {
        await c.env.BRICKLAYER_DB.prepare(
          'UPDATE costings SET description = ?, amount = ?, is_paid = ?, frequency = ?, created_at = ? WHERE id = ?'
        ).bind(description, amount, is_paid ? 1 : 0, frequency, created_at, id).run();
    } else {
        await c.env.BRICKLAYER_DB.prepare(
          'UPDATE costings SET description = ?, amount = ?, is_paid = ?, frequency = ? WHERE id = ?'
        ).bind(description, amount, is_paid ? 1 : 0, frequency, id).run();
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update costing' }, 500);
  }
});

app.delete('/api/costings/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (user && user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);
    const id = c.req.param('id');
    await c.env.BRICKLAYER_DB.prepare('DELETE FROM costings WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete costing' }, 500);
  }
});

app.get('/api/finance-report', authMiddleware, async (c) => {
  try {
    const result = await c.env.BRICKLAYER_DB.prepare(`
      SELECT c.id, c.description, c.amount, c.is_paid, c.frequency, c.created_at, s.name as site_name, s.id as site_id
      FROM costings c
      JOIN sites s ON c.site_id = s.id
      ORDER BY s.name ASC, c.created_at DESC
    `).all();
    
    const currency = await getSetting(c.env, 'currency', 'USD');
    return c.json({ report: result.results, currency });
  } catch (error) {
    return c.json({ error: 'Failed to fetch finance report' }, 500);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    const db = env.BRICKLAYER_DB;
    // Get all recurring items that act as active subscriptions
    const { results: recurrings } = await db.prepare("SELECT * FROM costings WHERE frequency IN ('monthly', 'yearly')").all();
    
    const now = new Date();
    
    for (const cost of recurrings) {
      if (!cost.created_at) continue;
      const createdDate = new Date(cost.created_at);
      
      let shouldDuplicate = false;
      let dateLabel = '';
      
      if (cost.frequency === 'monthly') {
        const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth());
        // If one month or more has passed since it was created/last billed
        if (monthsDiff >= 1) {
          shouldDuplicate = true;
          dateLabel = createdDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        }
      } else if (cost.frequency === 'yearly') {
        const yearsDiff = now.getFullYear() - createdDate.getFullYear();
        // If a full year or more has passed
        if (yearsDiff >= 1) {
          shouldDuplicate = true;
          dateLabel = createdDate.getFullYear().toString();
        }
      }
      
      if (shouldDuplicate) {
        // Archive the old row as a 'one time' invoice with a date suffix to prevent Run Rate inflation
        const oldDesc = `${cost.description} (${dateLabel})`;
        await db.prepare("UPDATE costings SET frequency = 'one time', description = ? WHERE id = ?").bind(oldDesc, cost.id).run();
        
        // Insert a new row to represent the current active period, resetting status to unpaid
        await db.prepare(
          'INSERT INTO costings (site_id, description, amount, is_paid, frequency) VALUES (?, ?, ?, ?, ?)'
        ).bind(cost.site_id, cost.description, cost.amount, 0, cost.frequency).run();
      }
    }
  }
};
