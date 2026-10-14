const search = document.getElementById('document-search'), category = document.getElementById('document-category');
const cards = [...document.querySelectorAll('[data-document]')];
function filter() {
  const query = search.value.trim().toLowerCase(); let count = 0;
  for (const card of cards) {
    card.hidden = !card.textContent.toLowerCase().includes(query) || (category.value !== 'all' && card.dataset.category !== category.value);
    if (!card.hidden) count++;
  }
  document.getElementById('document-count').textContent = `${count} document${count === 1 ? '' : 's'}`;
  document.getElementById('document-empty').hidden = count > 0;
}
search.addEventListener('input', filter); category.addEventListener('change', filter);
