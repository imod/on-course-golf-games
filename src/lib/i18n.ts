/**
 * A small, typed dictionary — not an i18n library. ~90 UI strings live here,
 * looked up by key. Catalog data (challenge names, player names) is never
 * looked up here: it renders exactly as typed in /admin, in both languages.
 */
export type Locale = 'de' | 'en'

export const LOCALE_COOKIE = 'locale'

const en = {
  appTitle: 'On-course games',
  appTitleLine1: 'On-course',
  appTitleLine2: 'games',
  newRound: 'New round',
  played: 'Played',
  noRoundsYet: 'No rounds yet.',
  inPlay: 'In play',
  admin: 'Admin',
  backToRounds: 'All rounds',

  whereLabel: 'Where',
  flightLabel: 'Flight',
  gamesLabel: 'Games',
  holesPlaceholder: 'all holes — or 3, 7, 12, 16',
  holesForLabel: (challengeName: string) => `Holes for ${challengeName}`,
  invalidHoles: (tokens: string) => `Not a hole number, ignored: ${tokens}`,
  enterHousePassword: 'Enter the house password in Admin first.',
  couldNotStartRound: 'Could not start the round.',
  couldNotReachServer: 'Could not reach the server. Check your connection and try again.',
  startRound: 'Start round',

  playersCount: (n: number) => `${n} players`,
  finishedSuffix: 'finished',
  previousHole: 'Previous hole',
  nextHole: 'Next hole',
  hole: 'Hole',
  clearChallengeOnHole: (challengeName: string) => `Clear ${challengeName} on this hole`,
  saveChallenge: (challengeName: string) => `Save ${challengeName}`,
  couldNotSaveTryAgain: 'Could not save that. Try again.',
  couldNotFinishTryAgain: 'Could not finish the round. Try again.',
  tiesNotAllowed: (challengeName: string) => `Ties are not allowed for ${challengeName}.`,
  standings: 'Standings',
  finishLockWarning: 'Finishing locks this round. Nobody can add or correct a result afterwards.',
  yesFinishRound: 'Yes, finish round',
  keepPlaying: 'Keep playing',
  finishRound: 'Finish round',

  housePassword: 'House password',
  unlock: 'Unlock',
  wrongPassword: 'Wrong password.',
  networkError: 'Network error — could not reach the server. Check your connection and try again.',
  gamesAndPlayers: 'Games & players',
  adminHint: 'Edits here apply to future rounds only — every round keeps the settings it started with.',
  perHole: 'per hole',
  perRound: 'per round',
  archive: 'Archive',
  restore: 'Restore',
  newPlayerPlaceholder: 'New player',
  newPlayerLabel: 'New player name',
  add: 'Add',

  newChallengeNamePlaceholder: 'New game',
  newChallengeNameLabel: 'Game name',
  newChallengePointsPlaceholder: 'points, highest first — e.g. 3, 2, 1',
  newChallengePointsLabel: 'Points, highest first',
  invalidPoints: (tokens: string) => `Not a whole number, fix before adding: ${tokens}`,
  perHoleOption: 'Per hole',
  perRoundOption: 'Per round',
  allowTiesLabel: 'Allow ties',
  addGame: 'Add game',

  roundsHeading: 'Rounds',
  deleteRound: 'Delete',
  confirmDeleteRound: (roundName: string) =>
    `Delete “${roundName}” for good? Its results cannot be recovered.`,
  yesDeleteRound: 'Yes, delete',
  cancel: 'Cancel',
  couldNotDeleteRound: 'Could not delete that round. Try again.',

  switchLanguage: 'Switch language',
}

// Swiss written German: 'ss', never 'ß'.
const de: Dict = {
  appTitle: 'Platzspiele',
  appTitleLine1: 'Platz-',
  appTitleLine2: 'spiele',
  newRound: 'Neue Runde',
  played: 'Gespielt',
  noRoundsYet: 'Noch keine Runden.',
  inPlay: 'Läuft',
  admin: 'Admin',
  backToRounds: 'Alle Runden',

  whereLabel: 'Wo',
  flightLabel: 'Flight',
  gamesLabel: 'Spiele',
  holesPlaceholder: 'alle Löcher — oder 3, 7, 12, 16',
  holesForLabel: (challengeName: string) => `Löcher für ${challengeName}`,
  invalidHoles: (tokens: string) => `Keine Lochnummer, ignoriert: ${tokens}`,
  enterHousePassword: 'Zuerst das Passwort im Admin-Bereich eingeben.',
  couldNotStartRound: 'Runde konnte nicht gestartet werden.',
  couldNotReachServer: 'Server nicht erreichbar. Verbindung prüfen und nochmals versuchen.',
  startRound: 'Runde starten',

  playersCount: (n: number) => `${n} Spieler`,
  finishedSuffix: 'beendet',
  previousHole: 'Vorheriges Loch',
  nextHole: 'Nächstes Loch',
  hole: 'Loch',
  clearChallengeOnHole: (challengeName: string) => `${challengeName} auf diesem Loch löschen`,
  saveChallenge: (challengeName: string) => `${challengeName} speichern`,
  couldNotSaveTryAgain: 'Runde konnte nicht gespeichert werden. Nochmals versuchen.',
  couldNotFinishTryAgain: 'Runde konnte nicht beendet werden. Nochmals versuchen.',
  tiesNotAllowed: (challengeName: string) => `Bei ${challengeName} sind keine Gleichstände möglich.`,
  standings: 'Spielstand',
  finishLockWarning: 'Beenden sperrt diese Runde endgültig. Niemand kann danach noch etwas eintragen oder korrigieren.',
  yesFinishRound: 'Ja, Runde beenden',
  keepPlaying: 'Weiterspielen',
  finishRound: 'Runde beenden',

  housePassword: 'Passwort',
  unlock: 'Entsperren',
  wrongPassword: 'Falsches Passwort.',
  networkError: 'Netzwerkfehler — Server nicht erreichbar. Verbindung prüfen und nochmals versuchen.',
  gamesAndPlayers: 'Spiele & Spieler',
  adminHint: 'Änderungen hier gelten nur für künftige Runden — jede Runde behält die Einstellungen, mit denen sie gestartet wurde.',
  perHole: 'pro Loch',
  perRound: 'pro Runde',
  archive: 'Archivieren',
  restore: 'Wiederherstellen',
  newPlayerPlaceholder: 'Neuer Spieler',
  newPlayerLabel: 'Name des neuen Spielers',
  add: 'Hinzufügen',

  newChallengeNamePlaceholder: 'Neues Spiel',
  newChallengeNameLabel: 'Name des Spiels',
  newChallengePointsPlaceholder: 'Punkte, höchste zuerst — z. B. 3, 2, 1',
  newChallengePointsLabel: 'Punkte, höchste zuerst',
  invalidPoints: (tokens: string) => `Keine ganze Zahl, bitte korrigieren: ${tokens}`,
  perHoleOption: 'Pro Loch',
  perRoundOption: 'Pro Runde',
  allowTiesLabel: 'Gleichstände erlauben',
  addGame: 'Spiel hinzufügen',

  roundsHeading: 'Runden',
  deleteRound: 'Löschen',
  confirmDeleteRound: (roundName: string) =>
    `«${roundName}» endgültig löschen? Die Resultate sind danach weg.`,
  yesDeleteRound: 'Ja, löschen',
  cancel: 'Abbrechen',
  couldNotDeleteRound: 'Runde konnte nicht gelöscht werden. Nochmals versuchen.',

  switchLanguage: 'Sprache wechseln',
}

/** The German dictionary must carry exactly the keys and shapes of English. */
export type Dict = typeof en

const dictionaries: Record<Locale, Dict> = { en, de }

export function getDict(locale: Locale): Dict {
  return dictionaries[locale]
}

/**
 * First visit, no cookie yet: German unless the browser clearly prefers
 * English. Only the top-ranked language tag is consulted.
 */
export function detectLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return 'de'

  const top = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const q = qParam ? Number(qParam.trim().slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 }
    })
    .sort((a, b) => b.q - a.q)[0]

  return top?.tag.startsWith('en') ? 'en' : 'de'
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'de' || value === 'en'
}

/** Dates render `12.09.2026` in de-CH, `12/09/2026` in en-GB. */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-CH' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
