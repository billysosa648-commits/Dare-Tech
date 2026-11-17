// Carga Turnstile una vez y administra el reto del formulario de diagnóstico.
import { useEffect, useRef, useState } from 'react';

// Comparte la promesa de carga para evitar insertar el script más de una vez.
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (window.__dareTechTurnstileLoad) return window.__dareTechTurnstileLoad;
  window.__dareTechTurnstileLoad = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-dare-turnstile]');
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(window.turnstile), { once: true });
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Turnstile.')), { once: true });
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.dareTurnstile = 'true';
      document.head.append(script);
    }
  });
  return window.__dareTechTurnstileLoad;
}

// Mantiene el token y desmonta el widget cuando React retira el formulario.
export default function useTurnstile(siteKey) {
  const mountRef = useRef(null);
  const widgetRef = useRef(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!siteKey) return () => { active = false; };
    loadTurnstile().then(turnstile => {
      if (!active || !mountRef.current || widgetRef.current) return;
      widgetRef.current = turnstile.render(mountRef.current, {
        sitekey: siteKey,
        callback: value => { setToken(value); setError(''); },
        'expired-callback': () => setToken(''),
        'error-callback': () => { setToken(''); setError('No se pudo verificar el navegador. Intenta de nuevo.'); }
      });
    }).catch(failure => { if (active) setError(failure.message); });

    return () => {
      active = false;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKey]);

  // Limpia el token anterior y solicita un reto nuevo después de cada intento.
  function resetWidget() {
    setToken('');
    if (widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current);
  }

  return { token, mountRef, error, reset: resetWidget };
}
