/*
 * Die deutschen Texte - die Quelle der Schlüssel.
 *
 * `en.ts` ist auf `keyof typeof de` typisiert, deshalb kann eine fehlende
 * Übersetzung den Bau nicht überleben. Ein Text steht genau einmal je Sprache;
 * im Markup steht nur ein Schlüssel.
 */

export const de = {
  siteTitle: 'VYRX',
  siteDescription: 'Ein privater digitaler Raum für Familie und Freunde.',
  skipToContent: 'Zum Inhalt springen',
  brandHome: 'VYRX — Startseite',
  languageSwitch: 'Sprache',
  themeSwitch: 'Darstellung',
  back: 'Zurück',

  // Öffentliche Navigation
  navProject: 'Projekt',
  navHelp: 'Hilfe',
  navWorkspace: 'Zum Workspace',
  openWorkspace: 'Workspace öffnen',

  // Einstieg
  heroEyebrow: 'Privater digitaler Raum',
  heroTitleLead: 'Alles an einem',
  heroTitleAccent: 'Ort.',
  heroIntro:
    'Deine Anwendungen und Informationen an einem Ort. Für Familie und Freunde – mit genau den Angeboten, die für dich freigegeben sind.',
  heroPrimary: 'Workspace ansehen',
  heroSecondary: 'Neu hier? So funktioniert der Zugang',
  atlasLabel: 'System-Atlas',
  atlasScope: 'Home · Cloud · Mesh',
  atlasHome: 'Zuhause',
  atlasHomeNote: 'Ein flaches LAN',
  atlasCloud: 'Cloud',
  atlasCloudNote: 'Zwei Hosts',
  atlasRoaming: 'Unterwegs',
  atlasMeshLabel: 'WireGuard',
  atlasMeshNote: 'Verbindendes Mesh',
  atlasTagline: 'Verteilt betrieben. Gemeinsam genutzt.',
  atlasNote: 'Abstraktion · kein Netzplan oder Live-Status',
  atlasAlt: 'Hand, Cloud und Mesh – verbunden über ein gemeinsames Overlay',
  atlasProject: 'Projekt',
  examplesLabel: 'Beispiele aus dem Katalog',
  example1Number: '01 / Zuhause',
  example1Title: 'Dein Zuhause im Blick.',
  example1Text: 'Hausautomation und Sensoren an einem vertrauten Ort öffnen.',
  example2Number: '02 / Medien',
  example2Title: 'Wünsche einfach äußern.',
  example2Text: 'Filme und Serien anfragen, ohne den passenden Dienst suchen zu müssen.',
  example3Number: '03 / Alltag',
  example3Title: 'Rezepte wiederfinden.',
  example3Text: 'Gemeinsam kochen und planen – mit der entsprechenden Freigabe.',
  footerLine: 'VYRX / Ein digitaler Raum für Familie und Freunde',
  footerSecurity: 'Sicherheit',

  // Projekt
  projectEyebrow: 'VYRX / Das Projekt',
  projectTitle: 'Infrastruktur, die im Alltag verschwindet.',
  projectIntro:
    'VYRX ist ein privater digitaler Raum für Familie und Freunde – und ein fortlaufendes Projekt über die Frage, wie verteilte Dienste verständlich, wartbar und verlässlich werden.',
  projectTaskOverline: '01 / Die Aufgabe',
  projectTaskTitle: 'Viele Systeme. Ein Zugang.',
  projectTaskBody1:
    'Anwendungen laufen nicht zwangsläufig am selben Ort. Für die Menschen, die sie nutzen, soll daraus trotzdem ein einfacher Einstieg werden – ohne dass sie sich mit Hosts, Netzen und Diensten beschäftigen müssen.',
  projectTaskBody2:
    'Das Portal ist deshalb nicht das System selbst. Es verbindet die vorhandenen Angebote, erklärt ihren Zustand und führt an den richtigen Ort.',
  projectApproachOverline: '02 / Der Ansatz',
  projectApproachTitle: 'Eine Quelle pro Wahrheit.',
  projectApproachBody:
    'Konfiguration und Dienstverträge beschreiben, was existieren soll. Identität entscheidet über Zugang; Beobachtung beantwortet, was tatsächlich erreichbar ist. Die Oberfläche übersetzt diese Informationen in verständliche Wege – ohne nebenbei ein zweites Konfigurationssystem zu werden.',
  projectLayerDeclaration: 'Deklaration',
  projectLayerDeclarationNote: 'Gewünschter Zustand und Verträge',
  projectLayerAccess: 'Zugang',
  projectLayerAccessNote: 'Identität und Berechtigung',
  projectLayerOffers: 'Angebote',
  projectLayerOffersNote: 'Anwendungen und Inhalte',
  projectLayerObservation: 'Beobachtung',
  projectLayerObservationNote: 'Zustand und Abweichung',
  projectTradeoffOverline: '03 / Die Abwägung',
  projectTradeoffTitle: 'Weniger Kontrolle, mehr Klarheit.',
  projectTradeoffBody1:
    'Ein Portal könnte jede Änderung selbst durchführen. VYRX trennt bewusst das Verstehen vom dauerhaften Ändern: Betrieb bleibt nachvollziehbar, der Alltagszugang bleibt einfach, und die Konfiguration hat eine eindeutige Quelle.',
  projectTradeoffBody2:
    'Diese Darstellung ist ein redaktioneller Text – kein aktueller Nachweis über Verfügbarkeit, Schutzmaßnahmen oder den vollständigen Ausbau des Systems.',

  // Hilfe
  helpEyebrow: 'VYRX / Öffentliche Hilfe',
  helpTitle: 'Neu hier? Wir helfen beim Einstieg.',
  helpIntro:
    'Die wichtigsten Antworten, bevor du dich anmeldest. Anleitungen zu einzelnen Anwendungen findest du später im Workspace.',
  helpStep1Overline: '01 / Zugang',
  helpStep1Title: 'Einladung erhalten',
  helpStep1Text:
    'VYRX ist ein privater Raum. Deinen Zugang erhältst du von der Person, die dich eingeladen hat – nicht durch eine öffentliche Registrierung.',
  helpStep2Overline: '02 / Anmelden',
  helpStep2Title: 'Workspace öffnen',
  helpStep2Text:
    'Nutze den Einstieg auf dieser Seite. Nach der Anmeldung findest du die Anwendungen, die für dich freigegeben sind.',
  helpStep3Overline: '03 / Orientieren',
  helpStep3Title: 'Deine Dinge finden',
  helpStep3Text:
    'Im Workspace stehen deine zuletzt genutzten Angebote. Unter „Anwendungen“ findest du den gesamten für dich sichtbaren Katalog.',
  helpFaqTitle: 'Häufige Fragen',
  helpFaq1Q: 'Ich habe noch keinen Zugang. Was kann ich tun?',
  helpFaq1A:
    'Bitte wende dich an die Person, die dich zu VYRX eingeladen hat. Diese Seite bietet bewusst keine öffentliche Selbstregistrierung und kein unbetreutes Kontaktformular.',
  helpFaq2Q: 'Eine Anwendung lässt sich nicht öffnen.',
  helpFaq2A:
    'Prüfe zuerst, ob du angemeldet bist. Wenn du Zugriff hast, findest du im Workspace den Status. Funktioniert schon die Anmeldung nicht, wende dich an die einladende Person.',
  helpFaq3Q: 'Was sehe ich nach der Anmeldung?',
  helpFaq3A:
    'Nur Angebote, für die du berechtigt bist. Die Auswahl kann sich von der einer anderen Person unterscheiden; technische Betriebsdetails gehören nicht zum normalen Einstieg.',

  // Werkzeugleiste
  navOverview: 'Übersicht',
  navServices: 'Anwendungen',
  navKnowledge: 'Wissen',
  navStatus: 'Status',
  navAccount: 'Konto',
  navAdmin: 'Verwaltung',
  workspaceLabel: 'Workspace',
  logout: 'Abmelden',
  menu: 'Menü',
  yourAccess: 'Dein Zugang',
  personalSpace: 'Persönlicher Bereich',

  // Übersicht
  overviewEyebrow: 'Dein Workspace / Übersicht',
  overviewGreeting: 'Willkommen zurück, {name}.',
  overviewIntro: 'Hier findest du, was du regelmäßig brauchst.',
  overviewRecent: 'Für dich freigegeben',
  overviewAllServices: 'Alle Anwendungen',
  overviewEmpty: 'Für deinen Zugang ist noch kein Angebot freigegeben.',
  overviewEmptyHint: 'Wende dich an die Person, die deinen Zugang eingerichtet hat.',

  // Erste Schritte
  firstStepsTitle: 'Erste Schritte',
  firstStepsServices: 'Anwendungen öffnen',
  firstStepsServicesHint: '{count} Angebote sind für dich freigegeben.',
  firstStepsKnowledge: 'Eine Anleitung finden',
  firstStepsKnowledgeHint: '{count} Artikel stehen bereit.',
  firstStepsHelp: 'Wenn etwas fehlt',
  firstStepsHelpText: 'Wende dich an die Person, die deinen Zugang eingerichtet hat.',

  // Anwendungen
  servicesEyebrow: 'Dein Workspace / Anwendungen',
  servicesTitle: 'Alles, was du nutzen kannst.',
  servicesIntro: 'Finden, öffnen, weitermachen – ohne Infrastruktur-Vokabular.',
  servicesSearchPlaceholder: 'Anwendungen suchen …',
  servicesCategoryAll: 'Alle',
  servicesEmpty: 'Keine Anwendung passt zu deiner Suche.',
  servicesEmptyAccess: 'Für deinen Zugang ist kein Angebot sichtbar.',
  servicesOpen: 'Öffnen',
  catalogAbsent:
    'Für diesen Bau liegt keine Katalog-Projektion vor. Die Angebote erscheinen, sobald sie ausgerollt ist.',
  scopePublic: 'Öffentlich',
  scopeInternal: 'Nur im Heimnetz',
  scopeMesh: 'Über das Mesh',
  scopeIsolated: 'Abgeschottet',

  // Dienst
  serviceEyebrow: 'Anwendung',
  serviceBack: 'Alle Anwendungen',
  serviceAccess: 'Zugang',
  serviceState: 'Zustand',
  serviceOpen: 'In der Anwendung öffnen',
  serviceGuides: 'Anleitungen',
  serviceDetailTitle: 'Was der Dienst über sich sagt',
  serviceDetailUnavailable: 'Der Dienst antwortet gerade nicht auf diese Frage.',
  serviceDetailUnauthorized: 'Für diese Abfrage fehlt der Zugang.',
  serviceDetailUnsupported: 'Für diesen Dienst ist keine Abfrage hinterlegt.',
  serviceDetailMissing: 'nicht in der Antwort',
  serviceListEmpty: 'Keine Einträge.',

  // Aktionen
  serviceActions: 'Aktionen',
  actionResultAccepted: 'Angestoßen. Ob es gewirkt hat, sagt die nächste Messung – nicht diese Antwort.',
  actionResultRefused: 'Nicht ausgeführt: dir fehlt das Recht für diesen Dienst.',
  actionResultFailed: 'Der Dienst hat abgelehnt oder nicht geantwortet.',
  actionResultUnsupported: 'Diese Aktion ist für den Dienst nicht angebunden.',
  outcomeAccepted: 'Angestoßen',
  outcomeRefused: 'Abgelehnt',
  outcomeFailed: 'Fehlgeschlagen',
  adminActions: 'Letzte Eingriffe',
  adminActionsNone: 'Keine Eingriffe verzeichnet.',
  serviceDetailAsOf: 'Stand {time}',
  serviceHistory: 'Verlauf der letzten 24 Stunden',
  serviceHistoryNone: 'Keine Zustandswechsel in den letzten 24 Stunden.',
  serviceNoGuides: 'Für diese Anwendung gibt es noch keine Anleitung.',
  serviceUnknownTitle: 'Diese Anwendung gibt es hier nicht.',
  serviceUnknownBody: 'Entweder ist der Name falsch, oder die Anwendung ist für deinen Zugang nicht freigegeben.',

  // Wissen
  knowledgeEyebrow: 'Dein Workspace / Wissen',
  knowledgeTitle: 'Wissen, das weiterhilft.',
  knowledgeIntro: 'Fragen stellen, Themen entdecken, Zusammenhänge verstehen.',
  knowledgeSearchPlaceholder: 'Wonach suchst du?',
  knowledgeTopics: 'Themen entdecken',
  knowledgeAllTopics: 'Alle Themen',
  knowledgeFind: 'Antworten finden',
  knowledgeAllArticles: 'Alle Artikel',
  knowledgeSubtitle: 'Zum Durchstöbern oder gezielt Suchen',
  knowledgeEmpty: 'Keine passende Antwort. Versuche einen anderen Begriff.',
  knowledgeReset: 'Suche und Themenwahl zurücksetzen',
  knowledgeBack: 'Zur Wissensübersicht',
  knowledgeContextTitle: 'Im Kontext',
  knowledgeContextText: 'Passende Artikel zu dieser Anwendung.',
  knowledgeRelated: 'Das könnte auch helfen',
  knowledgeTechnical: 'Technischer Hintergrund',
  knowledgeOnThisPage: 'Auf dieser Seite',
  knowledgePrint: 'Artikel drucken',
  knowledgeReadTime: 'Lesen · ca. {min} Min',
  knowledgeUpdated: 'Zuletzt geprüft',
  knowledgeUpdatedUnknown: 'Noch nicht geprüft',
  knowledgeKindGuide: 'Anleitung',
  knowledgeKindExplanation: 'Erklärung',
  knowledgeKindTroubleshooting: 'Problemlösung',
  knowledgeKindReference: 'Referenz',
  knowledgeVisibilityPublic: 'Öffentlich',
  knowledgeVisibilityInternal: 'Intern',
  knowledgeOutcomeLabel: 'Das erreichst du',
  knowledgeNotFoundTitle: 'Diesen Artikel gibt es nicht.',
  knowledgeNotFoundBody: 'Vielleicht ist die Adresse falsch, oder der Artikel ist nicht freigegeben.',

  // Status
  statusEyebrow: 'Dein Workspace / Status',
  statusTitle: 'Was funktioniert gerade?',
  statusIntro: 'Erst die Wirkung für dich, danach technische Einzelheiten.',
  statusYourServices: 'Deine Anwendungen',
  statusAsOf: 'Stand {time}',
  statusNever: 'Noch keine Messung',
  statusSourceNote: 'Gemessen am Kollektor. „Unbekannt“ ist ein eigener Zustand – nicht „ausgefallen“.',
  statusUnreachable: 'Die Messung ist gerade nicht erreichbar.',
  statusRetry: 'Erneut prüfen',
  statusAllOk: 'Alle geprüften Angebote antworten.',
  statusSomeDown: 'Mindestens ein Angebot antwortet nicht.',
  statusUnknown: 'Der aktuelle Zustand ist unbekannt.',
  stateUp: 'Erreichbar',
  stateDown: 'Nicht erreichbar',
  stateUnknown: 'Unbekannt',
  stateUnmonitored: 'Nicht überwacht',

  // Konto
  accountEyebrow: 'Dein Workspace / Konto',
  accountTitle: 'Dein Zugang.',
  accountIntro: 'Weniger technische Metadaten. Klare Wege zu deinen Einstellungen.',
  accountIdentity: 'Angemeldet als',
  accountGroups: 'Deine Freigaben',
  accountGroupsEmpty: 'Keiner Gruppe zugeordnet.',
  accountSecurity: 'Sicherheit und Anmeldung',
  accountSecurityHint: 'Zugang und Geräte verwaltest du im Identitätsanbieter.',
  accountManage: 'Zugang verwalten',

  // Verwaltung
  adminEyebrow: 'Verwaltung',
  adminTitle: 'Betrieb auf einen Blick.',
  adminIntro: 'Abweichungen zuerst, nicht noch einmal derselbe Katalog.',
  adminForbidden: 'Für diese Ansicht fehlt dir die Berechtigung.',
  adminRevision: 'Ausgelieferte Konfiguration',
  adminRevisionNote: 'Die Projektion stammt aus der Nix-Konfiguration. Gebaut ist nicht ausgerollt.',
  adminGenerated: 'Erzeugt',
  adminServices: 'Dienste',
  adminCategories: 'Kategorien',
  adminPeople: 'Deine Gruppen',

  // Aufmerksamkeit und Register
  adminAttention: 'Was Aufmerksamkeit braucht',
  adminAttentionNone: 'Nichts auffällig.',
  adminServiceDown: '{name} ist nicht erreichbar.',
  adminBackupOverdue: 'Sicherung überfällig: {target} (vor {hours} h)',
  adminBackupFailed: 'Sicherung fehlgeschlagen: {target}',
  adminCertExpiring: 'Zertifikat läuft in {days} Tagen ab: {name}',
  adminCertExpired: 'Zertifikat ist abgelaufen: {name}',
  adminTreeFailed: 'Der letzte Prüflauf ist fehlgeschlagen.',
  adminBackups: 'Sicherungen',
  adminCertificates: 'Zertifikate',
  adminTree: 'Baum',
  adminAgoHours: 'vor {hours} h',
  adminDaysLeft: 'noch {days} Tage',
  adminDaysAgo: 'vor {days} Tagen',
  adminOpsAbsent: 'Für diesen Bau liegt keine Betriebsquelle vor.',
  adminTreeLastCheck: 'Letzter Prüflauf',
  adminTreeLastDeploy: 'Letzte Auslieferung',

  // Wartungsfenster
  windowsTitle: 'Geplante Arbeiten',
  windowsNone: 'Keine geplanten Arbeiten.',
  windowsFrom: 'Von',
  windowsTo: 'Bis',
  windowsNote: 'Notiz (optional)',
  windowsAll: 'Alle Angebote',
  windowsAdd: 'Fenster setzen',
  windowsRemove: 'Entfernen',
  windowsInvalid: 'Bitte ein Ende nach dem Beginn angeben.',
  windowsSet: 'Das Fenster ist gesetzt.',
  windowsPlannedFor: 'Geplante Arbeit: {what} · {from} bis {until}',
  windowsUntil: 'bis {until}',

  // Revision und Zustände
  revisionUnknown: 'unbekannt',
  loading: 'Wird geladen …',
  before: 'Vorherige',
  next: 'Nächste',
  close: 'Schließen',
  notFoundTitle: 'Diese Seite gibt es nicht.',
  notFoundBody: 'Vielleicht ist die Adresse falsch, oder der Inhalt wurde verschoben.',
  notFoundAction: 'Zur Startseite',

  // Favoriten
  favoriteAdd: 'Merken',
  favoriteRemove: 'Nicht mehr merken',
  favoritesTitle: 'Favoriten',
  favoritesEmpty: 'Noch nichts gemerkt. Mit dem Stern an einem Angebot legst du es hierher.',

  // Suche
  paletteOpen: 'Suchen',
  paletteTitle: 'Suchen',
  palettePlaceholder: 'Anwendungen, Wissen, Seiten …',
  paletteEmpty: 'Nichts gefunden. Versuche einen anderen Begriff.',
  paletteServices: 'Anwendungen',
  paletteKnowledge: 'Wissen',
  paletteNavigation: 'Seiten',
  paletteHint: 'Pfeiltasten wählen, Eingabe öffnet, Escape schließt',

  // Ankündigungen
  newsTitle: 'Aktuelles',

  // Anliegen
  reportTitle: 'Etwas funktioniert nicht?',
  reportLead:
    'Beschreibe kurz, was nicht geht. Die Meldung geht an die Person, die deinen Zugang eingerichtet hat – mit Zeitpunkt und deiner Sicht.',
  reportLabel: 'Was ist passiert?',
  reportPlaceholder: 'Zum Beispiel: Die Mediathek lädt seit heute Morgen nicht.',
  reportForService: 'Betrifft welches Angebot? (optional)',
  reportNoService: 'Kein bestimmtes Angebot',
  reportSubmit: 'Meldung senden',
  reportSent: 'Danke, deine Meldung ist angekommen.',
  reportsTitle: 'Deine Meldungen',
  reportsEmpty: 'Du hast noch nichts gemeldet.',
  reportOpen: 'Offen',
  reportDone: 'Erledigt',

  // Eigene Rechte
  rightsTitle: 'Was deine Freigaben öffnen',
  rightsNote: 'Gruppen entscheiden, welche Angebote du siehst. Sie werden außerhalb dieses Portals verwaltet.',
  rightsNoServices: 'Deine Gruppen öffnen derzeit kein Angebot.',
  rightsEveryone: 'Alle angemeldeten Personen',
  reportTooShort: 'Bitte beschreibe kurz, was passiert ist.',
} as const;

export type Messages = typeof de;
export type MessageKey = keyof Messages;
