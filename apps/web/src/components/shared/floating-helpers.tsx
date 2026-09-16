'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

// ⚙️  EDITAR AQUÍ
const WHATSAPP_NUMBER = '51999888777';
const WHATSAPP_MENSAJE_DEFAULT = 'Hola Dream Life! Vengo de la web y tengo una consulta';
const HOVER_DELAY_MS = 700;

const FAQS: { q: string; a: string }[] = [
  { q: '¿Cómo hago un pedido?', a: 'Explora el catálogo, agrega al carrito y ve a checkout. Te pediremos datos de envío y método de pago.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Yape, Plin, tarjeta (Visa/Mastercard) y contraentrega en Lima.' },
  { q: '¿Cuánto demora el envío?', a: 'Lima: 1-2 días hábiles. Provincias: 3-5 días vía Olva o Shalom. Envíos sobre S/. 199 son gratis.' },
  { q: '¿Puedo devolver un producto?', a: 'Tienes 30 días para devoluciones con empaque original. Coordina por WhatsApp.' },
  { q: '¿Hacen diseños personalizados?', a: 'Sí, ve a "Personalizado" y cuéntanos qué quieres. Cotizamos en menos de 24h.' },
  { q: '¿Tienen tiendas físicas?', a: 'Sí. Tienda Central Lima y Tienda Miraflores. Direcciones en "Nosotros".' },
  { q: '¿Cómo creo una cuenta?', a: 'Ícono de usuario → "Regístrate". Solo necesitas nombre, correo y contraseña.' },
  { q: '¿Tienen programa de puntos?', a: 'Sí. Acumulas puntos por compra y subes de Bronce → Plata → Oro → Platino con beneficios.' },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.869 9.869 0 0 1-1.516-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/**
 * Ícono propio del asistente: burbuja de chat con un destello, dibujado a
 * mano en SVG (sin depender de ningún archivo externo que pueda faltar).
 * Combina bien con el degradado de marca del botón que lo contiene.
 */
function AssistantIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.5 6.8A2.3 2.3 0 0 1 5.8 4.5h10.4a2.3 2.3 0 0 1 2.3 2.3v6.4a2.3 2.3 0 0 1-2.3 2.3H9.7l-3.86 3.02a.5.5 0 0 1-.81-.39V15.5a2.3 2.3 0 0 1-1.53-2.17V6.8Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      <circle cx="8.3" cy="10" r="1" fill="currentColor" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="15.7" cy="10" r="1" fill="currentColor" />
      <path d="M18.5 2.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" fill="currentColor" />
    </svg>
  );
}

export function FloatingHelpers() {
  const [expanded, setExpanded] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [dismissedHint, setDismissedHint] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MENSAJE_DEFAULT)}`;

  // Pequeño "pulso" de atención la primera vez que carga la página
  useEffect(() => {
    const seen = sessionStorage.getItem('dl-helper-hint-seen');
    if (seen) { setDismissedHint(true); return; }
    const t = setTimeout(() => setShowHint(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const h = (e: MouseEvent) => {
      const el = document.getElementById('floating-helpers-root');
      if (el && !el.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [expanded]);

  const handleMouseEnter = () => {
    if (expanded) return;
    hoverTimer.current = setTimeout(() => setExpanded(true), HOVER_DELAY_MS);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  };
  const dismissHint = () => {
    setShowHint(false);
    setDismissedHint(true);
    sessionStorage.setItem('dl-helper-hint-seen', '1');
  };

  return (
    <>
      {/* Panel FAQ */}
      {botOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-[380px] max-h-[80vh] sm:max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in">
          <div className="bg-gradient-to-r from-accent to-accent-2 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"><AssistantIcon className="w-5 h-5" /></div>
              <div>
                <p className="font-bold text-sm">Asistente Dream Life</p>
                <p className="text-xs opacity-90">Preguntas frecuentes</p>
              </div>
            </div>
            <button onClick={() => setBotOpen(false)} className="p-1.5 hover:bg-white/15 rounded-md transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 bg-secondary/30 border-b border-border">
            <p className="text-sm">👋 ¡Hola! ¿Cómo puedo ayudarte?</p>
            <p className="text-xs text-muted-foreground mt-1">Toca una pregunta para ver la respuesta.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {FAQS.map((f, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-2 p-3 text-left text-sm hover:bg-secondary transition-colors">
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform flex-shrink-0', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground border-t border-border bg-secondary/30">
                    <p className="pt-2 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border bg-secondary/30">
            <p className="text-xs text-muted-foreground text-center mb-2">¿No encuentras tu respuesta?</p>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-medium py-2.5 rounded-md transition-colors">
              <Send className="w-3.5 h-3.5" />Hablar por WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Speed-dial */}
      <div
        id="floating-helpers-root"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-[60px] h-[60px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Globo de invitación (solo la primera vez, se puede cerrar) */}
        {showHint && !expanded && !botOpen && (
          <div className="absolute bottom-[70px] right-0 w-48 bg-card border border-border rounded-xl shadow-lg p-3 animate-in">
            <button onClick={dismissHint} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted">
              <X className="w-3 h-3" />
            </button>
            <p className="text-xs leading-relaxed">¿Alguna duda? Escríbenos por WhatsApp o revisa las preguntas frecuentes 👋</p>
          </div>
        )}

        {/* Pila vertical centrada: FAQ arriba, WhatsApp en medio, botón principal abajo */}

        {/* Sub-botón FAQ (más lejos del botón principal) */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 transition-all duration-300',
            expanded ? 'bottom-[140px] opacity-100 scale-100 pointer-events-auto' : 'bottom-[60px] opacity-0 scale-50 pointer-events-none'
          )}
        >
          <div className="relative flex items-center justify-end">
            <span className="absolute right-full mr-3 text-xs font-medium bg-white text-neutral-900 px-3 py-2 rounded-full shadow-lg whitespace-nowrap">
              Preguntas frecuentes
            </span>
            <button
              onClick={() => { setBotOpen(true); setExpanded(false); }}
              aria-label="Preguntas frecuentes"
              className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
            >
              <AssistantIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-botón WhatsApp (justo encima del botón principal) */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 transition-all duration-300',
            expanded ? 'bottom-[76px] opacity-100 scale-100 pointer-events-auto' : 'bottom-[60px] opacity-0 scale-50 pointer-events-none'
          )}
        >
          <div className="relative flex items-center justify-end">
            <span className="absolute right-full mr-3 text-xs font-medium bg-white text-neutral-900 px-3 py-2 rounded-full shadow-lg whitespace-nowrap">
              WhatsApp
            </span>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
            >
              <WhatsAppIcon className="w-5 h-5" />
            </a>
          </div>
        </div>


        {/* Botón principal */}
        <div className="relative">
          {!expanded && !dismissedHint && (
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-accent-2 pulse-ring" />
          )}
          <button
            onClick={() => { setExpanded(!expanded); if (showHint) dismissHint(); }}
            aria-label={expanded ? 'Cerrar' : 'Abrir menú de ayuda'}
            className="relative w-[60px] h-[60px] rounded-full bg-gradient-to-br from-accent to-accent-2 text-white shadow-lg hover:shadow-2xl flex items-center justify-center transition-all hover:scale-105"
          >
            {expanded ? <X className="w-6 h-6" /> : <AssistantIcon className="w-7 h-7" />}
          </button>
        </div>
      </div>
    </>
  );
}
