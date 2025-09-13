<script setup>
import { computed } from 'vue'

/**
 * Props für die GameGrid-Komponente.
 * @property {Array} guesses - Liste der abgegebenen Rateversuche
 * @property {String} currentGuess - Aktueller Rateversuch
 * @property {String} solution - Das Lösungswort
 * Funktion: Übergibt die Spielstände und das Lösungswort an die Komponente.
 * erstellt von: Nick Jokers
 */
const props = defineProps({
  guesses: Array,
  currentGuess: String,
  solution: String
})

// Maximale Wortlänge für das Spiel
const GUESS_LENGTH = 5
// Maximale Anzahl Versuche pro Runde
const MAX_GUESSES = 6

/**
 * Berechnet die Anzeige der Spielsteine (Tiles) für das Grid.
 * Keine Parameter.
 * @returns {Array} 2D-Array mit Buchstaben und Status ('correct', 'present', 'wrong')
 * Funktion: Erzeugt die Anzeige für alle bisherigen Rateversuche, den aktuellen Versuch und leere Zeilen.
 * erstellt von: Nick Jokers
 */
const tiles = computed(() => {
  let allTiles = []

  // Für jeden abgegebenen Rateversuch die Status berechnen
  props.guesses.forEach((guess) => {
    const row = []
    const solutionLetters = props.solution.split('')
    const guessLetters = guess.split('')
    const tempSolution = [...solutionLetters]
    const statuses = Array(GUESS_LENGTH).fill('wrong')

    // Erst richtige Buchstaben an richtiger Stelle markieren
    for (let i = 0; i < GUESS_LENGTH; i++) {
      if (guessLetters[i] === tempSolution[i]) {
        statuses[i] = 'correct'
        tempSolution[i] = null
      }
    }

    // Dann Buchstaben markieren, die im Wort vorkommen, aber an anderer Stelle stehen
    for (let i = 0; i < GUESS_LENGTH; i++) {
      if (statuses[i] === 'correct') continue

      const letterIndexInSolution = tempSolution.indexOf(guessLetters[i])
      if (letterIndexInSolution !== -1) {
        statuses[i] = 'present'
        tempSolution[letterIndexInSolution] = null
      }
    }

    // Zeile für das Grid aufbauen
    for (let i = 0; i < GUESS_LENGTH; i++) {
      row.push({ letter: guess[i], status: statuses[i] })
    }
    allTiles.push(row)
  })

  // Nur eine Eingabezeile anzeigen, wenn currentGuess nicht leer ist
  if (allTiles.length < MAX_GUESSES && props.currentGuess && props.currentGuess.length > 0) {
    let currentRow = []
    for (let i = 0; i < GUESS_LENGTH; i++) {
      currentRow.push({ letter: props.currentGuess[i] || '', status: '' })
    }
    allTiles.push(currentRow)
  }

  // Leere Zeilen auffüllen, bis MAX_GUESSES erreicht ist
  while (allTiles.length < MAX_GUESSES) {
    let emptyRow = []
    for (let i = 0; i < GUESS_LENGTH; i++) {
      emptyRow.push({ letter: '', status: '' })
    }
    allTiles.push(emptyRow)
  }

  return allTiles
})
</script>

<template>
  <div class="grid">
    <div v-for="(row, rowIndex) in tiles" :key="rowIndex" class="row">
      <span v-for="(tile, tileIndex) in row" :key="tileIndex" :class="tile.status">
        {{ tile.letter }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  gap: 8px;
}
span {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccc;
  font-size: 2rem;
  font-weight: bold;
  background: #fff;
  transition: background 0.2s;
}
span.correct {
  background: #6aaa64; /* grün */
  color: #fff;
}
span.present {
  background: #c9b458; /* gelb */
  color: #fff;
}
span.wrong {
  background: #787c7e; /* grau */
  color: #fff;
}
.key {
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  margin: 4px;
}
</style>