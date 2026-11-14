/*
 * Server-Sent Events, einmal gelesen.
 *
 * Dieselbe kleine Zustandsmaschine liest den Strom des Anbieters und den Strom,
 * den diese App an den Browser schickt. Sie kennt nur Rahmen und Felder; was
 * in `data` steht, entscheidet der Aufrufer.
 *
 * Absichtlich kein `EventSource`: der Assistent braucht einen POST mit
 * Nachrichtenverlauf, und `EventSource` kann nur GET.
 */

export interface SseEvent {
  readonly event: string;
  readonly data: string;
}

export class SseParser {
  private buffer = '';
  private readonly onEvent: (event: SseEvent) => void;

  constructor(onEvent: (event: SseEvent) => void) {
    this.onEvent = onEvent;
  }

  /** Fügt ein Stück Text hinzu und meldet alle vollständigen Blöcke. */
  push(chunk: string): void {
    this.buffer += chunk;

    for (;;) {
      const separator = /\r?\n\r?\n/.exec(this.buffer);
      if (!separator) return;
      const block = this.buffer.slice(0, separator.index);
      this.buffer = this.buffer.slice(separator.index + separator[0].length);
      this.emit(block);
    }
  }

  /** Meldet einen Rest ohne abschließende Leerzeile - nur beim echten Ende. */
  end(): void {
    if (this.buffer.trim() !== '') this.emit(this.buffer);
    this.buffer = '';
  }

  private emit(block: string): void {
    let event = 'message';
    const data: string[] = [];

    for (const raw of block.split(/\r?\n/)) {
      if (raw === '' || raw.startsWith(':')) continue;

      const colon = raw.indexOf(':');
      const field = colon === -1 ? raw : raw.slice(0, colon);
      let value = colon === -1 ? '' : raw.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);

      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }

    // Ein Block ohne `data` ist ein Kommentar oder eine Heartbeat-Zeile.
    if (data.length > 0) this.onEvent({ event, data: data.join('\n') });
  }
}
