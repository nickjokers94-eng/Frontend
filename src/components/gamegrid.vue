<script setup>
import { computed } from 'vue'

const props = defineProps({
  guesses: Array,
  currentGuess: String,
  solution: String
})

const GUESS_LENGTH = 5
const MAX_GUESSES = 6

const tiles = computed(() => {
  let allTiles = []

  props.guesses.forEach((guess) => {
    const row = []
    const solutionLetters = props.solution.split('')
    const guessLetters = guess.split('')
    const tempSolution = [...solutionLetters]
    const statuses = Array(GUESS_LENGTH).fill('wrong')

    for (let i = 0; i < GUESS_LENGTH; i++) {
      if (guessLetters[i] === tempSolution[i]) {
        statuses[i] = 'correct'
        tempSolution[i] = null
      }
    }

    for (let i = 0; i < GUESS_LENGTH; i++) {
      if (statuses[i] === 'correct') continue

      const letterIndexInSolution = tempSolution.indexOf(guessLetters[i])
      if (letterIndexInSolution !== -1) {
        statuses[i] = 'present'
        tempSolution[letterIndexInSolution] = null
      }
    }

    for (let i = 0; i < GUESS_LENGTH; i++) {
      row.push({ letter: guess[i], status: statuses[i] })
    }
    allTiles.push(row)
  })

  if (allTiles.length < MAX_GUESSES) {
    let currentRow = []
    for (let i = 0; i < GUESS_LENGTH; i++) {
      currentRow.push({ letter: props.currentGuess[i] || '', status: '' })
    }
    allTiles.push(currentRow)
  }

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
