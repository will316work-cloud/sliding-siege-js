/* ============================================================
   MAGE — RENDERING

   playMageCastAnimation() depends on playCastThreadAnimation()
   (see animation-rendering.js — generic, also used by golem/
   siren/slime).
   ============================================================ */

async function playMageCastAnimation(mage, attackKey) {
  var cardEl = document.getElementById('attackCard_' + attackKey);
  await playCastThreadAnimation(mage, cardEl, '#d9a8ff');
}
