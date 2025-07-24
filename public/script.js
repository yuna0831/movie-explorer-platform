


async function fetchPopularMovies() {
    const res = await fetch("/api/movie/popular");
    const data = await res.json();
    return data.results;
}



async function displayPopular() {
    const popular = await fetchPopularMovies();
    

    const popularList = document.getElementById("popularMovies");
    

    popularList.innerHTML = "";

    popular.slice(0, 15).forEach(movie => {
        const li = document.createElement("li");
        li.innerHTML = `
            <a href="/movie.html?id=${movie.id}">
                 <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}" />
            </a>
            <span class="movie-title">${movie.title}</span> (${movie.release_date?.split("-")[0] || "N/A"})
        `;
        popularList.appendChild(li);
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


  

  async function fetchMultiplePages(endpoint, maxPages = 3) {
    let allResults = [];
    for (let page = 1; page <= maxPages; page++) {
        const res = await fetch(`/api/${endpoint}?page=${page}`);
        const data = await res.json();
        allResults = allResults.concat(data.results);
    }
    return allResults;
}

async function displaySectionMovies(endpoint, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = "";

    const today = new Date();
    const endOfYear = new Date(today.getFullYear(), 11, 31);

    const movies = await fetchMultiplePages(endpoint, 3); // 3페이지까지 시도
    const filteredMovies = endpoint.includes("upcoming")
        ? movies.filter(movie => {
            const releaseDate = new Date(movie.release_date);
            return releaseDate >= today && releaseDate <= endOfYear;
        })
        : movies;

    


     // ✅ 중복 제거
     const uniqueMovies = [];
     const seenIds = new Set();
     for (const movie of filteredMovies) {
         if (!seenIds.has(movie.id)) {    
             seenIds.add(movie.id);
             uniqueMovies.push(movie);
         }
     }

    
     
     // 최대 15개만 표시
     uniqueMovies.slice(0,15).forEach(movie => {
        console.log(movie.id);
         const li = document.createElement("li");
         li.innerHTML = `
             <a href="/movie.html?id=${movie.id}">
                 <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}" />
             </a>
             <span class="movie-title">${movie.title}</span> (${movie.release_date?.split("-")[0] || "N/A"})
         `;
         container.appendChild(li);
     });
}




function setupCarouselButtons() {
    const scrollIndices = {};
  
    document.querySelectorAll(".carousel-section").forEach(section => {
      const track = section.querySelector(".carousel-track");
      const trackId = track.id;
      scrollIndices[trackId] = 0;
  
      const prevBtn = section.querySelector(".prev-btn");
      const nextBtn = section.querySelector(".next-btn");
  
      // 처음엔 prev 숨김
      prevBtn.style.display = "none";
  
      const updateButtons = () => {
        const itemWidth = track.children[0]?.offsetWidth + 20 || 0;
        const visibleCount = 5;
        const maxIndex = Math.max(0, track.children.length - visibleCount);
        track.style.transform = `translateX(-${itemWidth * scrollIndices[trackId]}px)`;
  
        prevBtn.style.display = scrollIndices[trackId] > 0 ? "inline-block" : "none";
        nextBtn.style.display = scrollIndices[trackId] >= maxIndex ? "none" : "inline-block";
      };
  
      prevBtn.addEventListener("click", () => {
        scrollIndices[trackId] = Math.max(0, scrollIndices[trackId] - 1);
        updateButtons();
      });
  
      nextBtn.addEventListener("click", () => {
        const visibleCount = 5;
        const maxIndex = Math.max(0, track.children.length - visibleCount);
        scrollIndices[trackId] = Math.min(maxIndex, scrollIndices[trackId] + 1);
        updateButtons();
      });
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
  



  




window.onload = () => {
    checkUserStatus();
    displaySearchHistory();
    
  if (document.getElementById("popularMovies")) {
    displayPopular(); 
  }

  if (document.getElementById("nowPlayingMovies")) {
    displaySectionMovies("movie/now_playing", "nowPlayingMovies");
  }

  if (document.getElementById("upcomingMovies")) {
    displaySectionMovies("movie/upcoming", "upcomingMovies");
  }
}