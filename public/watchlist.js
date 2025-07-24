
window.onload = async function () {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Please log in first!");
        window.location.href = "/user";
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/watchlist/${username}`);
        const data = await res.json();

        const container = document.getElementById("watchlistContainer");
        if (data.length === 0) {
            container.innerHTML = "<p>No movies in your watchlist yet.</p>";
        } else {
            data.forEach(movie => {
                const div = document.createElement("div");
                div.className = "watchlist-card";
                div.innerHTML = `
                    <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}">
                    <h3>${movie.title}</h3>
                    <hr>
                    <button onclick="removeFromWatchlist(${movie.id}, this)">Delete</button>
                `;
                container.appendChild(div);
            });

            generateGenreRecommendation(data);
        }
    } catch (err) {
        console.error("Error loading watchlist:", err);
    }
};

async function saveToWatchlist(movie) {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
   

    

    if (!token || !username) {
        alert("Please log in to save movies to your watchlist.");
        return;
    }

    console.log("🎯 movie before saving:", movie);

    // genre_ids가 없거나 빈 배열이면 TMDB에서 가져오기
    if (!movie.genre_ids || movie.genre_ids.length === 0) {
        try {
          const res = await fetch(`/api/movie/${movie.id}`);
            const data = await res.json();
            movie.genre_ids = data.genres.map(g => g.id);
            console.log("👉 genre_ids before saving:", movie.genre_ids); 
        } catch (err) {
            console.error("장르 정보를 불러오지 못했습니다:", err);
            alert("Failed to fetch genre info.");
            return;
        }
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


async function removeFromWatchlist(id, btnElement) {
    try {
        const res = await fetch(`http://localhost:3000/api/watchlist/${id}`, {
            method: "DELETE"
        });

        if (res.ok) {
            btnElement.parentElement.remove(); // 화면에서 제거
        } else {
            alert("Failed to remove from watchlist.");
        }
    } catch (err) {
        console.error("Error deleting:", err);
    }
}

async function generateGenreRecommendation(watchlist) {

    console.log("watchlist", watchlist);

    if (!watchlist || watchlist.length === 0) return;

    const genreCounts = {}; 
  
    // 1. 장르별 등장 횟수 세기
    watchlist.forEach(movie => {
        let genres = movie.genre_ids;
        console.log(genres);
      
        // 만약 string이면 JSON 배열로 변환
        if (typeof genres === "string") {
          try {
            genres = JSON.parse(genres);
          } catch (e) {
            console.error("genre_ids JSON parse error:", e);
            genres = [];
          }
        }
      
        // 장르 카운트
        if (Array.isArray(genres)) {
          genres.forEach(id => {
            genreCounts[id] = (genreCounts[id] || 0) + 1;
          });
        }
      });
  
    // 2. 가장 자주 본 장르 찾기
    const mostFrequentGenre = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  
    // 3. TMDB API에서 해당 장르의 인기 영화 가져오기
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const url = `/api/discover?with_genres=${mostFrequentGenre}&page=${randomPage}`;
    const res = await fetch(url);
  
    try {
      const res = await fetch(url);
      const data = await res.json();
      const recommended = data.results.slice(0, 5);
  
      // 4. 추천 결과 렌더링
      const container = document.getElementById('recommendationContainer');
      recommended.forEach(movie => {
        const div = document.createElement('div');
        div.className = 'movie-card';
        div.innerHTML = `
          <a href="/movie.html?id=${movie.id}">
            <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${movie.title}" />
            <h3>${movie.title}</h3>
          </a>
        `;
        container.appendChild(div);
      });
    } catch (err) {
      console.error("추천 영화 불러오기 실패:", err);
    }
  }

  
