

let currentPage = 1;
let selectedCategory = new URLSearchParams(location.search).get("category") || "now_playing";
let selectedGenre = new URLSearchParams(location.search).get("genre") || "";

function updateURL() {
  const url = new URL(location.href);
  url.searchParams.set("category", selectedCategory);
  if (selectedGenre) url.searchParams.set("genre", selectedGenre);
  else url.searchParams.delete("genre");
  history.replaceState(null, "", url);
}

async function fetchGenres() {
  const res = await fetch("/api/genres"); 
  const data = await res.json();
  const genreContainer = document.getElementById("genres");
  genreContainer.innerHTML = "";

  data.genres.forEach(genre => {
    const btn = document.createElement("button");
    btn.textContent = genre.name;
    btn.dataset.genre = genre.id;
    if (genre.id == selectedGenre) btn.classList.add("active");
    btn.addEventListener("click", () => {
      // 1. 모든 장르 버튼에서 active 제거
      document.querySelectorAll("#genres button").forEach(b => b.classList.remove("active"));

      // 2. 현재 클릭한 버튼에 active 추가
      btn.classList.add("active");

      // 3. 선택 및 데이터 fetch
      selectedGenre = genre.id;
      currentPage = 1;
      updateURL();
      fetchMovies();
  });
    genreContainer.appendChild(btn);
  });

  // All Genres 버튼 추가
  const allBtn = document.createElement("button");
  allBtn.textContent = "All Genres";
  allBtn.dataset.genre = "";
  if (!selectedGenre) allBtn.classList.add("active");
  allBtn.addEventListener("click", () => {
    // 모든 장르 버튼 active 제거
    document.querySelectorAll("#genres button").forEach(b => b.classList.remove("active"));

    // 이 버튼만 active
    allBtn.classList.add("active");

    selectedGenre = "";
    currentPage = 1;
    updateURL();
    fetchMovies();
  });

  genreContainer.prepend(allBtn);
}

async function fetchMovies() {
  let url = `/api/discover?page=${currentPage}&sort_by=popularity.desc&region=US&with_release_type=3&category=${selectedCategory}`;
  
  if (selectedGenre) {
    url += `&with_genres=${selectedGenre}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  const grid = document.getElementById("movieGrid");
  if (currentPage === 1) {
    grid.innerHTML = "";
    window.loadedMovies = [];
  }

  window.loadedMovies = [...(window.loadedMovies || []), ...data.results];

  const limitedMovies = window.loadedMovies.slice(0, 70);
  grid.innerHTML = "";

  limitedMovies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
    <a href="/movie.html?id=${movie.id}" style="text-decoration: none; color: inherit;">
      <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : '/images/no-poster.png'}" alt="${movie.title}" />
        <h3 style="color: white; font-size: 14px; margin: 8px 0 4px;">${movie.title}</h3>
        <p style="color: #ccc; font-size: 12px;">${movie.release_date?.split('-')[0] || 'N/A'}</p>
      </a>
    `;
    grid.appendChild(card);
  });

  document.getElementById("loadMoreBtn").style.display =
    window.loadedMovies.length >= 70 || currentPage >= data.total_pages ? "none" : "block";
  document.getElementById("loadMoreBtn").disabled = false;
}


document.querySelectorAll(".movie-tabs .tab").forEach(btn => {
  if (btn.dataset.category === selectedCategory) btn.classList.add("active");

  btn.addEventListener("click", () => {
    selectedCategory = btn.dataset.category;
    selectedGenre = ""; // 장르 초기화
    currentPage = 1;
    updateURL();

    // 🔸 모든 카테고리 탭에서 active 제거 후 선택된 탭만 active
    document.querySelectorAll(".movie-tabs .tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // 🔸 장르 초기화
    document.querySelectorAll("#genres button").forEach(b => b.classList.remove("active"));
    const allBtn = document.querySelector('#genres button[data-genre=""]');
    if (allBtn) allBtn.classList.add("active");

    fetchMovies();
  });
});


document.getElementById("loadMoreBtn").addEventListener("click", () => {
  currentPage++;
  fetchMovies();
  document.getElementById("loadMoreBtn").disabled = true;
});
function loadMoviesByCategory(category) {
  selectedCategory = category;
  selectedGenre = ""; // 장르 초기화
  currentPage = 1;
  updateURL();

  // 탭 UI 상태도 반영해줘야 함 (active 클래스)
  document.querySelectorAll(".movie-tabs .tab").forEach(t => {
    t.classList.remove("active");
    if (t.dataset.category === category) t.classList.add("active");
  });

  // 장르 버튼 초기화
  document.querySelectorAll("#genres button").forEach(b => b.classList.remove("active"));
  const allBtn = document.querySelector('#genres button[data-genre=""]');
  if (allBtn) allBtn.classList.add("active");

  fetchMovies();
}


window.onload = async () => {
  await fetchGenres();
  await fetchMovies();
};
