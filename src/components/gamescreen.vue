<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getNewSolutionWordAPI, submitGuessAPI } from '../api.js'
import GameGrid from './gamegrid.vue'
import Keyboard from './keyboard.vue'
import { 
  connectWebSocket, 
  closeWebSocket, 
  sendGuess, 
  onGuessSubmitted,
  onNewRound,
  onRoundEnded,
  onTimerUpdate,
  onUserJoined,
  onUserLeft,
  isConnected,
  onEvent,
  onSync,
  onError,
  onPlayerList
} from '../ws.js'

/**
 * Props für die GameScreen-Komponente.
 * @property {Object} user - Das eingeloggte Benutzerobjekt
 * Funktion: Übergibt den aktuellen User an die Komponente.
 * erstellt von: Nick Jokers
 */
const props = defineProps({
  user: Object
})

/**
 * Emits für GameScreen-Events.
 * @event logout - Wird ausgelöst, wenn sich der User abmeldet
 * @event showHighscore - Zeigt das Highscore-Modal
 * @event showAdmin - Öffnet den Admin-Bereich
 * @event showHelp - Öffnet das Hilfe-Modal
 * @event snackbar - Zeigt eine Snackbar-Nachricht an
 * Funktion: Gibt Events an das Parent-Component weiter.
 * erstellt von: Nick Jokers
 */
const emit = defineEmits(['logout', 'showHighscore', 'showAdmin', 'showHelp', 'snackbar'])

// Maximale Wortlänge für das Spiel
const GUESS_LENGTH = 5
// Maximale Anzahl Versuche pro Runde
const MAX_GUESSES = 6

// Das aktuelle Lösungswort (Großbuchstaben)
const solution = ref('')
// Array abgegebener Rateversuche (Strings)
const guesses = ref([])
// Aktueller Rateversuch (String)
const currentGuess = ref('')
// Farben der Tasten (z.B. { A: 'correct', B: 'wrong' })
const keyboardColors = ref({})
// Array für Rateversuche mit Benutzername: [{user: 'Name', guess: 'wort'}]
const guessedBy = ref([])
// Liste der verbundenen Spieler
const connectedUsers = ref([])
// Timer für die aktuelle Runde (Sekunden)
const timer = ref(60)
// Intervall-ID für lokalen Timer
let localTimerInterval = null

// Das Lösungswort der letzten Runde
const lastRoundSolution = ref('')
// Aktueller Rundenscore des Spielers
const roundScore = ref(0)

/**
 * Computed: true, wenn das Spiel vorbei ist (max. Versuche oder Wort erraten)
 * erstellt von: Nick Jokers
 */
const isGameOver = computed(
  () => guesses.value.length === MAX_GUESSES || guesses.value.includes(solution.value)
)

/**
 * Computed: Anzahl verbleibender Versuche
 * erstellt von: Nick Jokers
 */
const remainingGuesses = computed(() => MAX_GUESSES - guesses.value.length)

/**
 * Computed: Dynamische Versuche-Begrenzung basierend auf Spieleranzahl
 * erstellt von: Nick Jokers
 */
const maxGuessesForPlayer = computed(() => {
  const playerCount = connectedUsers.value.length
  if (playerCount <= 1) return 6      // Alleine: 6 Versuche
  if (playerCount === 2) return 3      // 2 Spieler: 3 Versuche  
  return 2                             // 3+ Spieler: 2 Versuche
})

/**
 * Computed: Anzahl der eigenen Rateversuche in dieser Runde
 * erstellt von: Nick Jokers
 */
const playerGuessCount = computed(() => {
  return guessedBy.value.filter(g => g.user === props.user.user).length
})

/**
 * Computed: true, wenn der Spieler noch raten darf
 * erstellt von: Nick Jokers
 */
const canMakeGuess = computed(() => {
  return playerGuessCount.value < maxGuessesForPlayer.value && !isGameOver.value
})

/**
 * Gibt die Anzahl der Rateversuche eines bestimmten Spielers zurück.
 * @param {string} username - Benutzername
 * @returns {number} Anzahl der Rateversuche
 * Funktion: Zählt die Rateversuche für einen User.
 * erstellt von: Nick Jokers
 */
function getPlayerGuessCount(username) {
  return guessedBy.value.filter(g => g.user === username).length
}

/**
 * Gibt die maximale Anzahl Versuche für einen User zurück.
 * @param {string} username - Benutzername
 * @returns {number} Maximale Versuche
 * Funktion: Berechnet die erlaubten Versuche je nach Spieleranzahl.
 * erstellt von: Nick Jokers
 */
function getMaxGuessesForUser(username) {
  const playerCount = connectedUsers.value.length
  if (playerCount <= 1) return 6
  if (playerCount === 2) return 3
  return 2
}

/**
 * Fügt einen Buchstaben zum aktuellen Rateversuch hinzu.
 * @param {string} letter - Der Buchstabe
 * Funktion: Ergänzt das aktuelle Wort, wenn noch Platz ist.
 * erstellt von: Nick Jokers
 */
function addLetter(letter) {
  if (currentGuess.value.length < GUESS_LENGTH && !isGameOver.value && canMakeGuess.value) {
    currentGuess.value += letter.toUpperCase()
  }
}

/**
 * Entfernt den letzten Buchstaben vom aktuellen Rateversuch.
 * Keine Parameter.
 * Funktion: Löscht das letzte Zeichen im aktuellen Wort.
 * erstellt von: Nick Jokers
 */
function deleteLetter() {
  currentGuess.value = currentGuess.value.slice(0, -1)
}

/**
 * Gibt den aktuellen Rateversuch ab.
 * Keine Parameter.
 * Funktion: Prüft und sendet den Rateversuch, aktualisiert das Grid und Keyboard.
 * erstellt von: Nick Jokers
 */
async function submitGuess() {
  if (currentGuess.value.length !== GUESS_LENGTH || isGameOver.value || !canMakeGuess.value) {
    if (!canMakeGuess.value) {
      emit('snackbar', { message: `Du hast keine Versuche mehr! (${playerGuessCount.value}/${maxGuessesForPlayer.value})`, type: 'error' })
      currentGuess.value = ''
    }
    return
  }
  
  try {
    await submitGuessAPI(currentGuess.value)

    guesses.value.push(currentGuess.value.toUpperCase())
    updateKeyboardColors(currentGuess.value.toUpperCase())
    guessedBy.value.push({ user: props.user.user, guess: currentGuess.value.toUpperCase() })

    sendGuess(currentGuess.value.toUpperCase(), props.user.user)
    
    if (currentGuess.value === solution.value) {
      setTimeout(() => emit('snackbar', { message: 'Super! Du hast das Wort erraten!', type: 'success' }), 200 * GUESS_LENGTH)
    } else if (guesses.value.length === MAX_GUESSES) {
      setTimeout(
        () => emit('snackbar', { message: `Spiel vorbei! Das Wort war "${solution.value.toUpperCase()}".`, type: 'info' }),
        200 * GUESS_LENGTH
      )
    }
    
    currentGuess.value = ''
  } catch (error) {
    console.error('Fehler beim Abgeben des Rateversuchs:', error)
    emit('snackbar', { message: 'Fehler beim Abgeben des Rateversuchs: ' + (error.error || error.message), type: 'error' })
  }
}

/**
 * Aktualisiert die Farben der Tastatur basierend auf dem Rateversuch.
 * @param {string} guess - Der abgegebene Rateversuch
 * Funktion: Setzt die Farben für korrekt, vorhanden, falsch.
 * erstellt von: Nick Jokers
 */
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

/**
 * Behandelt Tastatureingaben vom echten Keyboard.
 * @param {KeyboardEvent} e - Das Keyboard-Event
 * Funktion: Leitet Eingaben an die passenden Methoden weiter.
 * erstellt von: Nick Jokers
 */
function handleKeyPress(e) {
  const key = e.key.toLowerCase()
  if (key === 'enter') submitGuess()
  else if (key === 'backspace') deleteLetter()
  else if (key.length === 1 && key.match(/[a-zäöü]/i)) addLetter(key)
}

// WebSocket-Instanz (lokal)
let ws

/**
 * Lifecycle-Hook: Wird beim Mounten der Komponente ausgeführt.
 * Funktion: Initialisiert das Spiel, lädt das Lösungswort, setzt Event-Listener.
 * erstellt von: Nick Jokers
 */
onMounted(async () => {
  connectedUsers.value = [] // Reset bei jedem Mount

  try {
    const response = await getNewSolutionWordAPI()
    solution.value = response.data.word.toUpperCase()
  } catch (error) {
    console.error('Fehler beim Laden des Lösungsworts:', error)
    solution.value = 'ERROR'
  }
  
  window.addEventListener('keydown', handleKeyPress)
  
  ws = connectWebSocket('ws://localhost:3000', props.user.user)
  
  onGuessSubmitted((data) => {
    const { guess, user } = data

    const guessUpper = guess.toUpperCase()
    if (user !== props.user.user) {
      if (!guesses.value.includes(guessUpper)) {
        guesses.value.push(guessUpper)
      }
      if (!guessedBy.value.some(g => g.user === user && g.guess === guessUpper)) {
        guessedBy.value.push({ user, guess: guessUpper })
      }
    }
  })
  
  onNewRound((data) => {
    guesses.value = []
    guessedBy.value = []
    currentGuess.value = ''
    keyboardColors.value = {}
    roundScore.value = 0
    
    if (data.lastWord) {
      lastRoundSolution.value = data.lastWord
    } else {
      lastRoundSolution.value = ''
    }
    
    if (data.word) {
      solution.value = data.word.toUpperCase()
    } else {
      getNewSolutionWordAPI().then(response => {
        solution.value = response.data.word.toUpperCase()
      })
    }
  })
  
  onRoundEnded((data) => {
    const solutionUpper = data.solution.toUpperCase()
    // NICHT ins Grid pushen!
    if (data.playerScores && data.playerScores[props.user.user]) {
      roundScore.value = data.playerScores[props.user.user].roundScore
    }
    emit('snackbar', { message: `Runde beendet! Das Wort war: ${solutionUpper}`, type: 'info' })
  })

  onEvent('guess', (data) => {
    if (data.user === props.user.user) {
      roundScore.value = data.score
    }
  })
  
  onSync((data) => {
    timer.value = data.secondsLeft
  })
  
  onError((data) => {
    emit('snackbar', { message: 'Fehler: ' + data.message, type: 'error' })
  })
  
  onPlayerList((data) => {
    connectedUsers.value = data.players.map(p => p.name)
  })
  
  onTimerUpdate((data) => {
    timer.value = data.secondsLeft

    if (localTimerInterval) clearInterval(localTimerInterval)
    localTimerInterval = setInterval(() => {
      if (timer.value > 0) {
        timer.value--
      }
    }, 1000)
  })
  
  onUserJoined((data) => {
    if (!connectedUsers.value.includes(data.username)) {
      connectedUsers.value.push(data.username)
    }
  })
  
  onUserLeft((data) => {
    connectedUsers.value = connectedUsers.value.filter(u => u !== data.username)
  })
  
  onEvent('correctGuess', (data) => {
    const wordUpper = data.word.toUpperCase()
    if (!guesses.value.includes(wordUpper)) {
      guesses.value.push(wordUpper)
      guessedBy.value.push({ user: data.user, guess: wordUpper })
    }
    solution.value = wordUpper
    emit('snackbar', { message: `${data.user} hat das Wort erraten!`, type: 'success' })
  })

  onEvent('gameState', (data) => {
    if (data.currentWord) solution.value = data.currentWord.toUpperCase()
    if (Array.isArray(data.guesses)) guesses.value = data.guesses.map(g => g.guess.toUpperCase ? g.guess.toUpperCase() : g.guess)
    if (Array.isArray(data.guesses)) guessedBy.value = data.guesses.map(g => ({ user: g.user, guess: g.guess.toUpperCase ? g.guess.toUpperCase() : g.guess }))
    if (typeof data.timeRemaining === 'number') timer.value = data.timeRemaining
    if (typeof data.lastWord === 'string') lastRoundSolution.value = data.lastWord ? data.lastWord.toUpperCase() : ''
    if (Array.isArray(data.players)) connectedUsers.value = data.players.map(p => p.name)
    keyboardColors.value = {}
    guesses.value.forEach(g => updateKeyboardColors(g))
  })
})

/**
 * Lifecycle-Hook: Wird beim Unmounten der Komponente ausgeführt.
 * Funktion: Entfernt Event-Listener und schließt die WebSocket-Verbindung.
 * erstellt von: Nick Jokers
 */
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  closeWebSocket()
  if (localTimerInterval) clearInterval(localTimerInterval)
})
</script>

<template>
  <section class="screen">
    <header class="top-buttons">
      <button @click="emit('showHighscore')">HIGHSCORE ANZEIGEN</button>
      <button @click="emit('logout')">ABMELDEN</button>
      <button @click="emit('showHelp')" title="Hilfe anzeigen">Spielregeln & Bedienung</button>
    </header>

    <hr class="button-divider" />

    <main class="game-layout">
      <div class="box">
        <h3>LETZTES WORT</h3>
        <div v-if="lastRoundSolution" class="last-word">
          {{ lastRoundSolution.toUpperCase() }}
        </div>
        <div v-else class="no-last-word">
          Keine vorherige Runde
        </div>
      </div>

      <div class="game-center">
        <div id="game-info">
          <span>VERSUCHE: <span>{{ playerGuessCount }}/{{ maxGuessesForPlayer }}</span></span>
          <span>TIMER: <span id="timer-display">{{ timer }}</span></span>
        </div>

        <GameGrid :guesses="guesses" :currentGuess="canMakeGuess ? currentGuess : ''" :solution="solution" />
        <Keyboard
          @add="addLetter"
          @delete="deleteLetter"
          @submit="submitGuess"
          :colors="keyboardColors"
          :disabled="!canMakeGuess"
        />
      </div>

      <div class="box">
        <h3>SPIELER STATUS</h3>
        <div v-for="user in connectedUsers" :key="user" class="player-status">
          <span class="username">{{ user }}</span>
          <span class="attempts">{{ getPlayerGuessCount(user) }}/{{ getMaxGuessesForUser(user) }}</span>
        </div>
        
        <h4>GERATEN VON</h4>
        <ul id="guessed-by">
          <li v-for="(entry, index) in guessedBy" :key="index">{{ entry.user }} ({{ entry.guess }})</li>
        </ul>
      </div>
    </main>

    <footer>
      <table id="scoreboard">
        <thead>
          <tr>
            <th>SPIELER</th>
            <th>PUNKTE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ user.user }}</td>
            <td>{{ roundScore }}</td>
          </tr>
        </tbody>
      </table>
    </footer>

    <button v-if="user.role === 'admin'" class="admin-btn" @click="emit('showAdmin')">Admin-Bereich öffnen</button>
  </section>
</template>