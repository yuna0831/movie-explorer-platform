
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get("id");
const username = localStorage.getItem("username");
const token = localStorage.getItem("token");


let currentMovieTitle = "";

async function loadHero() {
    try {
      const res = await fetch(`/api/movie/${movieId}`);
      const data = await res.json();
  
      if (!data) return;
  
      document.getElementById("heroTitle").textContent = `${data.title} (${data.release_date?.split("-")[0] || "N/A"})`;
      document.getElementById("heroMeta").textContent = data.genres.map(g => g.name).join(", ") + " · " + data.runtime + " min";
      document.getElementById("heroOverview").textContent = data.overview;
      document.getElementById("heroPoster").src = data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : "/images/placeholder.png";
  
      const heroSection = document.getElementById("heroSection");
      if (heroSection && data.backdrop_path) {
        heroSection.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.2)), url('https://image.tmdb.org/t/p/original${data.backdrop_path}')`;
      }
  
      // Add to watchlist
      const watchlistBtn = document.getElementById("watchlistBtn");
      if (watchlistBtn) {
        watchlistBtn.style.display = "inline-block";
        watchlistBtn.onclick = () => {
          if (!username || !token) return alert("🔐 Please log in.");
          fetch("http://localhost:3000/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              movie_id: data.id,
              title: data.title,
              poster_path: data.poster_path,
              genre_ids: data.genres.map(g => g.id)
            })
          })
          .then(res => res.json())
          .then(json => alert(json.message || "✅ Added to watchlist!"))
          .catch(err => console.error("Failed to save:", err));
        };
      }
  
      // Trailer button
      const trailerBtn = document.getElementById("trailerBtn");
      trailerBtn?.addEventListener("click", async () => {
        const res = await fetch(`/api/movie/${movieId}/videos`);
        const videoData = await res.json();
        const trailer = videoData.results.find(v => v.site === "YouTube" && v.type === "Trailer");
        if (trailer) {
          document.getElementById("trailerFrame").src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
          document.getElementById("trailerLightbox").style.display = "flex";
        } else {
          alert("❌ No trailer found.");
        }
      });
    } catch (e) {
      console.error("loadHero error:", e);
    }

    
  }
  




      
    function closeTrailer() {
        const trailerLightbox = document.getElementById("trailerLightbox");
        const trailerFrame = document.getElementById("trailerFrame");
        trailerLightbox.style.display = "none";
        trailerFrame.src = "";
    }
    async function loadCredits() {
        const track = document.getElementById("creditsTrack");
        const prevBtn = document.querySelector(".prev-btn");
        const nextBtn = document.querySelector(".next-btn");
        const cardWidth = 112;
        const visibleCount = 5;
      
        const res = await fetch(`/api/movies/${movieId}/credits`);
        const data = await res.json();
        const people = data.cast.slice(0, 15);
      
        track.innerHTML = people.map(p => `
          <li>
            <img src="${p.profile_path ? `https://image.tmdb.org/t/p/w200${p.profile_path}` : '/images/placeholder.png'}" alt="${p.name}">
            <div>${p.name}</div>
            <div style="font-size: 12px; color: #999;">${p.character || ''}</div>
          </li>
        `).join('');
      
        let scrollX = 0;
        let maxScroll = (people.length - visibleCount) * cardWidth;
        prevBtn.style.display = "none";
      
        nextBtn.addEventListener("click", () => {
          scrollX += cardWidth;
          track.style.transform = `translateX(-${scrollX}px)`;
          prevBtn.style.display = "inline";
          if (scrollX >= maxScroll) nextBtn.disabled = true;
        });
      
        prevBtn.addEventListener("click", () => {
          scrollX = Math.max(0, scrollX - cardWidth);
          track.style.transform = `translateX(-${scrollX}px)`;
          if (scrollX === 0) prevBtn.style.display = "none";
          nextBtn.disabled = false;
        });
      }

      async function loadSimilarMovies() {
        try {
          // 1️⃣ 키워드 + 장르 정보 가져오기
          const [keywordRes, detailRes] = await Promise.all([
            fetch(`/api/movie/${movieId}/keywords`),
            fetch(`/api/movie/${movieId}`) // 이건 movie detail endpoint
          ]);
      
          const keywordData = await keywordRes.json();
          const movieDetail = await detailRes.json();
      
          const keywords = keywordData.keywords || [];
          const genres = movieDetail.genres || [];
      
          if (keywords.length === 0 && genres.length === 0) {
            document.getElementById("similarMovies").innerHTML = "<p>No similar movies found.</p>";
            return;
          }
      
          const keywordIds = keywords.slice(0, 2).map(k => k.id).join(',');
          const genreIds = genres.slice(0, 2).map(g => g.id).join(',');
      
          // 2️⃣ Discover API에서 조건 조합 추천
          const discoverRes = await fetch(`/api/discover?with_keywords=${keywordIds}&with_genres=${genreIds}&sort_by=popularity.desc`);
          const discoverData = await discoverRes.json();
      
          const similar = discoverData.results.filter(m => m.id !== movieId).slice(0, 8);   
      
          if (similar.length === 0) {
            document.getElementById("similarMovies").innerHTML = "<p>No similar movies found.</p>";
            return;
          }
      
          // 3️⃣ 렌더링
          document.getElementById("similarMovies").innerHTML = similar.map(movie => {
            const poster = movie.poster_path
              ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
              : "/images/placeholder.png";
      
            return `
              <div class="movie-slide">
                <a href="/movie.html?id=${movie.id}">
                  <img src="${poster}" alt="${movie.title}" />
                </a>
              </div>
            `;
          }).join("");
      
        } catch (err) {
          console.error("Failed to load similar movies:", err);
          document.getElementById("similarMovies").innerHTML = "<p>Failed to load similar movies.</p>";
        }
      }
      

// 댓글 불러오기
async function loadReviews() {
  try {
    const res = await fetch(`http://localhost:3000/api/comments/${movieId}`);
    const data = await res.json();

    const reviewList = document.getElementById("reviewList");
    reviewList.innerHTML = "";

    if (data.length === 0) {
      reviewList.innerHTML = "<p style='color:#aaa;'>No reviews yet.</p>";
      return;
    }

    data.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("review-card");

      const stars = item.rating
  ? `<div class="rating">${'<i class="fa-solid fa-star"></i>'.repeat(item.rating)}</div>`
  : "";


      card.innerHTML = `
        <h4>${item.username}</h4>
        ${stars ? `<div class="rating">${stars}</div>` : ""}
        <p>${item.comment || ""}</p>
        <small style="color: #777; font-size: 12px;">${new Date(item.created_at).toLocaleDateString()}</small>
      `;

      reviewList.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading reviews:", error);
  }
}


  
  // 댓글 작성
  async function submitReview() {
    const reviewText = document.getElementById("reviewText").value.trim();
    const rating = parseInt(document.querySelector('input[name="rating"]:checked')?.value);
  
    if (!username || !token) {
      alert("You must be logged in to submit a review.");
      return;
    }
  
    if (!reviewText && !rating) {
      alert("Please write a review or select a rating.");
      return;
    }
  
    try {
      const res = await fetch("http://localhost:3000/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie_id: movieId,
          username,
          comment: reviewText,
          rating
        })
      });
  
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Review submitted!");
        document.getElementById("reviewText").value = "";
        // 별점 초기화
        const checked = document.querySelector('input[name="rating"]:checked');
        if (checked) checked.checked = false;
        loadReviews();
      } else {
        alert(data.message || "Submission failed.");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Network error.");
    }
  }
  

// 사진 업로드
async function loadPhotos() {
    try {
      const res = await fetch(`/api/movie/${movieId}/images`);
      const data = await res.json();
  
      const track = document.getElementById("photoTrack");
      const prevBtn = document.querySelector('[data-target="photoTrack"].prev-btn');
      const nextBtn = document.querySelector('[data-target="photoTrack"].next-btn');
      const images = data.backdrops.slice(0, 15); // 최대 15장
  
      if (images.length === 0) {
        track.innerHTML = "<p>No photos available.</p>";
        return;
      }
  
      track.innerHTML = images.map(img => `
        <li>
          <img src="https://image.tmdb.org/t/p/w300${img.file_path}" 
               alt="Movie Photo" 
               style="width: 200px; border-radius: 8px; cursor: pointer;"
               onclick="showLightbox('https://image.tmdb.org/t/p/original${img.file_path}')">
        </li>
      `).join("");
  
      // 슬라이드 로직
      const cardWidth = 210; // 이미지 + 여백
      const visibleCount = 5;
      let scrollX = 0;
      let maxScroll = (images.length - visibleCount) * cardWidth;
  
      prevBtn.style.display = "none";
  
      nextBtn.addEventListener("click", () => {
        scrollX += cardWidth;
        track.style.transform = `translateX(-${scrollX}px)`;
        prevBtn.style.display = "inline";
        if (scrollX >= maxScroll) nextBtn.disabled = true;
      });
  
      prevBtn.addEventListener("click", () => {
        scrollX = Math.max(0, scrollX - cardWidth);
        track.style.transform = `translateX(-${scrollX}px)`;
        if (scrollX === 0) prevBtn.style.display = "none";
        nextBtn.disabled = false;
      });
  
    } catch (err) {
      console.error("Failed to load photos:", err);
    }
  }
  


function showLightbox(imageUrl) {
    const lightbox = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImage");
    img.src = imageUrl;
    lightbox.style.display = "flex";
}

document.getElementById("lightbox").addEventListener("click", () => {
    document.getElementById("lightbox").style.display = "none";
});
window.onload = async () => {
    if (!movieId) {
        alert("No movie selected.");
        window.location.href = "/";
        return;
    }
    
    console.log("movieId:", movieId); 
    const viewAllCastBtn = document.getElementById("viewAllCastBtn");
    if (viewAllCastBtn && movieId) {
      viewAllCastBtn.href = `cast-crew.html?id=${movieId}`;
    }
   
    await loadHero();

    // await loadMovieDetails();
    
    await loadCredits();
    
    await loadSimilarMovies();
   
    await loadReviews(); 
    
    await loadPhotos();
   

    
   
};
