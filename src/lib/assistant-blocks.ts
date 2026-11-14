/*
 * Der UI-Baum, den der Assistent rendern darf.
 *
 * Kein freies HTML und kein Modell-Markup: Der Server prüft jeden Knoten gegen
 * diesen Katalog, ergänzt Domain-Daten aus der Sitzung und schickt nur
 * strukturierte Werte. Der Client baut daraus native Elemente mit den
 * vorhandenen Tokens.
 *
 * Die generischen Knoten sind bewusst klein und agnostisch: Layout, Text,
 * Listen, Tabellen, Kennzahlen, Zeitachse, Details und Links. Die Domain-Knoten
 * (Status, Dienst, Artikel, Wartung, Schritt) sind die Brücke zum Workspace.
 */

export type UiTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' | 'unknown';
export type UiGap = 'none' | 'xs' | 'sm' | 'md' | 'lg';
export type UiTextVariant = 'body' | 'small' | 'muted' | 'lead';
export type UiCardTone = 'default' | 'subtle' | 'accent';

export type AssistantBlock =
  | {
      readonly type: 'summary';
      readonly tone: 'ok' | 'warn' | 'unknown';
      readonly title: string;
      readonly text: string;
      readonly asOf: number | null;
      readonly href: string;
    }
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
      readonly type: 'media';
      readonly tmdbId: number;
      readonly mediaType: 'movie' | 'tv';
      readonly title: string;
      readonly posterPath: string | null;
      readonly backdropPath: string | null;
      readonly rating: number | null;
      readonly year: string | null;
      readonly overview: string;
      readonly releaseDate: string | null;
      readonly runtime: number | null;
      readonly tagline: string | null;
      readonly genres: readonly string[];
      readonly director: string | null;
      readonly cast: readonly { readonly name: string; readonly character: string | null }[];
      readonly voteCount: number | null;
      readonly numberOfSeasons: number | null;
      readonly numberOfEpisodes: number | null;
      readonly seasons: readonly { readonly seasonNumber: number; readonly name: string; readonly episodeCount: number | null; readonly airDate: string | null }[];
      readonly trailerKey: string | null;
      readonly status: 'available' | 'requested' | 'processing' | 'partial' | 'unknown' | 'blocklisted';
      readonly statusText: string;
      readonly requestable: boolean;
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
      readonly type: 'confirm';
      readonly proposalId: string;
      readonly tmdbId: number;
      readonly mediaType: 'movie' | 'tv';
      readonly seasons?: readonly number[];
      readonly title: string;
      readonly mediaTitle: string;
      readonly year: string | null;
      readonly statusText: string;
      readonly posterPath: string | null;
      readonly backdropPath: string | null;
      readonly rating: number | null;
      readonly description: string;
      readonly items: readonly { readonly label: string; readonly value: string }[];
      readonly confirmLabel: string;
      readonly cancelLabel: string;
      readonly tone?: UiTone;
    }
  | {
      readonly type: 'suggestions';
      readonly items: readonly string[];
    }
  | {
      readonly type: 'stack';
      readonly gap?: UiGap;
      readonly children: readonly AssistantBlock[];
    }
  | {
      readonly type: 'grid';
      readonly columns?: 1 | 2 | 3;
      readonly gap?: UiGap;
      readonly children: readonly AssistantBlock[];
    }
  | {
      readonly type: 'card';
      readonly title?: string;
      readonly description?: string;
      readonly tone?: UiCardTone;
      readonly children: readonly AssistantBlock[];
    }
  | {
      readonly type: 'section';
      readonly title?: string;
      readonly description?: string;
      readonly children: readonly AssistantBlock[];
    }
  | {
      readonly type: 'text';
      readonly value: string;
      readonly variant?: UiTextVariant;
    }
  | {
      readonly type: 'heading';
      readonly value: string;
      readonly level?: 2 | 3 | 4;
    }
  | {
      readonly type: 'list';
      readonly items: readonly string[];
      readonly ordered?: boolean;
    }
  | {
      readonly type: 'keyValue';
      readonly items: readonly { readonly label: string; readonly value: string }[];
    }
  | {
      readonly type: 'badge';
      readonly label: string;
      readonly tone?: UiTone;
    }
  | {
      readonly type: 'callout';
      readonly tone?: UiTone;
      readonly title?: string;
      readonly text: string;
    }
  | {
      readonly type: 'divider';
    }
  | {
      readonly type: 'progress';
      readonly label: string;
      readonly value: number;
      readonly max?: number;
      readonly tone?: UiTone;
      readonly hint?: string;
    }
  | {
      readonly type: 'chart';
      readonly kind: 'bar' | 'sparkline';
      readonly label?: string;
      readonly points: readonly { readonly label: string; readonly value: number }[];
      readonly max?: number;
      readonly tone?: UiTone;
      readonly hint?: string;
    }
  | {
      readonly type: 'stat';
      readonly label: string;
      readonly value: string;
      readonly hint?: string;
      readonly tone?: UiTone;
    }
  | {
      readonly type: 'timeline';
      readonly items: readonly {
        readonly time: string;
        readonly title: string;
        readonly text?: string;
        readonly tone?: UiTone;
      }[];
    }
  | {
      readonly type: 'table';
      readonly columns: readonly { readonly key: string; readonly label: string }[];
      readonly rows: readonly Readonly<Record<string, string>>[];
    }
  | {
      readonly type: 'details';
      readonly summary: string;
      readonly children: readonly AssistantBlock[];
    }
  | {
      readonly type: 'link';
      readonly label: string;
      readonly href: string;
    };

/** Ein UI-Baum ist dieselbe Form wie ein Block; der Name macht die Absicht klar. */
export type UiNode = AssistantBlock;

/** Eine Adresse, die diese App öffnen darf - nie ein fremdes Ziel. */
export function localBlockHref(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}
