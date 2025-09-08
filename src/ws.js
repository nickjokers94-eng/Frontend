// WebSocket Client für Game Server

let socket = null
let reconnectAttempts = 0
const maxReconnectAttempts = 5
let eventListeners = new Map()

// === VERBINDUNGSMANAGEMENT ===

export function connectWebSocket(url = 'ws://localhost:3000', username = null) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket
  }

  socket = new WebSocket(url)
  
  socket.onopen = () => {
    console.log('WebSocket verbunden')
    reconnectAttempts = 0
    
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
    attemptReconnect(url, username)
  }
  
  socket.onerror = (error) => {
    console.error('WebSocket-Fehler:', error)
  }
  
  return socket
}

function attemptReconnect(url, username) {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++
    console.log(`Reconnect-Versuch ${reconnectAttempts}/${maxReconnectAttempts}`)
    setTimeout(() => {
      connectWebSocket(url, username)
    }, 3000 * reconnectAttempts)
  }
}

export function closeWebSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
  eventListeners.clear()
}

// === EVENT-SYSTEM ===

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

export function onEvent(eventType, callback) {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, [])
  }
  eventListeners.get(eventType).push(callback)
}

export function offEvent(eventType, callback) {
  if (eventListeners.has(eventType)) {
    const callbacks = eventListeners.get(eventType)
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }
}

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

// === GAME-SPEZIFISCHE EVENTS (passend zu deinem Server) ===

// Server -> Client Events (Events die dein Server sendet)
export function onWelcome(callback) {
  onEvent('welcome', callback)
}

export function onNewRound(callback) {
  onEvent('newRound', callback)
}

export function onRoundEnded(callback) {
  onEvent('roundEnded', callback)
}

export function onTimer(callback) {
  onEvent('timer', callback)
}

export function onGuess(callback) {
  onEvent('guess', callback)
}

export function onCorrectGuess(callback) {
  onEvent('correctGuess', callback)
}

export function onPlayerList(callback) {
  onEvent('playerList', callback)
}

export function onSync(callback) {
  onEvent('sync', callback)
}

export function onUserJoined(callback) {
  onEvent('userJoined', callback)
}

export function onUserLeft(callback) {
  onEvent('userLeft', callback)
}

export function onError(callback) {
  onEvent('error', callback)
}

export function onPong(callback) {
  onEvent('pong', callback)
}

// Client -> Server Events (Events die dein Server erwartet)
export function sendGuess(guess, username) {
  sendEvent('guess', { guess, user: username })
}

export function sendPlayerJoin(username) {
  sendEvent('playerJoin', { user: username })
}

export function requestSync() {
  sendEvent('requestSync', {})
}

export function sendPing() {
  sendEvent('ping', {})
}

// === ZUSÄTZLICHE FUNKTIONEN FÜR DEINEN SERVER ===

// Spezielle Funktionen basierend auf deinem Server-Code
export function getGameState() {
  requestSync()
}

export function onGameStateUpdate(callback) {
  onEvent('sync', callback)
}

// Timer-spezifische Funktionen
export function onTimerUpdate(callback) {
  onEvent('timer', (data) => {
    // Dein Server sendet 'secondsLeft' statt 'timeRemaining'
    callback({
      ...data,
      timeRemaining: data.secondsLeft || data.timeRemaining
    })
  })
}

// Runden-spezifische Funktionen
export function onRoundStarted(callback) {
  onEvent('newRound', callback)
}

export function onGuessSubmitted(callback) {
  onEvent('guess', callback)
}

// Player-Management
export function onPlayerJoined(callback) {
  onEvent('userJoined', callback)
}

export function onPlayerLeft(callback) {
  onEvent('userLeft', callback)
}

// === HILFSFUNKTIONEN ===

export function isConnected() {
  return socket && socket.readyState === WebSocket.OPEN
}

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

// Legacy-Funktionen für Kompatibilität
export function sendMessage(msg) {
  if (typeof msg === 'string') {
    sendEvent('message', { text: msg })
  } else {
    sendEvent(msg.type || 'message', msg)
  }
}

export function onMessage(callback) {
  onEvent('message', (data) => {
    callback(JSON.stringify(data))
  })
}

// === DEBUG-FUNKTIONEN ===

export function debugEventListeners() {
  console.log('Registrierte Event-Listener:', Array.from(eventListeners.keys()))
}

export function debugConnection() {
  console.log('WebSocket Status:', getConnectionState())
  console.log('Reconnect Attempts:', reconnectAttempts)
}