# ComfyUI Mini - Static Version

A static, client-side web application for running ComfyUI workflows, converted from the original Express.js version to work entirely in the browser with direct ComfyUI API communication.

## Features

- 🌐 **Static deployment** - No backend server required, works on GitHub Pages, Netlify, Vercel, etc.
- 🔗 **Direct ComfyUI API** - Communicates directly with ComfyUI server via REST API and WebSocket
- 💾 **Local storage** - Workflows and settings stored in browser localStorage
- 🎨 **Multiple themes** - Dark, light, and several color themes included
- 📱 **Mobile-friendly** - Responsive design works on desktop and mobile
- 🔄 **Real-time progress** - WebSocket connection shows generation progress
- 📁 **Workflow import/export** - Import ComfyUI API format JSON workflows

## Quick Start

1. **Deploy to GitHub Pages:**
   - Fork this repository
   - Go to Settings > Pages
   - Set Source to "Deploy from a branch"
   - Select `main` branch and `/ (root)` folder
   - Your app will be available at `https://yourusername.github.io/ComfyUIMini/`

2. **Local development:**
   ```bash
   # Serve the files with any static file server
   python -m http.server 8000
   # or
   npx serve .
   # Then open http://localhost:8000
   ```

3. **Configure ComfyUI connection:**
   - Ensure your ComfyUI server is running (default: http://127.0.0.1:8188)
   - In the app, go to Settings and enter your ComfyUI server URL
   - Click "Test Connection" to verify

## Requirements

- **ComfyUI server** running and accessible from your browser
- **CORS enabled** on ComfyUI (usually enabled by default)
- **Modern browser** with WebSocket and localStorage support

## Important Notes

### CORS and Security

- ComfyUI must be accessible from your browser (CORS enabled)
- If serving over HTTPS, ComfyUI must also use HTTPS (or be on localhost)
- For remote ComfyUI servers, ensure proper CORS configuration

### Workflow Format

- Only supports **ComfyUI API format** workflows (not regular ComfyUI save format)
- Export from ComfyUI web interface using "Save (API Format)" option
- The app will generate basic metadata if missing

### Browser Compatibility

- Chrome, Firefox, Safari, Edge (modern versions)
- Requires JavaScript modules support
- Uses modern APIs: fetch, WebSocket, localStorage

## File Structure

```
/
├── index.html              # Main application
├── assets/
│   ├── css/               # Stylesheets and themes
│   ├── js/
│   │   └── app.js         # Main application logic
│   ├── img/               # Icons and favicons
│   └── fonts/             # Futura font files
└── README-static.md
```

## Configuration

The app stores configuration in `localStorage`:

```javascript
{
  "comfyuiUrl": "http://127.0.0.1:8188",
  "comfyuiWsUrl": "ws://127.0.0.1:8188",
  "theme": "dark"
}
```

## Workflow Storage

Workflows are stored in browser localStorage as:

```javascript
[
  {
    "id": "workflow-id",
    "title": "My Workflow",
    "description": "Description",
    "workflow": { /* ComfyUI API format workflow */ },
    "createdAt": 1234567890
  }
]
```

## Development

### From Original ComfyUIMini

This static version was converted from the original Express.js ComfyUIMini by:

1. **Removing server dependencies** - No Express.js, multer, etc.
2. **Direct API communication** - Browser directly calls ComfyUI REST API
3. **Client-side workflow management** - localStorage instead of file system
4. **Static HTML** - No EJS templates, pure HTML/CSS/JS
5. **WebSocket integration** - Direct browser WebSocket to ComfyUI

### Key Changes

- `src/server/` → Removed entirely
- `src/client/` → Converted to vanilla JavaScript in `assets/js/app.js`
- EJS templates → Static HTML in `index.html`
- Server routes → Client-side functions
- File storage → localStorage

## Deployment Options

### GitHub Pages
1. Push to GitHub repository
2. Enable Pages in repository settings
3. Access at `https://username.github.io/repository-name/`

### Netlify
1. Connect GitHub repository
2. Set build command: (none)
3. Set publish directory: `/` (root)

### Vercel
1. Import GitHub repository
2. Framework preset: Other
3. Root directory: `/`

### Self-hosted
Serve the files with any static file server (nginx, Apache, etc.)

## Troubleshooting

### Connection Issues
- Ensure ComfyUI is running and accessible
- Check CORS configuration
- Verify URLs in settings (http vs https)

### Workflow Import
- Use ComfyUI API format (not regular save format)
- Check browser console for detailed error messages
- Ensure JSON is valid

### Generation Problems
- Check WebSocket connection in browser dev tools
- Verify workflow nodes are properly configured
- Check ComfyUI server logs for errors

## Contributing

This is a static conversion of the original ComfyUIMini. For the full-featured version with server capabilities, see the original repository.

## License

AGPL-3.0 (same as original ComfyUIMini)