const audio = document.getElementById("audio");
const playerTitle = document.getElementById("playerTitle");
const playerBtn = document.getElementById("playerBtn");
const grid = document.getElementById("beatGrid");
const search = document.getElementById("search");
const genre = document.getElementById("genre");
const beats = Array.isArray(window.RAISEUP_BEATS) ? window.RAISEUP_BEATS : [];
let current = null;

function playBeat(src, title) {
  if (!audio) return;
  if (current === src && !audio.paused) {
    audio.pause();
    if (playerBtn) playerBtn.textContent = "▶";
    return;
  }
  current = src;
  audio.src = src;
  if (playerTitle) playerTitle.textContent = title;
  audio.play().then(() => {
    if (playerBtn) playerBtn.textContent = "❚❚";
  }).catch(() => {
    if (playerBtn) playerBtn.textContent = "▶";
  });
}

if (playerBtn) {
  playerBtn.addEventListener("click", () => {
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio.play();
      playerBtn.textContent = "❚❚";
    } else {
      audio.pause();
      playerBtn.textContent = "▶";
    }
  });
}

if (audio) {
  audio.addEventListener("ended", () => {
    if (playerBtn) playerBtn.textContent = "▶";
  });
}

function card(beat) {
  return `<article class="beat-card">
    <img src="${beat.cover}" alt="${beat.title} beat cover" loading="lazy">
    <div class="beat-body">
      <div class="beat-heading">
        <p class="tag">${beat.genre}</p>
        <p class="beat-price">${beat.price}</p>
      </div>
      <h2>${beat.title}</h2>
      <p>${beat.mood}</p>
      <p class="meta">Protected 45-second preview</p>
      <button class="preview" data-src="${beat.preview}" data-title="${beat.title}">▶ Play Preview</button>
      <div class="buy-row">
        <a href="${beat.checkout}">Buy Beat License — ${beat.price}</a>
      </div>
      <p class="license-note">License terms and final file delivery are confirmed by email.</p>
    </div>
  </article>`;
}

function render() {
  if (!grid) return;
  const term = (search?.value || "").toLowerCase().trim();
  const selectedGenre = genre?.value || "";
  const list = beats.filter((beat) => {
    const matchesGenre = !selectedGenre || beat.genre === selectedGenre;
    const haystack = `${beat.title} ${beat.genre} ${beat.mood}`.toLowerCase();
    return matchesGenre && haystack.includes(term);
  });

  grid.innerHTML = list.length
    ? list.map(card).join("")
    : `<div class="empty-state"><h3>No beats found</h3><p>Try another search or style.</p></div>`;

  grid.querySelectorAll("[data-src]").forEach((button) => {
    button.addEventListener("click", () => playBeat(button.dataset.src, button.dataset.title));
  });
}

if (genre) {
  [...new Set(beats.map((beat) => beat.genre))].sort().forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    genre.appendChild(option);
  });
  genre.addEventListener("change", render);
}
if (search) search.addEventListener("input", render);
render();
