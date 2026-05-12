import { Hono } from 'hono';

const app = new Hono();

// Helper to get or generate a token on first install
const getOrGenerateToken = async (env) => {
  let token = await env.BRICKLAYER_SITES.get('SYSTEM:TRANSFER_TOKEN');
  if (!token) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    token = 'bl_';
    for (let i = 0; i < 24; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    await env.BRICKLAYER_SITES.put('SYSTEM:TRANSFER_TOKEN', token);
  }
  return token;
};

// Basic Middleware for Authentication
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  // Get active transfer token from KV, generate one if it's the very first run
  const activeToken = await getOrGenerateToken(c.env);
  const adminPassword = await c.env.BRICKLAYER_SITES.get('SYSTEM:ADMIN_PASSWORD') || c.env.ADMIN_PASSWORD;
  
  if (token !== activeToken && token !== adminPassword) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  await next();
};

app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  
  const adminEmail = await c.env.BRICKLAYER_SITES.get('SYSTEM:ADMIN_EMAIL') || c.env.ADMIN_EMAIL;
  const adminPassword = await c.env.BRICKLAYER_SITES.get('SYSTEM:ADMIN_PASSWORD') || c.env.ADMIN_PASSWORD;

  if (email === adminEmail && password === adminPassword) {
    // Return the admin password as the session token (or a JWT in prod)
    return c.json({ token: adminPassword });
  }
  
  return c.json({ error: 'Invalid credentials' }, 401);
});

// Settings Endpoints
app.get('/api/settings', authMiddleware, async (c) => {
  const adminEmail = await c.env.BRICKLAYER_SITES.get('SYSTEM:ADMIN_EMAIL') || c.env.ADMIN_EMAIL;
  return c.json({ email: adminEmail });
});

app.post('/api/settings', authMiddleware, async (c) => {
  try {
    const { email, password, currentPassword } = await c.req.json();
    
    // Validate current password
    const adminPassword = await c.env.BRICKLAYER_SITES.get('SYSTEM:ADMIN_PASSWORD') || c.env.ADMIN_PASSWORD;
    if (currentPassword !== adminPassword) {
      return c.json({ error: 'Incorrect current password' }, 403);
    }

    if (email) await c.env.BRICKLAYER_SITES.put('SYSTEM:ADMIN_EMAIL', email);
    if (password) await c.env.BRICKLAYER_SITES.put('SYSTEM:ADMIN_PASSWORD', password);
    
    const newToken = password || adminPassword;
    return c.json({ success: true, token: newToken });
  } catch (error) {
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// Endpoint for `bricklayer manage` CLI to push config
app.post('/api/sites', authMiddleware, async (c) => {
  try {
    const siteData = await c.req.json();
    
    // We expect the CLI to send a unique identifier, e.g., project URL or name
    const siteId = siteData.url || siteData.name || `site-${Date.now()}`;
    
    // Add timestamp
    siteData.lastUpdated = new Date().toISOString();
    
    await c.env.BRICKLAYER_SITES.put(`site:${siteId}`, JSON.stringify(siteData));
    
    return c.json({ success: true, message: 'Site registered successfully', id: siteId });
  } catch (error) {
    return c.json({ error: 'Failed to register site' }, 500);
  }
});

// Endpoint to delete a site
app.delete('/api/sites/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.BRICKLAYER_SITES.delete(`site:${id}`);
    await c.env.BRICKLAYER_SITES.delete(id); // legacy fallback
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete site' }, 500);
  }
});

// Endpoint for the Admin Dashboard to fetch all sites
app.get('/api/sites', authMiddleware, async (c) => {
  try {
    const list = await c.env.BRICKLAYER_SITES.list({ prefix: 'site:' });
    const sites = [];
    
    for (const key of list.keys) {
      const value = await c.env.BRICKLAYER_SITES.get(key.name);
      if (value) {
        sites.push(JSON.parse(value));
      }
    }
    
    // Fallback if there are legacy sites without 'site:' prefix
    if (sites.length === 0) {
       const allList = await c.env.BRICKLAYER_SITES.list();
       for (const key of allList.keys) {
         if (!key.name.startsWith('SYSTEM:')) {
           const value = await c.env.BRICKLAYER_SITES.get(key.name);
           if (value) sites.push(JSON.parse(value));
         }
       }
    }
    
    return c.json({ sites });
  } catch (error) {
    return c.json({ error: 'Failed to fetch sites: ' + error.message, stack: error.stack }, 500);
  }
});

// Endpoint to get the current transfer token
app.get('/api/token', authMiddleware, async (c) => {
  const activeToken = await getOrGenerateToken(c.env);
  return c.json({ token: activeToken });
});

// Endpoint to rotate the transfer token
app.post('/api/token/rotate', authMiddleware, async (c) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let newToken = 'bl_';
  for (let i = 0; i < 24; i++) newToken += chars.charAt(Math.floor(Math.random() * chars.length));
  
  await c.env.BRICKLAYER_SITES.put('SYSTEM:TRANSFER_TOKEN', newToken);
  return c.json({ token: newToken });
});

export default app;
