/* ============================================================
   POINTS RENDERING

   Reserved. The original source has no dedicated score-display
   function — state.score is read directly inline wherever it's
   shown (the main score readout, the shop screen, the game-over
   screen). Those inline reads stay in their respective files
   (general-ui-rendering.js, shop-rendering.js, turn-rendering.js)
   rather than being centralized here, since unlike addScore()
   (a genuine mutation point worth centralizing), a plain read of
   state.score has no shared logic to extract.
   ============================================================ */
