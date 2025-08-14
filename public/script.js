
const REGION = "US";                               // 필요시 "US" 등
const MIN_YEAR_GLOBAL = 2020;                      // 이보다 옛날 작품은 전역 차단
const MIN_YEAR_TRENDING = new Date().getFullYear() - 2; // 트렌딩은 최근 2년
const MIN_VOTECOUNT_TRENDING = 100;                // 너무 마이너한 구작 컷

/* --- Utils --- */
const getYear = (m) => parseInt(m.release_date?.slice(0, 4) || "0", 10);

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dedupeById(list) {
  return Array.from(new Map(list.map(m => [m.id, m])).values());
}

async function fetchPages(endpoint, pages = 3, params = "") {
  const hasQ = endpoint.includes("?");
  const urls = Array.from({ length: pages }, (_, i) =>
    `/api/${endpoint}${hasQ ? "&" : "?"}page=${i + 1}${params ? `&${params}` : ""}`
  );
  const results = await Promise.all(
    urls.map(u => fetch(u).then(r => r.json()).catch(() => ({ results: [] })))
  );
  return results.flatMap(r => r?.results || []);
}

function renderList(elementId, movies) {
  const track = document.getElementById(elementId);
  if (!track) return;
  track.innerHTML = "";
  movies.slice(0, 15).forEach(m => {
    const y = m.release_date?.split("-")[0] || "N/A";
    const img = m.poster_path
      ? `https://image.tmdb.org/t/p/w200${m.poster_path}`
      : `/assets/placeholder-2x3.png`;
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="/movie.html?id=${m.id}">
        <img src="${img}" alt="${m.title}" />
      </a>
      <span class="movie-title">${m.title}</span> (${y})
    `;
    track.appendChild(li);
  });
}

/* --- Sections --- */

// 1) Trending/Popular: 최근작만 노출 (oldies 컷)
async function displayPopular() {
  const list = document.getElementById("popularMovies");
  if (!list) return;

  // 인기 API 여러 페이지 병렬 로드 (이미 fetchPages 있음)
  let movies = await fetchPages("movie/popular", 3, `region=${REGION}`);

  // 전역 최소연도(예: 2020)와 최근 2년 중 더 빡센 기준 적용
  const minYear = Math.max(MIN_YEAR_GLOBAL, MIN_YEAR_TRENDING);

  movies = movies
    .filter(m => getYear(m) >= minYear)
    .filter(m => (m.vote_count || 0) >= MIN_VOTECOUNT_TRENDING);

  movies = dedupeById(movies).sort((a,b) => (b.popularity||0) - (a.popularity||0));
  renderList("popularMovies", movies);
}


// 2) Now in Theaters
window.__nowPlayingIds = new Set();

async function displayNowPlaying() {
  let movies = await fetchPages("movie/now_playing", 3, `region=${REGION}`);
  movies = dedupeById(movies).filter(m => getYear(m) >= MIN_YEAR_GLOBAL);
  window.__nowPlayingIds = new Set(movies.map(m => m.id));
  renderList("nowPlayingMovies", movies);
}

// 3) Coming Soon (discover 기반) — 오늘 이후 + 상영 중과 중복 제거

// 프록시가 /api/discover → TMDB /discover/movie에 붙어있어야 해요.
// 아니라면 DISCOVER_ENDPOINT를 'discover/movie'로 바꾸세요.
// 네 프록시에 맞게 둘 중 하나(또는 둘 다) 시도
// 1) helpers 추가
const DISCOVER_ENDPOINT = 'discover'; // 너의 프록시가 /api/discover → TMDB /discover/movie 로 매핑

function buildParams(obj) {
  const sp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => v != null && sp.append(k, String(v)));
  return sp.toString(); // 2|3 → 2%7C3 자동 인코딩
}
function validDateStr(s){ return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

async function displayComingSoonHome(minNeeded = 15) {
  const track = document.getElementById("upcomingMovies");
  if (!track) return;

  const year  = new Date().getFullYear();
  const today = todayISO(1);
  const np    = window.__nowPlayingIds || new Set();

  // ✅ 동작하는 페이지와 동일한 계약: category=upcoming 필수!
  const baseQ = buildParams({
    category: 'upcoming',
    region: REGION,              // 예: 'US' 또는 'KR'
    sort_by: 'release_date.asc', // 서버가 내부에서 정리
    with_release_type: '3',      // (네 코드에 맞춤) 리미티드
  });

  // 여러 페이지 긁기
  let movies = await fetchPages(DISCOVER_ENDPOINT, 5, baseQ).catch(() => []);
  movies = dedupeById(movies);

  // 올해 + 오늘 이후 + (원하면) NP 제외
  let filtered = movies
    .filter(m => validDateStr(m.release_date))
    .filter(m => m.release_date.slice(0,4) === String(year))
    .filter(m => m.release_date >= today)
    .filter(m => !np.has(m.id));

  // 부족하면 살짝 범위 확장(여전히 category=upcoming 유지)
  if (filtered.length < minNeeded) {
    const moreQ = buildParams({
      category: 'upcoming',
      region: REGION,
      sort_by: 'popularity.desc',
      with_release_type: '2|3',
    });
    const more = await fetchPages(DISCOVER_ENDPOINT, 5, moreQ).catch(() => []);
    movies = dedupeById([...movies, ...(more || [])]);
    filtered = movies
      .filter(m => validDateStr(m.release_date))
      .filter(m => m.release_date.slice(0,4) === String(year))
      .filter(m => m.release_date >= today)
      .filter(m => !np.has(m.id));
  }

  console.log(movies.map (m => m.release_date));

  // 정렬 + 15개만 렌더
  filtered.sort((a,b) => a.release_date.localeCompare(b.release_date));
  const finalList = filtered.slice(0, minNeeded);

  console.log(finalList.map (f => f.release_date));

  track.innerHTML = "";
  if (!finalList.length) {
    track.innerHTML = `<li style="width:100%;color:#aaa;text-align:center;padding:12px">
      No upcoming movies right now.
    </li>`;
    return;
  }
  renderList("upcomingMovies", finalList);
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

    if (prevBtn.dataset.bound === "1") return;
    prevBtn.dataset.bound = nextBtn.dataset.bound = "1";

    let index = 0;
    const gap = 20;
    const visible = 5;

    const itemWidth = () => (track.children[0]?.offsetWidth || 0) + gap;
    const maxIndex  = () => Math.max(0, track.children.length - visible);

    const update = () => {
      track.style.transform = `translateX(-${index * itemWidth()}px)`;
      prevBtn.style.display = index > 0 ? "inline-block" : "none";
      nextBtn.style.display = index >= maxIndex() ? "none" : "inline-block";
    };

    prevBtn.addEventListener("click", () => { index = Math.max(0, index - 1); update(); });
    nextBtn.addEventListener("click", () => { index = Math.min(maxIndex(), index + 1); update(); });

    prevBtn.style.display = "none";
    update();
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

  const popularTask = document.getElementById("popularMovies") ? displayPopular() : Promise.resolve();
  
  // chat welcome
  const chatLog = document.getElementById("chat-log");
  if (chatLog) {
    const welcome = document.createElement("div");
    welcome.innerHTML =
      `<strong>🤖 Moovy:</strong> Hi! How's your day? Tell me how you're feeling or what kind of movie you're in the mood for! 🎬`;
    chatLog.appendChild(welcome);
  }

  // sections (await to ensure DOM widths are correct when wiring carousel)
  if (document.getElementById("nowPlayingMovies")) {
    await displayNowPlaying();
  }
  if (document.getElementById("upcomingMovies")) {
    await displayComingSoonHome(15);
  }

  await popularTask;

  // wire buttons once items are in the tracks
  setupCarouselButtons();
});