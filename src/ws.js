// src/ws.js - WebSocket Client für Live-Events

// WebSocket-Verbindung (Singleton-Instanz)
// erstellt von: Nick Jokers
let socket = null

// Map für Event-Listener: eventType -> Array von Callback-Funktionen
// erstellt von: Nick Jokers
let eventListeners = new Map()

// === VERBINDUNGSMANAGEMENT ===

/**
 * Stellt eine WebSocket-Verbindung zum Server her.
 * @param {string} url - Die WebSocket-URL (Standard: ws://localhost:3000)
 * @param {string|null} username - Optionaler Benutzername für die Anmeldung
 * @returns {WebSocket} Die WebSocket-Instanz
 * Funktion: Baut die Verbindung auf und registriert den User, falls angegeben.
 * erstellt von: Nick Jokers
 */
export function connectWebSocket(url = 'ws://localhost:3000', username = null) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket
  }

  socket = new WebSocket(url)
  
  socket.onopen = () => {
    console.log('WebSocket verbunden')
    // Bei Verbindung: User registrieren
    if (username) {
      sendEvent('playerJoin', { user: username })
    }
  }
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      handleIncomingEvent(data)
    } catch (error) {
      console.error('Fehler beim Parsen der WebSocket-Nachricht:', error)
    }
  }
  
  socket.onclose = () => {
    console.log('WebSocket-Verbindung geschlossen')
    // KEIN Reconnect!
  }
  
  socket.onerror = (error) => {
    console.error('WebSocket-Fehler:', error)
  }
  
  return socket
}

/**
 * Schließt die WebSocket-Verbindung und entfernt alle Listener.
 * Funktion: Trennt die Verbindung und leert die Event-Listener.
 * erstellt von: Nick Jokers
 */
export function closeWebSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
  eventListeners.clear()
}

// === EVENT-SYSTEM ===

/**
 * Sendet ein Event über die WebSocket-Verbindung.
 * @param {string} type - Event-Typ
 * @param {object} data - Event-Daten (optional)
 * Funktion: Baut ein Event-Objekt und sendet es als JSON.
 * erstellt von: Nick Jokers
 */
export function sendEvent(type, data = {}) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      type,
      ...data,
      timestamp: Date.now()
    }
    socket.send(JSON.stringify(message))
  } else {
    console.warn('WebSocket nicht verbunden - Event kann nicht gesendet werden:', type)
  }
}

/**
 * Registriert einen Callback für ein bestimmtes Event.
 * @param {string} eventType - Event-Typ
 * @param {function} callback - Callback-Funktion
 * Funktion: Fügt den Callback zur Listener-Map hinzu.
 * erstellt von: Nick Jokers
 */
export function onEvent(eventType, callback) {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, [])
  }
  eventListeners.get(eventType).push(callback)
}

/**
 * Entfernt einen Callback für ein bestimmtes Event.
 * @param {string} eventType - Event-Typ
 * @param {function} callback - Zu entfernende Callback-Funktion
 * Funktion: Löscht den Callback aus der Listener-Map.
 * erstellt von: Nick Jokers
 */
export function offEvent(eventType, callback) {
  if (eventListeners.has(eventType)) {
    const callbacks = eventListeners.get(eventType)
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }
}

/**
 * Interne Hilfsfunktion: Verteilt eingehende Events an die registrierten Listener.
 * @param {object} message - Das empfangene Event-Objekt
 * Funktion: Ruft alle zugehörigen Callbacks auf.
 * erstellt von: Nick Jokers
 */
function handleIncomingEvent(message) {
  const { type, ...data } = message
  
  if (eventListeners.has(type)) {
    eventListeners.get(type).forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Fehler beim Verarbeiten des Events ${type}:`, error)
      }
    })
  }
}

// === GAME-SPEZIFISCHE EVENTS ===

/**
 * Sendet das Event "roundStarted" mit Rundendaten.
 * @param {object} roundData - Daten zur neuen Runde
 * erstellt von: Nick Jokers
 */
export function sendNewRoundStarted(roundData) {
  sendEvent('roundStarted', roundData)
}

/**
 * Sendet das Event "roundEnded" mit Rundendaten.
 * @param {object} roundData - Daten zur beendeten Runde
 * erstellt von: Nick Jokers
 */
export function sendRoundEnded(roundData) {
  sendEvent('roundEnded', roundData)
}

/**
 * Registriert einen Callback für das Event "roundStarted".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onRoundStarted(callback) {
  onEvent('roundStarted', callback)
}

/**
 * Registriert einen Callback für das Event "roundEnded".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onRoundEnded(callback) {
  onEvent('roundEnded', callback)
}

/**
 * Sendet das Event "guess" mit Rateversuch und Benutzername.
 * @param {string} guess - Der Rateversuch
 * @param {string} username - Benutzername
 * erstellt von: Nick Jokers
 */
export function sendGuess(guess, username) {
  sendEvent('guess', { guess, user: username, timestamp: Date.now() })
}

/**
 * Registriert einen Callback für das Event "guess".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onGuessSubmitted(callback) {
  onEvent('guess', callback)
}

/**
 * Registriert einen Callback für das Event "newRound".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onNewRound(callback) {
  onEvent('newRound', callback)
}

/**
 * Registriert einen Callback für das Event "playerList".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onPlayerList(callback) {
  onEvent('playerList', callback)
}

/**
 * Registriert einen Callback für das Event "sync".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onSync(callback) {
  onEvent('sync', callback)
}

/**
 * Registriert einen Callback für das Event "error".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onError(callback) {
  onEvent('error', callback)
}

/**
 * Registriert einen Callback für das Event "timer".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onTimerUpdate(callback) {
  onEvent('timer', callback)
}

/**
 * Registriert einen Callback für das Event "userJoined".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onUserJoined(callback) {
  onEvent('userJoined', callback)
}

/**
 * Registriert einen Callback für das Event "userLeft".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onUserLeft(callback) {
  onEvent('userLeft', callback)
}

/**
 * Registriert einen Callback für das Event "gameStateUpdate".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onGameStateUpdate(callback) {
  onEvent('gameStateUpdate', callback)
}

// === HILFSFUNKTIONEN ===

/**
 * Prüft, ob die WebSocket-Verbindung offen ist.
 * @returns {boolean} true, wenn verbunden
 * erstellt von: Nick Jokers
 */
export function isConnected() {
  return socket && socket.readyState === WebSocket.OPEN
}

/**
 * Gibt den aktuellen Verbindungsstatus als String zurück.
 * @returns {string} Status ('CONNECTED', 'DISCONNECTED', etc.)
 * erstellt von: Nick Jokers
 */
export function getConnectionState() {
  if (!socket) return 'DISCONNECTED'
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return 'CONNECTING'
    case WebSocket.OPEN: return 'CONNECTED'
    case WebSocket.CLOSING: return 'CLOSING'
    case WebSocket.CLOSED: return 'DISCONNECTED'
    default: return 'UNKNOWN'
  }
}

/**
 * Legacy: Sendet eine Nachricht (String oder Objekt) als Event.
 * @param {string|object} msg - Die Nachricht
 * erstellt von: Nick Jokers
 */
export function sendMessage(msg) {
  if (typeof msg === 'string') {
    sendEvent('message', { text: msg })
  } else {
    sendEvent(msg.type || 'message', msg)
  }
}

/**
 * Legacy: Registriert einen Callback für das Event "message".
 * @param {function} callback - Callback-Funktion
 * erstellt von: Nick Jokers
 */
export function onMessage(callback) {
  onEvent('message', (data) => {
    callback(JSON.stringify(data))
  })
}