require("dotenv").config();
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
});

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
    res.sendFile(path.join(__dirname, "public", "comment.html"));
  });
  

// 영화별 댓글 저장
app.post("/api/comments", (req, res) => {
  const { movie_id, username, comment, rating, parent_id } = req.body;

  if (!movie_id || !username || (!comment && !rating)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // parent_id가 있으면 대댓글로 저장
  const query = parent_id
    ? "INSERT INTO comments (movie_id, username, comment, rating, parent_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())"
    : "INSERT INTO comments (movie_id, username, comment, rating, created_at) VALUES (?, ?, ?, ?, NOW())";

  const params = parent_id
    ? [movie_id, username, comment || null, rating || null, parent_id]
    : [movie_id, username, comment || null, rating || null];

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "Review submitted!" });
  });
});




// 특정 영화의 댓글 불러오기
app.get("/api/comments/:movie_id", (req, res) => {
    const movie_id = req.params.movie_id;
    db.query(
        "SELECT * FROM comments WHERE movie_id = ? ORDER BY created_at DESC",
        [movie_id],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json(results);
        }
    );
});

// DELETE comment by ID
app.delete("/api/comments/:id", (req, res) => {
  const commentId = req.params.id;

  db.query("DELETE FROM comments WHERE id = ?", [commentId], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json({ message: "Comment deleted successfully" });
  });
});

app.put("/api/comments/:id", (req, res) => {
  const commentId = req.params.id;
  const { username, comment } = req.body;

  if (!username || !comment) {
    return res.status(400).json({ message: "Missing username or comment" });
  }

  // 1. 작성자 확인
  db.query("SELECT username FROM comments WHERE id = ?", [commentId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0) return res.status(404).json({ message: "Comment not found" });

    const owner = results[0].username;
    if (owner !== username) {
      return res.status(403).json({ message: "Unauthorized to edit this comment" });
    }

    // 2. 댓글 수정
    db.query("UPDATE comments SET comment = ? WHERE id = ?", [comment, commentId], (err2) => {
      if (err2) return res.status(500).json({ message: "Update failed" });
      res.json({ message: "Comment updated successfully" });
    });
  });
});


// 대댓글 저장
app.post("/api/replies", (req, res) => {
  const { comment_id, username, reply } = req.body;
  if (!comment_id || !username || !reply) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.query(
    "INSERT INTO replies (comment_id, username, reply) VALUES (?, ?, ?)",
    [comment_id, username, reply],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Reply added!" });
    }
  );
});

// 특정 댓글의 대댓글 가져오기
app.get("/api/replies/:comment_id", (req, res) => {
  const comment_id = req.params.comment_id;
  db.query(
    "SELECT * FROM replies WHERE comment_id = ? ORDER BY created_at ASC",
    [comment_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(results);
    }
  );
});

// 대댓글 수정
app.put("/api/replies/:id", (req, res) => {
  const replyId = req.params.id;
  const { username, reply } = req.body;

  if (!username || !reply) {
    return res.status(400).json({ message: "Missing username or reply" });
  }

  // 작성자 확인
  db.query("SELECT username FROM replies WHERE id = ?", [replyId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0) return res.status(404).json({ message: "Reply not found" });

    const owner = results[0].username;
    if (owner !== username) {
      return res.status(403).json({ message: "Unauthorized to edit this reply" });
    }

    // 수정
    db.query("UPDATE replies SET reply = ? WHERE id = ?", [reply, replyId], (err2) => {
      if (err2) return res.status(500).json({ message: "Update failed" });
      res.json({ message: "Reply updated successfully" });
    });
  });
});

// 대댓글 삭제
app.delete("/api/replies/:id", (req, res) => {
  const replyId = req.params.id;

  db.query("DELETE FROM replies WHERE id = ?", [replyId], (err, results) => {
    if (err) {
      console.error("Delete reply error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Reply not found" });
    }

    res.json({ message: "Reply deleted successfully" });
  });
});


// save 연결
app.get("/watchlist", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "watchlist.html"));
  });
  

app.get("/api/watchlist/:username", (req, res) => {
    const username = req.params.username;

    db.query(
        "SELECT * FROM watchlist WHERE username = ?",
        [username],
        (err, results) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(500).json({ message: "Database error" });
            }

            res.json(results);
        }
    );
});

// movie page 라우팅 추가
app.get("/movie", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "movie.html"));
  });
  
  
// watchlist 데이터베이스
app.post("/api/watchlist", (req, res) => {
  const { username, movie_id, title, poster_path, genre_ids } = req.body;

  if (!username || !movie_id || !title || !genre_ids) {
    return res.status(400).json({ message: "Missing fields." });
  }

  // ⭐ 중복 확인
  const checkSql = "SELECT * FROM watchlist WHERE username = ? AND movie_id = ?";
  db.query(checkSql, [username, movie_id], (err, results) => {
    if (err) {
      console.error("DB Error (check):", err);
      return res.status(500).json({ message: "Database error." });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: "⚠️ Already in watchlist." });
    }

    // ✅ 없으면 insert
    const insertSql = "INSERT INTO watchlist (username, movie_id, title, poster_path, genre_ids) VALUES (?, ?, ?, ?, ?)";
    db.query(insertSql, [username, movie_id, title, poster_path, JSON.stringify(genre_ids)], (err, result) => {
      if (err) {
        console.error("DB Error (insert):", err);
        return res.status(500).json({ message: "Database error." });
      }

      res.json({ message: "✅ Movie saved to watchlist!" });
    });
  });
});


// watchlist 
app.delete("/api/watchlist/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM watchlist WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Failed to delete:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Movie not found in watchlist" });
        }

        res.status(200).json({ message: "Deleted successfully" });
    });
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
