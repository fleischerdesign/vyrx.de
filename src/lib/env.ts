/*
 * Ein Ort, der beantwortet, ob wir in der Entwicklung laufen.
 *
 * Der gebaute Server wird von Vite versorgt und kennt `import.meta.env`; unter
 * dem Testläufer von Node gibt es die Variable nicht. Beide Fälle ergeben
 * dieselbe Antwort, statt zu werfen.
 */

export function isDevBuild(): boolean {
  return Boolean(import.meta.env?.DEV);
}
