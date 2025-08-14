

async function fetchPopularMovies() {
  const res = await fetch("/api/movie/popular");
  const data = await res.json();
  return data.results;
}

async function fetchMultiplePages(endpoint, maxPages = 3) {
  let all = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`/api/${endpoint}?page=${page}`);
    const data = await res.json();
    all = all.concat(data.results || []);
  }
  return all;
}

async function displayPopular() {
  const popular = await fetchPopularMovies();
  const list = document.getElementById("popularMovies");
  if (!list) return;

  list.innerHTML = "";
  popular.slice(0, 15).forEach(m => {
    const y = m.release_date?.split("-")[0] || "N/A";
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="/movie.html?id=${m.id}">
        <img src="https://image.tmdb.org/t/p/w200${m.poster_path}" alt="${m.title}" />
      </a>
      <span class="movie-title">${m.title}</span> (${y})
    `;
    list.appendChild(li);
  });
}

async function displaySectionMovies(endpoint, elementId) {
  const track = document.getElementById(elementId);
  if (!track) return;

  track.innerHTML = "";
  const movies = await fetchMultiplePages(endpoint, 3);

  // de-dupe
  const seen = new Set();
  const unique = movies.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));

  unique.slice(0, 15).forEach(m => {
    const y = m.release_date?.split("-")[0] || "N/A";
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="/movie.html?id=${m.id}">
        <img src="https://image.tmdb.org/t/p/w200${m.poster_path}" alt="${m.title}" />
      </a>
      <span class="movie-title">${m.title}</span> (${y})
    `;
    track.appendChild(li);
  });
}

async function saveToWatchlist(movie) {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    if (!token || !username) {
        alert("Please log in to save movies to your watchlist.");
        return;
    }

    // 만약 genre_ids가 없다면 fetch로 다시 상세정보 가져오기
    if (!movie.genre_ids) {
        const res = await fetch(`/api/movie/${movie.id}`);
        const data = await res.json();
        movie.genre_ids = data.genres.map(g => g.id);  // genres는 객체 배열이므로 ID만 추출
    }

    fetch("http://localhost:3000/api/watchlist", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            movie_id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            genre_ids: movie.genre_ids
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message || "Movie added to watchlist!");
    })
    .catch(err => {
        console.error("Error saving to watchlist:", err);
        alert("Failed to save movie.");
    });
}


  

 



function setupCarouselButtons() {
  document.querySelectorAll(".carousel-section").forEach(section => {
    const track = section.querySelector(".carousel-track");
    if (!track || track.children.length === 0) return;

    const prevBtn = section.querySelector(".prev-btn");
    const nextBtn = section.querySelector(".next-btn");
    if (!prevBtn || !nextBtn) return;

    // prevent double-binding
    if (prevBtn.dataset.bound === "1") return;
    prevBtn.dataset.bound = nextBtn.dataset.bound = "1";

    let index = 0;
    const gap = 20; // matches CSS padding/gap
    const visible = 5;

    const itemWidth = () => (track.children[0]?.offsetWidth || 0) + gap;
    const maxIndex = () =>
      Math.max(0, track.children.length - visible);

    const update = () => {
      track.style.transform = `translateX(-${index * itemWidth()}px)`;
      prevBtn.style.display = index > 0 ? "inline-block" : "none";
      nextBtn.style.display = index >= maxIndex() ? "none" : "inline-block";
    };

    prevBtn.addEventListener("click", () => {
      index = Math.max(0, index - 1);
      update();
    });

    nextBtn.addEventListener("click", () => {
      index = Math.min(maxIndex(), index + 1);
      update();
    });

    // initial state
    prevBtn.style.display = "none";
    update();

    // reflow on resize
    window.addEventListener("resize", update);
  });
}


  
  const scrollIndices = {};
  const visibleCount = 5;
  
  document.querySelectorAll(".prev-btn, .next-btn").forEach(button => {
    const targetId = button.dataset.target;
  
    if (!(targetId in scrollIndices)) {
      scrollIndices[targetId] = 0;
    }
  
    button.addEventListener("click", () => {
      const track = document.getElementById(targetId);
      const isNext = button.classList.contains("next-btn");
      const itemWidth = track.children[0]?.offsetWidth + 20 || 0;
      const totalItems = track.children.length;
      const totalWidth = itemWidth * totalItems;
      const containerWidth = track.parentElement.offsetWidth;
  
      if (isNext) {
        scrollIndices[targetId] += visibleCount;
      } else {
        scrollIndices[targetId] -= visibleCount;
      }
  
      // 최대 이동 가능한 거리 계산
      const maxOffset = totalWidth - containerWidth;
      const maxIndex = Math.floor(maxOffset / itemWidth);
  
      scrollIndices[targetId] = Math.max(0, Math.min(scrollIndices[targetId], maxIndex));
  
      const scrollX = itemWidth * scrollIndices[targetId];
      track.style.transform = `translateX(-${scrollX}px)`;
    });
  });
  


  function toggleChat() {
    const chat = document.getElementById("chat-container");
    const log = document.getElementById("chat-log");
    const open = chat.style.display === "block";
    chat.style.display = open ? "none" : "block";
    if (!open) setTimeout(() => (log.scrollTop = log.scrollHeight), 100);
  }
  window.toggleChat = toggleChat;
  
  
  window.onload = () => {
    const chatLog = document.getElementById("chat-log");
    const welcome = document.createElement("div");
    welcome.innerHTML = `<strong>🤖 Moovy:</strong> Hi! How's your day? Tell me how you're feeling or what kind of movie you're in the mood for! 🎬`;
    chatLog.appendChild(welcome);
  };
  
  
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const log = document.getElementById("chat-log");
  const msg = input.value.trim();
  if (!msg) return;

  const you = document.createElement("div");
  you.innerHTML = `<strong>👤 You:</strong> ${msg}`;
  log.appendChild(you);
  input.value = "";

  try {
    const res = await fetch("/api/emotion-recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: msg })
    });
    const data = await res.json();

    if (!res.ok || !data.response || !Array.isArray(data.movies)) {
      log.innerHTML += `<div><strong>🤖 Moovy:</strong> Sorry, I couldn’t understand. Try again!</div>`;
      return;
    }

    const bot = document.createElement("div");
    bot.style.color = "black";
    bot.innerHTML = `<strong>🤖 Moovy:</strong> ${data.response}`;
    log.appendChild(bot);

    data.movies.forEach(m => {
      const item = document.createElement("div");
      item.style.color = "black";
      item.innerHTML = `🎬 <strong>${m.title}</strong><br><em>${m.overview?.slice(0,120) || "No overview available."}</em>`;
      log.appendChild(item);
    });

    log.scrollTop = log.scrollHeight;
  } catch (e) {
    console.error("Chatbot error:", e);
    log.innerHTML += `<div><strong>🤖 Moovy:</strong> Oops! Something went wrong.</div>`;
  }
}
window.sendMessage = sendMessage;
  
document.addEventListener("DOMContentLoaded", async () => {
  // header helpers may not be loaded yet on some pages, so guard them
  if (typeof window.checkUserStatus === "function") window.checkUserStatus();
  if (typeof window.displaySearchHistory === "function") window.displaySearchHistory();

  // chat welcome
  const chatLog = document.getElementById("chat-log");
  if (chatLog) {
    const welcome = document.createElement("div");
    welcome.innerHTML =
      `<strong>🤖 Moovy:</strong> Hi! How's your day? Tell me how you're feeling or what kind of movie you're in the mood for! 🎬`;
    chatLog.appendChild(welcome);
  }

  // sections (await to ensure DOM widths are correct when wiring carousel)
  if (document.getElementById("popularMovies")) await displayPopular();
  if (document.getElementById("nowPlayingMovies")) await displaySectionMovies("movie/now_playing", "nowPlayingMovies");
  if (document.getElementById("upcomingMovies")) await displaySectionMovies("movie/upcoming", "upcomingMovies");

  // wire buttons once items are in the tracks
  setupCarouselButtons();
});