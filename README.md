# Derecho Virtual - Chatbot Widget

Chatbot embebible para agendar demos gratuitas con integración Calendly.

## 🚀 Deploy a Vercel

1. Sube este directorio a GitHub
2. Conecta el repo en [vercel.com](https://vercel.com)
3. **IMPORTANTE:** Configura la variable de entorno en Vercel:
   - Settings → Environment Variables
   - Name: `OPENAI_API_KEY`
   - Value: tu API key de OpenAI

## ⚙️ Configuración post-deploy

**Edita `embed.js` línea 10:**
```javascript
const WIDGET_BASE_URL = 'https://TU-DOMINIO.vercel.app';
```

## 📌 Embedding en cualquier web

Añade esto antes de `</body>`:
```html
<script src="https://TU-DOMINIO.vercel.app/embed.js"></script>
```

## 📁 Archivos

| Archivo | Uso |
|---------|-----|
| `embed.js` | Script embebible (todo incluido) |
| `api/chat.js` | Serverless function (proxy OpenAI) |
| `logo.jpg` | Logo del widget |
| `vercel.json` | Config CORS para Vercel |

## ✅ Funciones

- ✅ API key segura en servidor (no expuesta al cliente)
- ✅ Mentalidad setter de ventas
- ✅ Recordatorios cada 45s (máx 4)
- ✅ Prefijo +34 automático
- ✅ Autocompletado dinámico
- ✅ Calendly con datos pre-rellenados
