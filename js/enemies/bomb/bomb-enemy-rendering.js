function decorateBombSprite(ediv, en) {
  var badge = document.createElement('div');
  badge.className = 'bomb-variant-badge';
  badge.textContent = en.variant === 'cross' ? '✛' : en.variant === 'diag' ? '✕' : '⬚';
  ediv.appendChild(badge);
}