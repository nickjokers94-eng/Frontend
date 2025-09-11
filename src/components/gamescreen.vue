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
  onEvent
} from '../ws.js'

const props = defineProps({
  user: Object
})
const emit = defineEmits(['logout', 'showHighscore', 'showChangePassword', 'showAdmin'])

const GUESS_LENGTH = 5
const MAX_GUESSES = 6

const solution = ref('')
const guesses = ref([]) // Array abgegebener Rateversuche
const currentGuess = ref('')
const keyboardColors = ref({})
const guessedBy = ref([]) // Array für Rateversuche mit Benutzername: [{user: 'Name', guess: 'wort'}]
const connectedUsers = ref([]) // Liste der verbundenen Spieler
const connectionStatus = ref('DISCONNECTED')
const timer = ref(60)
let localTimerInterval = null

const isGameOver = computed(
  () => guesses.value.length === MAX_GUESSES || guesses.value.includes(solution.value)
)
const remainingGuesses = computed(() => MAX_GUESSES - guesses.value.length)

// Dynamische Versuche-Begrenzung basierend auf Spieleranzahl
const maxGuessesForPlayer = computed(() => {
  const playerCount = connectedUsers.value.length
  if (playerCount <= 1) return 6      // Alleine: 6 Versuche
  if (playerCount === 2) return 3      // 2 Spieler: 3 Versuche  
  return 2                             // 3+ Spieler: 2 Versuche
})

const playerGuessCount = computed(() => {
  return guessedBy.value.filter(g => g.user === props.user.user).length
})

const canMakeGuess = computed(() => {
  return playerGuessCount.value < maxGuessesForPlayer.value && !isGameOver.value
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
  if (currentGuess.value.length < GUESS_LENGTH && !isGameOver.value) {
    currentGuess.value += letter.toUpperCase()
  }
}

function deleteLetter() {
  currentGuess.value = currentGuess.value.slice(0, -1)
}

async function submitGuess() {
  if (currentGuess.value.length !== GUESS_LENGTH || isGameOver.value || !canMakeGuess.value) {
    if (!canMakeGuess.value) {
      alert(`Du hast keine Versuche mehr! (${playerGuessCount.value}/${maxGuessesForPlayer.value})`)
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
      setTimeout(() => alert('Super! Du hast das Wort erraten!'), 200 * GUESS_LENGTH)
    } else if (guesses.value.length === MAX_GUESSES) {
      setTimeout(
        () => alert(`Spiel vorbei! Das Wort war "${solution.value.toUpperCase()}".`),
        200 * GUESS_LENGTH
      )
    }
    
    currentGuess.value = ''
  } catch (error) {
    console.error('Fehler beim Abgeben des Rateversuchs:', error)
    alert('Fehler beim Abgeben des Rateversuchs: ' + (error.error || error.message))
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

function handleKeyPress(e) {
  const key = e.key.toLowerCase()
  if (key === 'enter') submitGuess()
  else if (key === 'backspace') deleteLetter()
  else if (key.length === 1 && key.match(/[a-zäöü]/i)) addLetter(key)
}

let ws

  onMounted(async () => {
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
    console.log('Neue Runde gestartet:', data)
    guesses.value = []
    guessedBy.value = []
    currentGuess.value = ''
    keyboardColors.value = {}
    
    // Letztes Wort anzeigen wenn verfügbar
    if (data.lastWord) {
      lastRoundSolution.value = data.lastWord
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
    if (!guesses.value.includes(solutionUpper)) {
      guesses.value.push(solutionUpper)
      guessedBy.value.push({ user: 'Lösung', guess: solutionUpper })
    }
    alert(`Runde beendet! Das Wort war: ${solutionUpper}`)
  })
  
  onSync((data) => {
    console.log('Spielzustand synchronisiert:', data)
    timer.value = data.secondsLeft
  })
  
  onError((data) => {
    console.error('WebSocket Fehler:', data.message)
    alert('Fehler: ' + data.message)
  })
  
  onPlayerList((data) => {
    console.log('Spielerliste aktualisiert:', data.players)
    connectedUsers.value = data.players.map(p => p.name)
  })
  
  onTimerUpdate((data) => {
    timer.value = data.secondsLeft

    // Lokalen Countdown neu starten
    if (localTimerInterval) clearInterval(localTimerInterval)
    localTimerInterval = setInterval(() => {
      if (timer.value > 0) {
        timer.value--
      }
    }, 1000)
  })
  
  onUserJoined((data) => {
    console.log('User beigetreten:', data.username)
    if (!connectedUsers.value.includes(data.username)) {
      connectedUsers.value.push(data.username)
    }
  })
  
  onUserLeft((data) => {
    console.log('User verlassen:', data.username)
    connectedUsers.value = connectedUsers.value.filter(u => u !== data.username)
  })
  
  // NEU: correctGuess-Event verarbeiten
  onEvent('correctGuess', (data) => {
  const wordUpper = data.word.toUpperCase()
  if (!guesses.value.includes(wordUpper)) {
    guesses.value.push(wordUpper)
    guessedBy.value.push({ user: data.user, guess: wordUpper })
  }
  solution.value = wordUpper
  // ...alert wie oben...
})

  // NEU: Spielzustand-Event verarbeiten
  onEvent('gameState', (data) => {
    // Setze alle States auf den aktuellen Stand der Lobby!
    if (data.currentWord) solution.value = data.currentWord.toUpperCase()
    if (Array.isArray(data.guesses)) guesses.value = data.guesses.map(g => g.guess.toUpperCase ? g.guess.toUpperCase() : g.guess)
    if (Array.isArray(data.guesses)) guessedBy.value = data.guesses.map(g => ({ user: g.user, guess: g.guess.toUpperCase ? g.guess.toUpperCase() : g.guess }))
    if (typeof data.timeRemaining === 'number') timer.value = data.timeRemaining
    if (typeof data.roundNumber === 'number') lastRoundSolution.value = data.lastWord ? data.lastWord.toUpperCase() : ''
    // Optional: Spieler-Liste aktualisieren
    if (Array.isArray(data.players)) connectedUsers.value = data.players.map(p => p.name)
    // Tastaturfarben ggf. neu berechnen
    keyboardColors.value = {}
    guesses.value.forEach(g => updateKeyboardColors(g))
  })

  setInterval(() => {
    connectionStatus.value = isConnected() ? 'CONNECTED' : 'DISCONNECTED'
  }, 1000)
})

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
      <button @click="emit('showChangePassword')">PASSWORT ÄNDERN</button>
      <button @click="emit('logout')">ABMELDEN</button>
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
          <span class="connection-status" :class="connectionStatus.toLowerCase()">
            {{ connectionStatus === 'CONNECTED' ? '🟢' : '🔴' }} {{ connectionStatus }}
          </span>
        </div>

        <GameGrid :guesses="guesses" :currentGuess="currentGuess" :solution="solution" />
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
            <td>{{ user.score || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </footer>

    <button v-if="user.role === 'admin'" class="admin-btn" @click="emit('showAdmin')">Admin-Bereich öffnen</button>
  </section>
</template>
