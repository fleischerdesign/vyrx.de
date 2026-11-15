/*
 * Die Build-ID kommt aus dem Deployment, nicht aus einer geratenen Version.
 * Ein neuer Portal-Store-Pfad bedeutet einen neuen Build; im Dev-Betrieb
 * bleibt sie stabil bei `dev`.
 */
export const buildId = (process.env.PORTAL_BUILD ?? 'dev').trim() || 'dev';
