// Expone únicamente ajustes públicos que necesita el navegador para renderizar Turnstile.

// Devuelve la site key pública y mantiene oculta la clave secreta del servidor.
function getPublicConfig(req, res) {
  res.set('Cache-Control', 'no-store');
  return res.json({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null });
}

// Exporta la configuración pública para su endpoint.
module.exports = { getPublicConfig };
