# 🌐 ComputerCraft Server Hosting Guide

This guide covers multiple free and low-cost hosting options for your ComputerCraft Dashboard Server.

## 🆓 Free Hosting Options (Recommended)

### 1. Railway (Easiest - Free Tier)

Railway offers excellent free tier with easy deployment.

**Pros:**
- $5 credit monthly (usually enough for small apps)
- Simple GitHub integration
- Built-in environment variables
- Custom domains
- Automatic HTTPS

**Setup:**
1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Click "Deploy Now"
4. Set environment variables:
   ```
   NODE_ENV=production
   PORT=8080
   CORS_ORIGINS=https://your-dashboard-domain.com
   ```
5. Your app will be at: `https://your-app.railway.app`

### 2. Render (Great Free Tier)

Render provides 750 hours free per month for web services.

**Pros:**
- Always-free tier (with some limitations)
- Auto-deploy from Git
- Custom domains
- Environment variables
- Health checks

**Setup:**
1. Sign up at [render.com](https://render.com)
2. Create new "Web Service"
3. Connect your repository
4. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
5. Add environment variables in dashboard

### 3. Fly.io (Generous Free Tier)

Fly.io offers great free tier with global deployment.

**Pros:**
- 3 shared-cpu-1x VMs free
- Global edge deployment
- Custom domains
- Great Docker support

**Setup:**
1. Install flyctl: `npm install -g @flydotio/flyctl`
2. Login: `fly auth login`
3. In your project: `fly launch`
4. Deploy: `fly deploy`

## 💰 Low-Cost Options ($2-5/month)

### 1. DigitalOcean App Platform
- $5/month for basic app
- Great performance
- Easy scaling

### 2. Heroku (After free tier removal)
- $7/month for Eco dynos
- Very reliable
- Extensive add-on ecosystem

### 3. Vultr or Linode VPS
- $2.50-5/month
- Full server control
- Can host multiple apps

## 🐳 Docker Deployment Commands

### Quick Start (Development)
```bash
# Build and run development container
npm run docker:run-dev

# Access logs
npm run docker:logs
```

### Production Deployment
```bash
# Build production image
npm run docker:build

# Run production container
npm run docker:prod

# Stop container
npm run docker:stop
```

### Manual Docker Commands
```bash
# Build image
docker build -t computercraft-server .

# Run container
docker run -d \
  --name computercraft-server \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e CORS_ORIGINS=https://your-dashboard.com \
  computercraft-server

# View logs
docker logs computercraft-server

# Stop container
docker stop computercraft-server
```

## ⚙️ Environment Configuration

### Required Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment | `development` | `production` |
| `PORT` | Server port | `8080` | `8080` |
| `HOST` | Bind host | `0.0.0.0` | `0.0.0.0` |
| `CORS_ORIGINS` | Allowed origins | localhost URLs | `https://your-dashboard.com` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `info` |
| `MAX_MESSAGE_SIZE` | Max request size | `10mb` |

### Environment File Example

Create `.env` in production:

```env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
CORS_ORIGINS=https://your-dashboard.vercel.app,https://your-custom-domain.com
LOG_LEVEL=warn
```

## 🌍 Domain Configuration

### 1. Get Your Server URL

After deployment, you'll get a URL like:
- Railway: `https://your-app.railway.app`
- Render: `https://your-app.onrender.com`
- Fly.io: `https://your-app.fly.dev`

### 2. Update ComputerCraft Client

Edit `computercraft_client.lua`:
```lua
local SERVER_URL = "https://your-app.railway.app"  -- Your deployed URL
```

### 3. Update Dashboard

Update your React dashboard connection:
```javascript
const [serverUrl, setServerUrl] = useState('wss://your-app.railway.app/ws')
```

Note: Use `wss://` (secure WebSocket) for HTTPS deployments.

## 🔒 Security Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for your dashboard domain only
- [ ] Use HTTPS/WSS in production
- [ ] Set up proper logging
- [ ] Configure health checks
- [ ] Monitor resource usage

### CORS Configuration

In production, be specific with CORS origins:

```env
# Good - specific domains
CORS_ORIGINS=https://your-dashboard.vercel.app,https://your-domain.com

# Bad - too permissive
CORS_ORIGINS=*
```

## 📊 Monitoring & Debugging

### Health Check

Test your deployment:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "stats": {
    "totalClients": 0,
    "dashboards": 0,
    "computers": 0,
    "aliveClients": 0
  }
}
```

### Common Issues

**"Connection Refused"**
- Check if server is running
- Verify port configuration
- Check firewall settings

**"CORS Error"**
- Add your dashboard domain to `CORS_ORIGINS`
- Ensure protocol matches (http/https)

**"WebSocket Connection Failed"**
- Use `wss://` for HTTPS deployments
- Check WebSocket support on hosting platform

**ComputerCraft Can't Connect**
- Verify ComputerCraft HTTP API is enabled
- Check server URL in Lua script
- Test with `/health` endpoint first

### Log Monitoring

Most platforms provide log viewing:

- **Railway:** `railway logs`
- **Render:** View in dashboard
- **Fly.io:** `fly logs`

## 🚀 Deployment Automation

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
      # Add deployment steps for your chosen platform
```

## 💡 Cost Optimization

### Free Tier Tips

1. **Railway:** Monitor usage in dashboard, stays free under $5/month
2. **Render:** App sleeps after inactivity (wakes on request)
3. **Fly.io:** Use shared CPU instances for small workloads

### Resource Limits

Configure appropriate limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

## 🔮 Next Steps

1. Choose a hosting platform and deploy your server
2. Update your ComputerCraft client with the new URL
3. Update your dashboard to connect to the remote server
4. Test the full system end-to-end
5. Set up monitoring and alerts
6. Consider adding authentication for production use

## 🆘 Getting Help

If you encounter issues:

1. Check the hosting platform's documentation
2. Review server logs for errors
3. Test the `/health` endpoint
4. Verify environment variables are set correctly
5. Check ComputerCraft's HTTP API configuration

Remember: Start with Railway or Render for the easiest setup, then consider other options as your needs grow!
