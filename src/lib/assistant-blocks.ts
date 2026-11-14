/*
 * Die Blockformen, die der Assistent in die Oberfläche legen darf.
 *
 * Kein freies HTML und kein Modell-Markup: Der Server wählt aus diesem
 * Katalog, prüft jede Adresse gegen die sichtbaren Daten und schickt nur
 * strukturierte Werte. Der Client baut daraus die vorhandenen Karten.
 */

export type AssistantBlock =
  | {
      readonly type: 'status';
      readonly serviceId: string;
      readonly name: string;
      readonly state: 'up' | 'down' | 'unknown' | 'unmonitored';
      readonly stateText: string;
      readonly asOf: number | null;
      readonly href: string;
    }
  | {
      readonly type: 'service';
      readonly serviceId: string;
      readonly name: string;
      readonly summary: string;
      readonly stateText: string;
      readonly asOf: number | null;
      readonly href: string;
    }
  | {
      readonly type: 'article';
      readonly slug: string;
      readonly title: string;
      readonly summary: string;
      readonly kind: string;
      readonly kindText: string;
      readonly href: string;
    }
  | {
      readonly type: 'maintenance';
      readonly serviceId: string | null;
      readonly serviceName: string | null;
      readonly startsAt: string;
      readonly endsAt: string;
      readonly note: string | null;
    }
  | {
      readonly type: 'step';
      readonly question: string;
      readonly options: readonly { readonly label: string; readonly value: string }[];
      readonly step?: number;
      readonly total?: number;
    }
  | {
      readonly type: 'suggestions';
      readonly items: readonly string[];
    };

/** Eine Adresse, die diese App öffnen darf - nie ein fremdes Ziel. */
export function localBlockHref(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}
