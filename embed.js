/* ========================================
   Derecho Virtual - Embeddable Chatbot Widget
   REWRITTEN: Toggle restored, Mobile optimized
   ======================================== */

(function () {
    'use strict';

    // Configuration
    const WIDGET_BASE_URL = 'https://chat-bot-ia-nine.vercel.app';
    const API_ENDPOINT = WIDGET_BASE_URL + '/api/chat';
    const CALENDLY_URL = 'https://calendly.com/derecho-virtual/demostracion-gratuita-derechovirtual';
    const REMINDER_INTERVAL = 45000;
    const LOGO_URL = WIDGET_BASE_URL + '/logo.jpg';

    // Conversation Steps
    const CONVERSATION_STEPS = {
        0: { message: "¡Ey! 👋 ¿Estudiando Derecho a distancia y agobiado con los exámenes? Tengo algo que puede cambiarte el cuatrimestre 🔥", waitForResponse: true },
        1: { message: "Mira, en 30 min te enseño GRATIS cómo aprobar con nuestro método: clases de 15 min, esquemas listos y una IA que te resuelve dudas al momento. ¿Te apuntas? 🎯", waitForResponse: true },
        2: { message: "Genial! Para reservarte hueco en la demo, ¿en qué uni estudias? 🎓", waitForResponse: true, collectField: 'universidad' },
        3: { message: "Perfecto! ¿Cómo te llamas? 😊", waitForResponse: true, collectField: 'nombre' },
        4: { message: "Guay {nombre}! Dame tu email para mandarte el enlace de la demo 📧", waitForResponse: true, collectField: 'email' },
        5: { message: "Último paso! Tu móvil por si hay cambios de última hora ☎️", waitForResponse: true, collectField: 'telefono' },
        6: { message: "¡Perfecto {nombre}! 🎉 Haz clic en el botón y elige tu hueco. ¡Hay pocas plazas esta semana!", showCalendly: true }
    };

    const REMINDER_MESSAGES = [
        "¿Sigues ahí? 👀 Las plazas para esta semana se acaban rápido...",
        "Ey! Solo te faltan 30 segundos para reservar tu demo gratis 🎯",
        "No te quedes sin probar el método que ha ayudado a cientos de alumnos a aprobar 💪",
        "¿Tienes alguna duda? Pregúntame lo que quieras 😊"
    ];

    // State
    let chatState = {
        currentStep: 0,
        collectedData: { universidad: '', nombre: '', email: '', telefono: '' },
        conversationHistory: [],
        awaitingResponse: false,
        reminderTimer: null,
        reminderCount: 0,
        lastUserMessageTime: null,
        isOpen: false
    };

    const SYSTEM_PROMPT = `Eres un SETTER DE VENTAS de Derecho Virtual para estudiantes universitarios. Tu ÚNICO objetivo es conseguir que reserven una demo gratuita.
PERSONALIDAD: Estudiante universitario, cercano, usa emojis, mensajes CORTOS (1-2 líneas máximo).
DATOS RECOPILADOS: {{COLLECTED_DATA}}
CONTEXTO: {{CURRENT_CONTEXT}}
TÉCNICAS: Beneficio, urgencia, prueba social, sin riesgo.
REGLA: SIEMPRE termina con una pregunta que acerque a la demo.`;

    // CSS Styles
    function injectStyles() {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            #dv-widget { font-family: 'Inter', sans-serif; }
            
            /* TOGGLE BUTTON - Always visible when chat is CLOSED */
            #dv-toggle {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                width: 65px;
                height: 65px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 50%;
                border: none;
                cursor: pointer;
                box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                animation: dv-pulse 2s infinite;
            }
            #dv-toggle:hover { transform: scale(1.1); }
            #dv-toggle img { width: 40px; height: 40px; border-radius: 50%; }
            #dv-toggle::after {
                content: '1';
                position: absolute;
                top: 0;
                right: 0;
                background: #ef4444;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                border: 2px solid white;
            }
            
            @keyframes dv-pulse {
                0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
                100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
            }

            /* CHAT CONTAINER */
            #dv-chat {
                position: fixed;
                bottom: 6rem;
                right: 1.5rem;
                width: 380px;
                height: 600px;
                max-height: 80vh;
                background: white;
                border-radius: 1.5rem;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 999999;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
            }
            #dv-chat.open {
                display: flex;
                opacity: 1;
                transform: translateY(0);
            }
            
            /* HEADER */
            #dv-header {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            #dv-header img { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); }
            #dv-header-info h4 { margin: 0; font-size: 1rem; font-weight: 600; }
            #dv-header-info span { font-size: 0.8rem; opacity: 0.9; display: flex; align-items: center; gap: 4px; }
            #dv-header-info span::before { content: ''; display: block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
            
            /* CLOSE BUTTON (Header) */
            #dv-close {
                margin-left: auto;
                background: rgba(255,255,255,0.2);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: background 0.2s;
            }
            #dv-close:hover { background: rgba(255,255,255,0.3); }

            /* MESSAGES */
            #dv-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                background: #f8fafc;
            }
            .dv-msg {
                max-width: 85%;
                padding: 0.8rem 1rem;
                border-radius: 1rem;
                font-size: 0.95rem;
                line-height: 1.5;
                position: relative;
            }
            .dv-msg.bot {
                background: white;
                align-self: flex-start;
                border-bottom-left-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                color: #1e293b;
            }
            .dv-msg.user {
                background: #6366f1;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
                box-shadow: 0 2px 5px rgba(99, 102, 241, 0.3);
            }
            
            /* INPUT AREA */
            #dv-input-wrap {
                padding: 1rem;
                background: white;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 0.5rem;
            }
            #dv-input {
                flex: 1;
                padding: 0.8rem 1rem;
                border: 2px solid #e2e8f0;
                border-radius: 2rem;
                font-size: 16px; /* Prevents zoom on iOS */
                outline: none;
                transition: border-color 0.2s;
            }
            #dv-input:focus { border-color: #6366f1; }
            #dv-send {
                width: 46px;
                height: 46px;
                background: #6366f1;
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: transform 0.2s;
            }
            #dv-send:hover { transform: scale(1.05); }

            /* CALENDLY BUTTON */
            .dv-calendly {
                background: #6366f1;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 2rem;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                margin-top: 0.5rem;
                transition: transform 0.2s;
            }
            .dv-calendly:hover { transform: scale(1.02); }

            /* MOBILE OPTIMIZATIONS */
            @media (max-width: 480px) {
                #dv-toggle {
                    width: 60px;
                    height: 60px;
                    bottom: 1rem;
                    right: 1rem;
                }
                
                #dv-chat {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    max-height: 100%;
                    border-radius: 0;
                    z-index: 9999999;
                }
                
                /* HIDE TOGGLE WHEN CHAT IS OPEN ON MOBILE */
                #dv-chat.open ~ #dv-toggle {
                    display: none !important;
                }
                
                #dv-messages {
                    padding: 1rem;
                }
                
                .dv-msg {
                    font-size: 1rem; /* Larger text for mobile */
                    max-width: 90%;
                }
                
                #dv-input-wrap {
                    padding: 0.8rem;
                    padding-bottom: max(0.8rem, env(safe-area-inset-bottom));
                }
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // HTML Structure
    function createHTML() {
        const container = document.createElement('div');
        container.id = 'dv-widget';
        container.innerHTML = `
            <div id="dv-chat">
                <div id="dv-header">
                    <img src="${LOGO_URL}" alt="DV" onerror="this.outerHTML='📚'">
                    <div id="dv-header-info">
                        <h4>Derecho Virtual</h4>
                        <span>En línea</span>
                    </div>
                    <button id="dv-close">✕</button>
                </div>
                <div id="dv-messages"></div>
                <div id="dv-input-wrap">
                    <input type="text" id="dv-input" placeholder="Escribe tu mensaje..." autocomplete="off">
                    <button id="dv-send">➤</button>
                </div>
            </div>
            <button id="dv-toggle">
                <img src="${LOGO_URL}" alt="Chat" onerror="this.outerHTML='💬'">
            </button>
        `;
        document.body.appendChild(container);
    }

    // Actions
    function openChat() {
        const chat = document.getElementById('dv-chat');
        const toggle = document.getElementById('dv-toggle');

        chat.classList.add('open');
        // On mobile, CSS handles hiding the toggle via sibling selector or we can force it
        if (window.innerWidth <= 480) {
            toggle.style.display = 'none';
        }

        chatState.isOpen = true;
        if (chatState.currentStep === 0 && chatState.conversationHistory.length === 0) {
            sendNextBotMessage();
            startReminderTimer();
        }

        // Focus input only on desktop to prevent keyboard popping up on mobile
        if (window.innerWidth > 480) {
            document.getElementById('dv-input').focus();
        }
    }

    function closeChat() {
        const chat = document.getElementById('dv-chat');
        const toggle = document.getElementById('dv-toggle');

        chat.classList.remove('open');
        toggle.style.display = 'flex'; // Restore toggle

        chatState.isOpen = false;
        stopReminderTimer();
    }

    // Logic
    function sendNextBotMessage() {
        const step = CONVERSATION_STEPS[chatState.currentStep];
        if (!step) return;

        let msg = step.message;
        if (chatState.collectedData.nombre) msg = msg.replace('{nombre}', chatState.collectedData.nombre);

        addMessage(msg, 'bot');

        if (step.collectField) updateInputType(step.collectField);
        if (step.showCalendly) showCalendly();

        chatState.awaitingResponse = step.waitForResponse;
    }

    function addMessage(text, type) {
        const container = document.getElementById('dv-messages');
        const div = document.createElement('div');
        div.className = `dv-msg ${type}`;
        div.innerHTML = text; // Allow HTML for bolding etc
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        chatState.conversationHistory.push({ role: type === 'bot' ? 'assistant' : 'user', content: text });
    }

    async function handleSend() {
        const input = document.getElementById('dv-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage(text, 'user');

        // Logic for next step or AI
        const step = CONVERSATION_STEPS[chatState.currentStep];

        // Check if it's a question
        if (text.includes('?') || text.length > 20 && !step.collectField) {
            // Simple AI fallback or continue
        }

        if (step && step.collectField) {
            chatState.collectedData[step.collectField] = text; // Simplified extraction
            chatState.currentStep++;
            setTimeout(sendNextBotMessage, 600);
        }
    }

    function updateInputType(field) {
        const input = document.getElementById('dv-input');
        if (field === 'email') input.type = 'email';
        else if (field === 'telefono') input.type = 'tel';
        else input.type = 'text';
    }

    function showCalendly() {
        const container = document.getElementById('dv-messages');
        const btn = document.createElement('button');
        btn.className = 'dv-calendly';
        btn.textContent = '📅 Reservar Demo';
        btn.onclick = () => window.open(CALENDLY_URL, '_blank');
        container.appendChild(btn);
        container.scrollTop = container.scrollHeight;
    }

    function startReminderTimer() {
        stopReminderTimer();
        chatState.lastUserMessageTime = Date.now();
        chatState.reminderTimer = setInterval(() => {
            if (chatState.awaitingResponse && Date.now() - chatState.lastUserMessageTime > REMINDER_INTERVAL) {
                if (chatState.reminderCount < REMINDER_MESSAGES.length) {
                    addMessage(REMINDER_MESSAGES[chatState.reminderCount], 'bot');
                    chatState.reminderCount++;
                    chatState.lastUserMessageTime = Date.now();
                }
            }
        }, 5000); // Check every 5s
    }

    function stopReminderTimer() {
        if (chatState.reminderTimer) clearInterval(chatState.reminderTimer);
    }

    // Init
    function init() {
        document.getElementById('dv-toggle').addEventListener('click', openChat);
        document.getElementById('dv-close').addEventListener('click', closeChat);
        document.getElementById('dv-send').addEventListener('click', handleSend);
        document.getElementById('dv-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });

        // Auto open
        setTimeout(() => {
            if (!chatState.isOpen) openChat();
        }, 25000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { injectStyles(); createHTML(); init(); });
    else { injectStyles(); createHTML(); init(); }

})();
