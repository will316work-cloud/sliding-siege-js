function buildGenericEnemySprite(en) {
  var ediv = document.createElement('div');
  var slimeSquashClass = (en.type === 'slime' && en.pendingHitThisCycle) ? ' squashed' : '';
  ediv.className = 'enemy ' + en.type + (isVulnerable(en) ? ' vuln' : '') + slimeSquashClass + (isStunned(en) ? ' stunned' : '');
  ediv.dataset.enemyTextId = en.id;
  var labelDiv = document.createElement('div');
  labelDiv.className = 'label'; labelDiv.textContent = en.label;
  ediv.appendChild(labelDiv);
  if (en.type !== 'bomb') {
    var hpDiv = document.createElement('div');
    hpDiv.className = 'hp'; hpDiv.textContent = Math.max(0, en.hp);
    ediv.appendChild(hpDiv);
  }
  return ediv;
}