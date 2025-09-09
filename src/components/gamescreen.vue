<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import GameGrid from './gamegrid.vue'
import Keyboard from './keyboard.vue'
import { 
  connectWebSocket, 
  closeWebSocket, 
  sendGuess, 
  onGuess,           
  onNewRound,        
  onRoundEnded,     
  onTimer,           
  onUserJoined,
  onUserLeft,
  onPlayerList,
  onWelcome,
  onCorrectGuess,
  onError,
  isConnected,
  sendEvent
} from '../ws.js'

const props = defineProps({
  user: Object
})
const emit = defineEmits(['logout', 'showHighscore', 'showChangePassword', 'showAdmin'])

const GUESS_LENGTH = 5
const MAX_GUESSES = 6

const solution = ref('')
const guesses = ref([])
const currentGuess = ref('')
const keyboardColors = ref({})
const guessedBy = ref([])
const connectedUsers = ref([])
const connectionStatus = ref('DISCONNECTED')
const timer = ref(60)
const lastRoundSolution = ref('')
const roundNumber = ref(0)
const gameActive = ref(false)
const wsConnected = ref(false)
const playerScores = ref({})
const totalGuesses = ref(0)

const isGameOver = computed(
  () => guesses.value.length === MAX_GUESSES || 
        guesses.value.some(g => g === solution.value) ||
        totalGuesses.value >= 6
)

const maxGuessesForPlayer = computed(() => {
  const playerCount = connectedUsers.value.length
  if (playerCount <= 1) return 6
  if (playerCount === 2) return 3
  return 2
})

const playerGuessCount = computed(() => {
  return guessedBy.value.filter(g => g.user === props.user.user).length
})

const canMakeGuess = computed(() => {
  return playerGuessCount.value < maxGuessesForPlayer.value && 
         !isGameOver.value && 
         gameActive.value && 
         wsConnected.value &&
         totalGuesses.value < 6
})

const currentPlayerScore = computed(() => {
  return playerScores.value[props.user.user]?.roundScore || 0
})

function getPlayerGuessCount(username) {
  return guessedBy.value.filter(g => g.user === username).length
}

function getMaxGuessesForUser(username) {
  const playerCount = connectedUsers.value.length
  if (playerCount <= 1) return 6
  if (playerCount === 2) return 3
  return 2
}

function addLetter(letter) {
  if (currentGuess.value.length < GUESS_LENGTH && !isGameOver.value && gameActive.value) {
    currentGuess.value += letter
  }
}

function deleteLetter() {
  currentGuess.value = currentGuess.value.slice(0, -1)
}

async function submitGuess() {
  if (currentGuess.value.length !== GUESS_LENGTH || isGameOver.value || !canMakeGuess.value) {
    if (!canMakeGuess.value) {
      if (!wsConnected.value) {
        alert('Keine Verbindung zum Server!')
      } else if (totalGuesses.value >= 6) {
        alert('Maximale Gesamtanzahl von 6 Versuchen erreicht!')
      } else {
        alert(`Du hast keine Versuche mehr! (${playerGuessCount.value}/${maxGuessesForPlayer.value})`)
      }
    }
    return
  }
  
  if (!wsConnected.value) {
    alert('Keine Verbindung zum Server! Versuche es später erneut.')
    return
  }
  
  try {
    // WebSocket-Guess senden
    sendGuess(currentGuess.value, props.user.user)
    currentGuess.value = ''
  } catch (error) {
    console.error('Fehler beim Abgeben des Rateversuchs:', error)
    alert('Fehler beim Abgeben des Rateversuchs: ' + (error.message || error))
  }
}

function updateKeyboardColors(guess) {
  const tempColors = { ...keyboardColors.value }
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i]
    let status = 'wrong'
    if (solution.value[i] === letter) {
      status = 'correct'
    } else if (solution.value.includes(letter)) {
      status = 'present'
    }

    if (status === 'correct' || (status === 'present' && tempColors[letter] !== 'correct')) {
      tempColors[letter] = status
    } else if (!tempColors[letter]) {
      tempColors[letter] = 'wrong'
    }
  }
  keyboardColors.value = tempColors
}

function resetGameState() {
  guesses.value = []
  guessedBy.value = []
  currentGuess.value = ''
  keyboardColors.value = {}
  gameActive.value = true
  totalGuesses.value = 0
  playerScores.value = {}
}

function handleKeyPress(e) {
  const key = e.key.toLowerCase()
  if (key === 'enter') submitGuess()
  else if (key === 'backspace') deleteLetter()
  else if (key.length === 1 && key.match(/[a-zäöü]/i)) addLetter(key)
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

let ws

onMounted(async () => {
  console.log('🎮 Gamescreen wird geladen...')
  console.log('🔗 Verbinde mit WebSocket...')
  
  // WebSocket verbinden
  ws = connectWebSocket('ws://localhost:3000', props.user.user)
  
  // Event-Handler registrieren
  onWelcome((data) => {
    console.log('🎉 Willkommen:', data)
    wsConnected.value = true
    // Game State anfordern
    sendEvent('requestGameState')
  })
  
  // Neuer Handler für Game State
  sendEvent('gameState', (data) => {
    console.log('🔄 Game State erhalten:', data)
    
    if (data.currentWord && data.gameActive) {
      solution.value = data.currentWord
      gameActive.value = true
      console.log('✅ Aktuelles Wort:', data.currentWord)
    } else {
      gameActive.value = false
    }
    
    if (data.timeRemaining !== undefined) {
      timer.value = data.timeRemaining
    }
    if (data.roundNumber) {
      roundNumber.value = data.roundNumber
    }
    if (data.lastWord) {
      lastRoundSolution.value = data.lastWord
    }
    if (data.players) {
      connectedUsers.value = data.players.map(p => p.name)
    }
    if (data.guesses) {
      // Versuche verarbeiten
      guessedBy.value = data.guesses.map(g => ({ 
        user: g.user, 
        guess: g.guess,
        score: g.score || 0,
        correct: g.correct || false
      }))
      guesses.value = data.guesses.map(g => g.guess)
      totalGuesses.value = data.guesses.length
    }
    if (data.playerScores) {
      playerScores.value = data.playerScores
    }
  })
  
  onNewRound((data) => {
    console.log('🆕 Neue Runde gestartet:', data)
    resetGameState()
    
    if (data.lastWord) {
      lastRoundSolution.value = data.lastWord
      setTimeout(() => {
        alert(`🎯 Neue Runde ${data.roundNumber}!\n${data.lastWord ? `Letztes Wort: ${data.lastWord}` : 'Erste Runde'}`)
      }, 100)
    }
    
    // Neues Wort vom Server
    if (data.word) {
      solution.value = data.word
      gameActive.value = true
      console.log('🎯 Neues Wort:', data.word)
    }
    
    if (data.duration) {
      timer.value = data.duration
    }
    
    roundNumber.value = data.roundNumber
  })
  
  onRoundEnded((data) => {
    console.log('🏁 Runde beendet:', data)
    gameActive.value = false
    
    if (data.playerScores) {
      playerScores.value = data.playerScores
    }
    
    let message = `🏁 Runde ${data.roundNumber} beendet!\n\nLösung: ${data.solution}\n`
    
    if (data.reason === 'solved') {
      message += `✅ Wort wurde erraten!`
    } else if (data.reason === 'timeout') {
      message += `⏰ Zeit abgelaufen!`
    } else if (data.reason === 'max_guesses') {
      message += `🚫 6 Versuche erreicht!`
    }
    
    // Punkte anzeigen
    if (data.playerScores && data.playerScores[props.user.user]) {
      const score = data.playerScores[props.user.user]
      message += `\n\n🏆 Deine Punkte diese Runde: ${score.roundScore}`
      message += `\n📊 Gesamtpunkte: ${score.totalScore}`
    }
    
    setTimeout(() => {
      alert(message)
    }, 100)
  })
  
  onTimer((data) => {
    timer.value = data.secondsLeft
  })
  
  onGuess((data) => {
    console.log('💭 Guess erhalten:', data)
    const { guess, user, score, correct, totalGuessNumber } = data
    
    // Versuche hinzufügen
    if (!guessedBy.value.some(g => g.user === user && g.guess === guess)) {
      guessedBy.value.push({ 
        user, 
        guess, 
        score: score || 0,
        correct: correct || false
      })
    }
    
    if (!guesses.value.includes(guess)) {
      guesses.value.push(guess)
    }
    
    // Total Guess Counter aktualisieren
    if (totalGuessNumber) {
      totalGuesses.value = totalGuessNumber
    }
    
    // Keyboard-Farben nur für eigene Versuche aktualisieren
    if (user === props.user.user) {
      updateKeyboardColors(guess)
    }
  })
  
  onCorrectGuess((data) => {
    console.log('🎯 Korrekter Versuch:', data)
    setTimeout(() => {
      alert(`🎉 ${data.user} hat das Wort erraten: ${data.word}!\n🏆 Punkte: ${data.score || 0}`)
    }, 500)
  })
  
  onPlayerList((data) => {
    console.log('👥 Spielerliste aktualisiert:', data.players)
    connectedUsers.value = data.players.map(p => ({ 
      name: p.name, 
      guessCount: p.guessCount,
      maxGuesses: p.maxGuesses,
      roundScore: p.roundScore || 0,
      totalScore: p.totalScore || 0
    }))
  })
  
  onUserJoined((data) => {
    console.log('➕ User beigetreten:', data.username)
    // Spielerliste wird über playerList-Event aktualisiert
  })
  
  onUserLeft((data) => {
    console.log('➖ User verlassen:', data.username)
    connectedUsers.value = connectedUsers.value.filter(u => u.name !== data.username)
    guessedBy.value = guessedBy.value.filter(g => g.user !== data.username)
  })
  
  onError((data) => {
    console.error('❌ WebSocket Fehler:', data.message)
    wsConnected.value = false
    alert('❌ Fehler: ' + data.message)
  })
  
  window.addEventListener('keydown', handleKeyPress)
  
  // Connection Status Monitor
  setInterval(() => {
    const connected = isConnected()
    connectionStatus.value = connected ? 'CONNECTED' : 'DISCONNECTED'
    wsConnected.value = connected
    
    // Automatisches Reconnect falls nötig
    if (!connected && ws) {
      console.log('🔄 Verbindung verloren, versuche Reconnect...')
      setTimeout(() => {
        ws = connectWebSocket('ws://localhost:3000', props.user.user)
      }, 3000)
    }
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  closeWebSocket()
})
</script>

<template>
  <section class="screen">
    <header class="top-buttons">
      <button @click="emit('showHighscore')">HIGHSCORE ANZEIGEN</button>
      <button @click="emit('showChangePassword')">PASSWORT ÄNDERN</button>
      <button @click="emit('logout')">ABMELDEN</button>
    </header>

    <hr class="button-divider" />

    <main class="game-layout">
      <!-- Linke Spalte: Letztes Wort & Status -->
      <div class="box">
        <h3>LETZTES WORT</h3>
        <div v-if="lastRoundSolution" class="last-word">
          {{ lastRoundSolution.toUpperCase() }}
        </div>
        <div v-else class="no-last-word">
          Keine vorherige Runde
        </div>
        
        <div class="game-status-box">
          <div class="status-item">
            <span class="label">Runde:</span>
            <span class="value">{{ roundNumber }}</span>
          </div>
          
          <div class="status-item">
            <span class="label">Verbindung:</span>
            <span class="value" :class="wsConnected ? 'connected' : 'disconnected'">
              {{ wsConnected ? '🟢 Online' : '🔴 Offline' }}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Meine Punkte:</span>
            <span class="value score">{{ currentPlayerScore }}</span>
          </div>
        </div>
      </div>

      <!-- Mittlere Spalte: Hauptspiel -->
      <div class="game-center">
        <div id="game-info">
          <span>VERSUCHE: <span class="highlight">{{ playerGuessCount }}/{{ maxGuessesForPlayer }}</span></span>
          <span>TIMER: <span id="timer-display" class="highlight">{{ formatTime(timer) }}</span></span>
          <span>GESAMT: <span class="highlight">{{ totalGuesses }}/6</span></span>
        </div>

        <!-- Wartebildschirm wenn nicht verbunden -->
        <div v-if="!wsConnected" class="waiting-screen">
          <h2>🔄 Verbinde mit Server...</h2>
          <p>Stelle sicher, dass der WebSocket-Server läuft:</p>
          <code>node server.js</code>
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>

        <!-- Spiel nur wenn verbunden -->
        <div v-else>
          <div class="game-status-info">
            <span v-if="gameActive" class="status active">🎮 Spiel läuft</span>
            <span v-else class="status waiting">⏸️ Warten auf neue Runde...</span>
          </div>
          
          <GameGrid :guesses="guesses" :currentGuess="currentGuess" :solution="solution" />
          <Keyboard
            @add="addLetter"
            @delete="deleteLetter"
            @submit="submitGuess"
            :colors="keyboardColors"
            :disabled="!canMakeGuess"
          />
          
          <div v-if="!canMakeGuess && gameActive" class="guess-limit-info">
            <span v-if="totalGuesses >= 6">
              🚫 Maximale Gesamtanzahl von 6 Versuchen erreicht!
            </span>
            <span v-else-if="playerGuessCount >= maxGuessesForPlayer">
              ⚠️ Keine Versuche mehr für dich ({{ playerGuessCount }}/{{ maxGuessesForPlayer }})
            </span>
            <span v-else>
              ⏸️ Warte auf andere Spieler...
            </span>
          </div>
        </div>
      </div>

      <!-- Rechte Spalte: Spieler & Versuche -->
      <div class="box">
        <h3>SPIELER ({{ connectedUsers.length }})</h3>
        <div v-if="connectedUsers.length === 0" class="no-players">
          {{ wsConnected ? 'Warten auf andere Spieler...' : 'Offline - Server nicht erreichbar' }}
        </div>
        <div v-for="player in connectedUsers" :key="player.name" class="player-status">
          <div class="player-info">
            <span class="username" :class="{ 'current-user': player.name === user.user }">
              {{ player.name }}
              <span v-if="player.name === user.user" class="you-indicator">(Du)</span>
            </span>
            <div class="player-stats">
              <span class="attempts">{{ getPlayerGuessCount(player.name) }}/{{ getMaxGuessesForUser(player.name) }}</span>
              <span class="score">{{ playerScores[player.name]?.roundScore || 0 }}pts</span>
            </div>
          </div>
        </div>
        
        <h4>ALLE VERSUCHE ({{ guessedBy.length }})</h4>
        <div class="guesses-container">
          <div v-if="guessedBy.length === 0" class="no-guesses">
            Noch keine Versuche...
          </div>
          <div v-for="(entry, index) in guessedBy" :key="index" 
               class="guess-entry"
               :class="{ 
                 'own-guess': entry.user === user.user,
                 'correct-guess': entry.correct
               }">
            <div class="guess-info">
              <span class="guess-user">{{ entry.user }}:</span>
              <span class="guess-word">{{ entry.guess }}</span>
              <span v-if="entry.correct" class="correct-indicator">✓</span>
            </div>
            <div class="guess-score" v-if="entry.score">
              +{{ entry.score }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer>
      <div class="scoreboard-container">
        <h3>AKTUELLE SITZUNG</h3>
        <table id="scoreboard">
          <thead>
            <tr>
              <th>SPIELER</th>
              <th>RUNDEN-PUNKTE</th>
              <th>GESAMT-PUNKTE</th>
            </tr>
          </thead>
          <tbody>
            <tr :class="{ 'current-player': user.user === user.user }">
              <td>{{ user.user }}</td>
              <td>{{ currentPlayerScore }}</td>
              <td>{{ playerScores[user.user]?.totalScore || 0 }}</td>
            </tr>
            <tr v-for="[username, scores] in Object.entries(playerScores)" 
                :key="username"
                v-if="username !== user.user"
                class="other-player">
              <td>{{ username }}</td>
              <td>{{ scores.roundScore || 0 }}</td>
              <td>{{ scores.totalScore || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </footer>

    <button v-if="user.role === 'admin'" class="admin-btn" @click="emit('showAdmin')">
      🔧 Admin-Bereich öffnen
    </button>
  </section>
</template>

<style scoped>
.waiting-screen {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 20px 0;
}

.waiting-screen h2 {
  color: #666;
  margin-bottom: 15px;
}

.waiting-screen code {
  background: #e9ecef;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 20px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #007bff;
  animation: loading 1.4s infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes loading {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.game-status-box {
  margin-top: 15px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.value {
  font-weight: bold;
}

.value.connected {
  color: #28a745;
}

.value.disconnected {
  color: #dc3545;
}

.value.score {
  color: #007bff;
}

.game-status-info {
  text-align: center;
  margin-bottom: 15px;
}

.status {
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 14px;
  font-weight: bold;
}

.status.active {
  background: #d4edda;
  color: #155724;
}

.status.waiting {
  background: #fff3cd;
  color: #856404;
}

.highlight {
  color: #007bff;
  font-weight: bold;
}

.guess-limit-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 10px 15px;
  border-radius: 6px;
  margin-top: 15px;
  text-align: center;
  font-weight: bold;
}

.player-status {
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.player-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.username {
  font-weight: bold;
  color: #333;
}

.username.current-user {
  color: #007bff;
}

.you-indicator {
  font-size: 11px;
  color: #6c757d;
  font-weight: normal;
}

.player-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.attempts {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 10px;
  color: #666;
}

.score {
  background: #e3f2fd;
  padding: 2px 6px;
  border-radius: 10px;
  color: #1976d2;
  font-weight: bold;
}

.guesses-container {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 10px;
}

.no-guesses {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 15px;
}

.guess-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 4px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  transition: all 0.2s;
}

.guess-entry.own-guess {
  border-color: #007bff;
  background: #f8f9ff;
}

.guess-entry.correct-guess {
  border-color: #28a745;
  background: #f8fff9;
}

.guess-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guess-user {
  font-size: 12px;
  color: #666;
  min-width: 60px;
}

.guess-word {
  font-weight: bold;
  font-family: monospace;
}

.correct-indicator {
  color: #28a745;
  font-weight: bold;
}

.guess-score {
  font-size: 11px;
  color: #007bff;
  font-weight: bold;
}

.scoreboard-container {
  margin-top: 30px;
}

.scoreboard-container h3 {
  text-align: center;
  margin-bottom: 15px;
  color: #666;
}

#scoreboard {
  margin: 0 auto;
  max-width: 600px;
}

.current-player {
  background-color: #e7f3ff;
  font-weight: bold;
}

.other-player {
  opacity: 0.8;
}
</style>