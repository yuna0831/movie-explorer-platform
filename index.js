require("dotenv").config();
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

const axios = require("axios"); // 맨 위에 추가 (안 돼 있으면 설치: npm install axios)

// TMDB 검색 프록시
app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ message: "Missing query" });

  try {
    const tmdbRes = await axios.get("https://api.themoviedb.org/3/search/movie", {
      params: {
        api_key: process.env.TMDB_API_KEY,
        query,
      },
    });
    res.json(tmdbRes.data);
  } catch (err) {
    console.error("TMDB search error:", err.message);
    res.status(500).json({ message: "TMDB API error" });
  }
});

// 단일 영화 정보 프록시 (상세정보 로딩용)
app.get("/api/movie/:id", async (req, res) => {
  try {
    const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${req.params.id}`, {
      params: { api_key: process.env.TMDB_API_KEY },
    });
    res.json(tmdbRes.data);
  } catch (err) {
    console.error("TMDB movie fetch error:", err.message);
    res.status(500).json({ message: "TMDB API error" });
  }
});



// TMDB Discover 프록시 (정렬/지역/장르 등 전부 반영)
// 영화 discover 프록시
app.get("/api/discover", async (req, res) => {
  try {
    const { page, sort_by, region, with_release_type, category, with_genres } = req.query;

    let url = "https://api.themoviedb.org/3/discover/movie";
    const params = {
      api_key: process.env.TMDB_API_KEY,
      page: page || 1,
      sort_by: sort_by || "popularity.desc",
      region: region || "US",
      with_release_type: with_release_type || 3,
    };

    // 날짜 필터
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (category === "now_playing") {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      const pastStr = past.toISOString().split("T")[0];
      params["primary_release_date.gte"] = pastStr;
      params["primary_release_date.lte"] = todayStr;
    } else if (category === "upcoming") {
      const end = new Date(today.getFullYear(), 11, 31);
      const endStr = end.toISOString().split("T")[0];
      params["primary_release_date.gte"] = todayStr;
      params["primary_release_date.lte"] = endStr;
    }

    if (with_genres) {
      params.with_genres = with_genres;
    }

    const tmdbRes = await axios.get(url, { params });
    res.json(tmdbRes.data);
  } catch (err) {
    console.error("DISCOVER ERROR:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.get("/api/genres", async (req, res) => {
  try {
    const response = await axios.get("https://api.themoviedb.org/3/genre/movie/list", {
      params: { api_key: process.env.TMDB_API_KEY },
    });
    res.json(response.data);
  } catch (err) {
    console.error("GENRE ERROR:", err.message);
    res.status(500).json({ message: "Failed to fetch genres" });
  }
});

// TMDB 캐스트/크루 정보 프록시
app.get("/api/movies/:id/credits", async (req, res) => {
  const { id } = req.params;
  try {
    const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${id}/credits`, {
      params: { api_key: process.env.TMDB_API_KEY }
    });
    res.json(tmdbRes.data);
  } catch (err) {
    console.error("TMDB credits error:", err.message);
    res.status(500).json({ error: "Failed to fetch credits" });
  }
});

// TMDB 검색 프록시
app.get("/api/search", async (req, res) => {
  const { query } = req.query;

  try {
    const tmdbRes = await axios.get("https://api.themoviedb.org/3/search/movie", {
      params: {
        api_key: process.env.TMDB_API_KEY,
        query,
      }
    });
    res.json(tmdbRes.data);
  } catch (err) {
    console.error("TMDB search error:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});


// TMDB 영화 상세 정보 라우트
app.get("/api/movie/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Movie details fetch error:", error.message);
    res.status(500).json({ error: "Failed to fetch movie info" });
  }
});

//trailer
app.get("/api/movie/:id/videos", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}/videos`, {
      params: { api_key: process.env.TMDB_API_KEY }
    });
    res.json(response.data);
  } catch (err) {
    console.error("VIDEO ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

//photos
app.get("/api/movie/:id/images", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}/images`, {
      params: { api_key: process.env.TMDB_API_KEY }
    });
    res.json(response.data);
  } catch (err) {
    console.error("IMAGE ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

//keywords
app.get("/api/movie/:id/keywords", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}/keywords`, {
      params: { api_key: process.env.TMDB_API_KEY }
    });
    res.json(response.data);
  } catch (err) {
    console.error("KEYWORDS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch keywords" });
  }
});


// 인기 영화 요청
app.get("/api/movie/popular", async (req, res) => {
  try {
    const response = await axios.get("https://api.themoviedb.org/3/movie/popular", {
      params: {
        api_key: process.env.TMDB_API_KEY,
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error("POPULAR ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

// 영화 목록 (now_playing, upcoming 등)
app.get("/api/movie/:category", async (req, res) => {
  const { category } = req.params;
  const page = req.query.page || 1;

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/${category}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        page,
      },
    });
    res.json(response.data);
  } catch (err) {
    console.error(`CATEGORY (${category}) ERROR:`, err.message);
    res.status(500).json({ error: "Failed to fetch category movies" });
  }
});






// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serves static files (HTML, CSS, JS)

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Love1019^^",   
  database: "movie_app"
}).promise();

db.connect(err => {
  if (err) {
    console.error("MySQL connection failed:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/sign", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sign.html"));
});

app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user.html"));
});

// Sign-up API
app.post("/api/sign", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Please enter both username and password." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Username already exists." });
        }
        return res.status(500).json({ message: "Database error." });
      }

      res.status(200).json({ message: "Sign up successful!", token: "dummy_token" });
    }
  );
});

const jwt = require("jsonwebtoken");
const SECRET_KEY = "supersecretkey";

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const token = jwt.sign({ username: user.username }, "supersecretkey", { expiresIn: "1h" });
        res.json({ token, username: user.username });
    });
});

app.get("/comment", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home-comment.html"));
  });
  

// 영화별 댓글 저장
app.post("/api/comments", async (req, res) => {
  const { movie_id, username, comment, rating, parent_id, emotion } = req.body;

  if (!movie_id || !username || (!comment && !rating)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const query = parent_id
    ? "INSERT INTO comments (movie_id, username, comment, rating, emotion, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())"
    : "INSERT INTO comments (movie_id, username, comment, rating, emotion, created_at) VALUES (?, ?, ?, ?, ?, NOW())";

  const params = parent_id
    ? [movie_id, username, comment || null, rating || null, emotion || null, parent_id]
    : [movie_id, username, comment || null, rating || null, emotion || null];

  try {
    await db.query(query, params);
    res.json({ message: "Review submitted!" });
  } catch (err) {
    console.error("Insert comment error:", err);
    res.status(500).json({ message: "Database error" });
  }
});



// 특정 영화의 댓글 불러오기
app.get("/api/comments/:movie_id", async (req, res) => {
  const movieId = req.params.movie_id;
  try {
    const [rows] = await db.query(
      `SELECT *, 
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = comments.id) AS like_count 
       FROM comments 
       WHERE movie_id = ?
       ORDER BY like_count DESC, created_at ASC`, 
      [movieId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error loading comments:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// DELETE comment by ID
app.delete("/api/comments/:id", async (req, res) => {
  const commentId = req.params.id;

  try {
    const [result] = await db.query("DELETE FROM comments WHERE id = ?", [commentId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/comments/:id", async (req, res) => {
  const commentId = req.params.id;
  const { username, comment } = req.body;

  if (!username || !comment) {
    return res.status(400).json({ message: "Missing username or comment" });
  }

  try {
    const [results] = await db.query("SELECT username FROM comments WHERE id = ?", [commentId]);
    if (results.length === 0) return res.status(404).json({ message: "Comment not found" });

    const owner = results[0].username;
    if (owner !== username) {
      return res.status(403).json({ message: "Unauthorized to edit this comment" });
    }

    await db.query("UPDATE comments SET comment = ? WHERE id = ?", [comment, commentId]);
    res.json({ message: "Comment updated successfully" });
  } catch (err) {
    console.error("Update comment error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// 대댓글 저장
app.post("/api/replies", async (req, res) => {
  const { comment_id, username, reply } = req.body;

  if (!comment_id || !username || !reply) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await db.query(
      "INSERT INTO replies (comment_id, username, reply) VALUES (?, ?, ?)",
      [comment_id, username, reply]
    );
    res.json({ message: "Reply added!" });
  } catch (err) {
    console.error("Insert reply error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// 특정 댓글의 대댓글 가져오기
app.get("/api/replies/:comment_id", async (req, res) => {
  const id = req.params.comment_id;
  try {
    const [results] = await db.query("SELECT * FROM replies WHERE comment_id = ?", [id]);
    res.json(results);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// 대댓글 수정
app.put("/api/replies/:id", async (req, res) => {
  const replyId = req.params.id;
  const { username, reply } = req.body;

  if (!username || !reply) {
    return res.status(400).json({ message: "Missing username or reply" });
  }

  try {
    const [results] = await db.query("SELECT username FROM replies WHERE id = ?", [replyId]);
    if (results.length === 0) return res.status(404).json({ message: "Reply not found" });

    const owner = results[0].username;
    if (owner !== username) {
      return res.status(403).json({ message: "Unauthorized to edit this reply" });
    }

    await db.query("UPDATE replies SET reply = ? WHERE id = ?", [reply, replyId]);
    res.json({ message: "Reply updated successfully" });
  } catch (err) {
    console.error("Update reply error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// 대댓글 삭제
app.delete("/api/replies/:id", async (req, res) => {
  const replyId = req.params.id;

  try {
    const [results] = await db.query("DELETE FROM replies WHERE id = ?", [replyId]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Reply not found" });
    }

    res.json({ message: "Reply deleted successfully" });
  } catch (err) {
    console.error("Delete reply error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// save 연결
app.get("/watchlist", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "watchlist.html"));
  });
  

  app.get("/api/watchlist/:username", async (req, res) => {
    const username = req.params.username;
  
    try {
      const [results] = await db.query(
        "SELECT * FROM watchlist WHERE username = ?",
        [username]
      );
      res.json(results);
    } catch (err) {
      console.error("DB Error:", err);
      res.status(500).json({ message: "Database error" });
    }
  });


// movie page 라우팅 추가
app.get("/movie", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "movie.html"));
  });
  
  
// watchlist 데이터베이스
app.post("/api/watchlist", async (req, res) => {
  const { username, movie_id, title, poster_path, genre_ids } = req.body;

  if (!username || !movie_id || !title || !genre_ids) {
    return res.status(400).json({ message: "Missing fields." });
  }

  try {
    const [existing] = await db.query(
      "SELECT * FROM watchlist WHERE username = ? AND movie_id = ?",
      [username, movie_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "⚠️ Already in watchlist." });
    }

    await db.query(
      "INSERT INTO watchlist (username, movie_id, title, poster_path, genre_ids) VALUES (?, ?, ?, ?, ?)",
      [username, movie_id, title, poster_path, JSON.stringify(genre_ids)]
    );

    res.json({ message: "✅ Movie saved to watchlist!" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ message: "Database error." });
  }
});


// watchlist 
app.delete("/api/watchlist/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const [result] = await db.query("DELETE FROM watchlist WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Movie not found in watchlist" });
    }

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Failed to delete:", err);
    res.status(500).json({ message: "Database error" });
  }
});


app.post("/api/emotion-recommend", async (req, res) => {
  const { prompt } = req.body;
  try {
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You're a friendly and emotional chatbot named Moovy 🎬.
            The user will tell you how they're feeling or how their day went.
            
            Always respond ONLY in valid JSON format like this:
            
            {
              "response": "Your empathetic or humorous message here",
              "movies": [
                { "title": "Movie Title", "overview": "Short summary" },
                ...
              ]
            }
            
            Do NOT add any extra text before or after the JSON block.
            Keep the response natural and warm in tone, not too formal.`
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    const json = await gptRes.json();
    const reply = json.choices[0].message.content;

    console.log("💬 GPT raw reply:\n", reply); // 🔍 확인 중요

    // GPT 응답이 JSON 형태인지 안전하게 파싱
    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch (e) {
      console.error("❌ JSON parsing error:", e);
      return res.status(500).json({ error: "Invalid JSON format from GPT", raw: reply });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("GPT fetch error:", err);
    return res.status(500).json({ error: "Failed to get GPT response" });
  }
});

// 1️⃣ 감정별 추천 키워드/장르 정의
const cubeMappings = {
  "lonely-night": {
    genres: "10749,18",  // Romance + Comedy
    message: "You’re not alone tonight. This film understands."
  },
  "stress-monday": {
    genres: "28,35",  // Comedy + Adventure
    message: "Lighten your heavy start of the week."
  },
  "happy-friends": {
    keywords: "4344",
    message: "Nothing heals like laughter together."
  },
  "sleepless-study": {
    genres: "99",// Animation + Comedy + Family
    message: "Ease your racing mind with a calming story."
  },
  "rainy-alone": {
    keywords: "6054",
    message: "Let the quiet scenes soothe your soul."
  },
  "overwhelmed-week": {
    keywords: "14544",
    message: "Let this film gently slow you down."
  },
  "motivation-monday": {
    keywords: "9715",
    message: "Fuel your fire to start again."
  },
  "night-anxiety": {
    genres: "16,10751",  // Animation + Comedy + Family
    message: "Something to hold your hand until sleep."
  },
  "post-social-fatigue": {
    genres: "16,18",
    message: "A quiet companion to recharge with."
  },
  "nostalgic-feels": {
    keywords: "207317",
    message: "A trip back in time, just for you."
  },
  "cozy-sunday": {
    genres: "10402",
    message: "Blanket, tea, and a warm story."
  },
  "hopeless-romantic": {
    genres: "10749",
    message: "Fall in love — even if it hurts."
  },
  "solo-meal": { 
    genres: "16,10751", 
    keywords: "179431",   
    message: "Dine with this story, not just food."
  },
  "bad-day": {
    genres: "28,53",
    message: "This film gets how you feel."
  },
  "friday-reset": {
    genres: "18,35",
    message: "Something fresh to recharge your vibe."
  }
};

app.get("/api/cube", async (req, res) => {
  const { cube } = req.query;
  const map = cubeMappings[cube];

  if (!map) return res.status(400).json({ message: "Invalid cube type" });

  const baseParams = {
    api_key: process.env.TMDB_API_KEY,
    sort_by: "popularity.desc",
    "vote_average.gte": 6.5,
    "vote_count.gte": 1000,
    language: "en-US",
    region: "US",
    "primary_release_date.gte": "2000-01-01",
    ...(map.keywords ? { with_keywords: map.keywords } : {}),
    ...(map.genres ? { with_genres: map.genres } : {})
  };

  try {

    let results = [];       // ✅ 여기 추가!
    let page = 1;
    // 최대 3페이지까지 시도
    while (results.length < 20 && page <= 10) {
      const params = { ...baseParams, page };
      const tmdbRes = await axios.get("https://api.themoviedb.org/3/discover/movie", { params });
      const newResults = tmdbRes.data.results || [];
      results = results.concat(newResults);
      page++;
    }

    // 중복 제거 + 최대 20개 제한
    const uniqueResults = Array.from(new Map(results.map(movie => [movie.id, movie])).values()).slice(0, 20);
    res.json({ message: map.message, results: uniqueResults }); // ✅ 여기서도 results -> uniqueResults
  } catch (err) {
    console.error("CUBE API ERROR:", err.message);
    res.status(500).json({ message: "Failed to fetch cube movies" });
  }
});

// count likes - comment page
app.post("/api/comments/:id/like", async (req, res) => {
  const commentId = parseInt(req.params.id);
  const { username } = req.body;

  if (!username || isNaN(commentId)) {
    return res.status(400).json({ message: "Invalid data." });
  }

  try {
    const [existing] = await db.query(
      "SELECT * FROM comment_likes WHERE comment_id = ? AND username = ?",
      [commentId, username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Already liked" });
    }

    await db.query(
      "INSERT INTO comment_likes (comment_id, username) VALUES (?, ?)",
      [commentId, username]
    );
    await db.query(
      "UPDATE comments SET like_count = like_count + 1 WHERE id = ?",
      [commentId]
    );

    res.json({ message: "Liked" });
  } catch (err) {
    console.error("Like comment error:", err);
    res.status(500).json({ message: "Failed to like comment." });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
