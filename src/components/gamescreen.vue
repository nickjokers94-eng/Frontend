<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getNewSolutionWordAPI } from '../api.js'
import GameGrid from './gamegrid.vue'
import Keyboard from './keyboard.vue'
import { connectWebSocket, sendMessage, onMessage, closeWebSocket } from '../ws.js'

const props = defineProps({
  user: Object
})
const emit = defineEmits(['logout', 'showHighscore', 'showChangePassword', 'showAdmin'])

const GUESS_LENGTH = 5
const MAX_GUESSES = 6

const solution = ref('')
const guesses = ref([]) // Array of submitted guesses
const currentGuess = ref('')
const keyboardColors = ref({})
const guessedBy = ref([]) // Array für Rateversuche mit Benutzername: [{user: 'Name', guess: 'wort'}]

const timer = ref(60);

const isGameOver = computed(
  () => guesses.value.length === MAX_GUESSES || guesses.value.includes(solution.value)
)
const remainingGuesses = computed(() => MAX_GUESSES - guesses.value.length)

function addLetter(letter) {
  if (currentGuess.value.length < GUESS_LENGTH && !isGameOver.value) {
    currentGuess.value += letter
  }
}

function deleteLetter() {
  currentGuess.value = currentGuess.value.slice(0, -1)
}

function submitGuess() {
  if (currentGuess.value.length !== GUESS_LENGTH || isGameOver.value) {
    return
  }
  // Sofort lokal eintragen, damit das Wort im Grid erscheint
  guesses.value.push(currentGuess.value)
  updateKeyboardColors(currentGuess.value)

  // Auch in guessedBy für die Anzeige hinzufügen
  guessedBy.value.push({ user: props.user.user, guess: currentGuess.value })

  sendMessage({ type: 'guess', user: props.user.user, guess: currentGuess.value })

  if (currentGuess.value === solution.value) {
    setTimeout(() => alert('Super! Du hast das Wort erraten!'), 200 * GUESS_LENGTH)
  } else if (guesses.value.length === MAX_GUESSES) {
    setTimeout(
      () => alert(`Spiel vorbei! Das Wort war "${solution.value.toUpperCase()}".`),
      200 * GUESS_LENGTH
    )
  }

  currentGuess.value = ''
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

    // A 'correct' key should not be downgraded
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
  const response = await getNewSolutionWordAPI()
  solution.value = response.data.word
  window.addEventListener('keydown', handleKeyPress)
  ws = connectWebSocket()
  onMessage((msg) => {
    const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
    if (data.type === 'guess') {
      // Alle Rateversuche hinzufügen (auch von anderen Spielern)
      // Aber nur, wenn das Wort nicht bereits vorhanden ist (Duplikatschutz)
      if (!guesses.value.includes(data.guess)) {
        guesses.value.push(data.guess);
      }
      
      // Für "Geraten von" - nur wenn es nicht vom eigenen Benutzer kommt
      if (data.user !== props.user.user && !guessedBy.value.some(g => g.user === data.user && g.guess === data.guess)) {
        guessedBy.value.push({ user: data.user, guess: data.guess });
      }
    } else if (data.type === 'newRound') {
      guesses.value = [];
      guessedBy.value = [];
      solution.value = ''; // Hole ggf. neues Wort per API
      // Timer zurücksetzen, UI anpassen
    } else if (data.type === 'roundEnded') {
      alert(`Runde beendet! Das Wort war: ${data.solution}`);
      // UI anpassen, ggf. Lösung anzeigen
    } else if (data.type === 'timer') {
      timer.value = data.secondsLeft;
    }
  })
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
      <div class="box">
        <h3>LETZTE WÖRTER</h3>
        <ul id="last-words">
          <!-- This can be implemented later -->
        </ul>
      </div>

      <div class="game-center">
        <div id="game-info">
          <span
            >ÜBRIGE VERSUCHE: <span>{{ remainingGuesses }}</span></span
          >
          <span>TIMER: <span id="timer-display">{{ timer }}</span></span>
        </div>

        <GameGrid :guesses="guesses" :currentGuess="currentGuess" :solution="solution" />
        <Keyboard
          @add="addLetter"
          @delete="deleteLetter"
          @submit="submitGuess"
          :colors="keyboardColors"
        />
      </div>

      <div class="box">
        <h3>GERATEN VON</h3>
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
            <td>{{ user.email }}</td>
            <td>{{ user.score || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </footer>

    <button v-if="user.role === 'admin'" class="admin-btn" @click="emit('showAdmin')">Admin-Bereich öffnen</button>
  </section>
</template>
