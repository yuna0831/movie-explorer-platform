// header.js


function searchMovie() {
  const movieTitle = document.getElementById('movieTitle')?.value.trim();
  if (!movieTitle) return alert("Please enter a movie title");

  let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
  searchHistory = [movieTitle, ...searchHistory.filter(title => title !== movieTitle)].slice(0, 5);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));

  displaySearchHistory();

  fetch(`/api/search?query=${encodeURIComponent(movieTitle)}`)
    .then(res => res.json())
    .then(data => {
      if (data.results.length > 0) {
        const movieId = data.results[0].id;
        localStorage.setItem("selectedMovieId", movieId);
        window.location.href = `/movie.html?id=${movieId}`;
      } else {
        const results = document.getElementById("movieResults");
        if (results) results.innerHTML = "<p>No results found.</p>";
      }
    })
    .catch(err => console.error("Search error:", err));
}

function displaySearchHistory() {
  const historyDiv = document.getElementById("searchHistory");
  if (!historyDiv) return;

  const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
  historyDiv.innerHTML = "<h3>Search History:</h3>";
  history.forEach(title => {
    const p = document.createElement("p");
    p.textContent = title;
    historyDiv.appendChild(p);
  });
}

function toggleHistory(show) {
  const historyDiv = document.getElementById("searchHistory");
  if (show && historyDiv) {
    displaySearchHistory();
    historyDiv.style.display = "block";
  }
}
function hideHistory() {
  setTimeout(() => {
    const historyDiv = document.getElementById("searchHistory");
    if (historyDiv) historyDiv.style.display = "none";
  }, 200);
}

function checkUserStatus() {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const loginLink = document.getElementById("loginLink");
  const userDropdown = document.getElementById("userDropdown");
  const userGreeting = document.getElementById("userGreeting");

  if (token && username) {
    if (userGreeting) userGreeting.innerText = `Hi, ${username}!`;
    if (loginLink) loginLink.style.display = "none";
    if (userDropdown) userDropdown.style.display = "inline-block";
  } else {
    if (loginLink) loginLink.style.display = "inline-block";
    if (userDropdown) userDropdown.style.display = "none";
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.reload();
}

window.addEventListener("load", () => {
  checkUserStatus();
  displaySearchHistory();
});
