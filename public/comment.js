

async function loadMovieAndComments() {
  const title = document.getElementById("movieTitle").value.trim();
  if (!title) return alert("Please enter a movie title");

  const res = await fetch(`/api/search?query=${encodeURIComponent(title)}`);
  const data = await res.json();
  if (data.results.length === 0) {
    alert("No movie found");
    return;
  }

  const movie = data.results[0];
  const movieId = movie.id;
  // redirect to movie-comment.html with movieId
  window.location.href = `movie-comment.html?movieId=${movieId}`;
}

async function fetchComments(movieId) {
    
    const res = await fetch(`/api/comments/${movieId}`);
    const comments = await res.json();
    const currentUser = localStorage.getItem("username");
  
    const container = document.getElementById("commentsContainer");
    container.innerHTML = `<h4><i class="fas fa-comments"></i> Comments:</h4>`;

  
    if (comments.length === 0) {
      container.innerHTML += "<p>No comments yet.</p>";
      return;
    }
  
    for (const comment of comments) {
      const stars = comment.rating
        ? "★".repeat(comment.rating) + ` (${comment.rating}/5)`
        : "";
    
      const isOwner = comment.username === currentUser;
      const safeComment = comment.comment ? comment.comment.replace(/'/g, "\\'") : "";
    
      const div = document.createElement("div");
      div.className = "comment-box";
      div.setAttribute("data-id", comment.id);
    
      div.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <p style="margin: 0;"><strong>${comment.username}</strong> (${new Date(comment.created_at).toLocaleString()})</p>
    <div style="font-size: 12px; color: #aaa;">
      ${isOwner ? `
        <span style="margin-right: 10px; cursor:pointer;" onclick="deleteComment(${comment.id})">Delete</span>
        ${comment.comment ? `<span style="margin-right: 10px; cursor:pointer;" onclick="startEditComment(${comment.id}, '${safeComment}')">Edit</span>` : ""}
      ` : ""}
      <span style="cursor:pointer;" onclick="toggleReplyInput(${comment.id})">Reply</span>
    </div>
  </div>
  ${stars ? `<p style="margin: 4px 0;">Rating: ${stars}</p>` : ""}
  ${comment.emotion ? `
  <div style="margin: 4px 0;">
    ${comment.emotion.split(',').map(e => `<span class="emotion-tag">${e}</span>`).join(' ')}
  </div>` : ""
}
  ${comment.comment ? `<p class="comment-text">${comment.comment}</p>` : ""}
  <div class="reply-input" id="reply-input-${comment.id}" style="display:none; margin-top:10px;">
    <textarea id="reply-text-${comment.id}" rows="2" style="width:100%;"></textarea><br>
    <button onclick="submitReply(${comment.id})">
      <i class="fas fa-paper-plane"></i> Submit Reply
    </button>
  </div>
`;

    
      container.appendChild(div);
      await fetchReplies(comment.id, div);
    }
  }    
  
  async function fetchReplies(commentId, container) {
    const res = await fetch(`/api/replies/${commentId}`);
    const replies = await res.json();
    const currentUser = localStorage.getItem("username");
  
    replies.forEach(reply => {
      const isOwner = reply.username === currentUser;
      const safeReply = reply.reply ? reply.reply.replace(/'/g, "\\'") : "";
  
      const replyDiv = document.createElement("div");
      replyDiv.className = "reply-box";
      replyDiv.setAttribute("data-id", reply.id);
      replyDiv.style.marginLeft = "20px";
      replyDiv.style.borderTop = "1px dashed #444";
      replyDiv.style.paddingTop = "6px";
      replyDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0;"><strong>${reply.username}</strong> (${new Date(reply.created_at).toLocaleString()})</p>
          ${isOwner ? `
          <div style="font-size: 12px; color: #aaa;">
            <span style="margin-right: 10px; cursor:pointer;" onclick="deleteReply(${reply.id})">Delete</span>
            <span style="cursor:pointer;" onclick="startEditReply(${reply.id}, '${safeReply}')">Edit</span>
          </div>` : ""}
        </div>
        <p class="reply-text">${reply.reply}</p>
      `;
      container.appendChild(replyDiv);
    });
  }
  
  async function deleteReply(replyId) {
    
    if (!confirm("Are you sure you want to delete this reply?")) return;
  
    try {
      const res = await fetch(`/api/replies/${replyId}`, {
        method: "DELETE",
      });
  
      if (!res.ok) throw new Error(await res.text());
  
      fetchComments(localStorage.getItem("currentMovieId"));
    } catch (err) {
      alert("Failed to delete reply: " + err.message);
    }
  }
  
  function startEditReply(replyId, oldReply) {
    
    const replyBox = document.querySelector(`.reply-box[data-id="${replyId}"]`);
    replyBox.innerHTML = `
      <div style="padding-left: 10px; margin-top: 10px;">
        <textarea id="editReplyInput" rows="2" style="width: calc(100% - 10px); padding: 6px; border-radius: 6px; border: none; resize: vertical; background-color: #1a1a1a; color: white;">${oldReply}</textarea>
        <div style="display: flex; gap: 10px; margin-top: 8px;">
          <span style="cursor: pointer; color: #f60;" onclick="submitEditReply(${replyId})">
            <i class="fas fa-save"></i> Save
          </span>
          <span style="cursor: pointer; color: #ccc;" onclick="fetchComments(${localStorage.getItem("currentMovieId")})">
            <i class="fas fa-xmark"></i> Cancel
          </span>
        </div>
      </div>
    `;
  }

  async function submitEditReply(replyId) {
    const newReply = document.getElementById("editReplyInput").value.trim();
    const username = localStorage.getItem("username");
  
    if (!newReply) return alert("Reply cannot be empty.");
  
    try {
      const res = await fetch(`/api/replies/${replyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, reply: newReply })
      });
  
      if (res.ok) {
        fetchComments(localStorage.getItem("currentMovieId"));
      } else {
        const err = await res.json();
        alert(err.message || "Failed to edit reply.");
      }
    } catch (err) {
      alert("Error editing reply: " + err.message);
    }
  }
  
  
  

  function toggleReplyInput(commentId) {
    const inputDiv = document.getElementById(`reply-input-${commentId}`);
    inputDiv.style.display = inputDiv.style.display === "none" ? "block" : "none";
  }
  
  async function submitReply(commentId) {
    const username = localStorage.getItem("username");
    const replyText = document.getElementById(`reply-text-${commentId}`).value.trim();
    if (!username) return alert("Please log in to reply.");
    if (!replyText) return alert("Reply cannot be empty.");
  
    const res = await fetch("/api/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_id: commentId, username, reply: replyText })
    });
  
    if (res.ok) {
      fetchComments(localStorage.getItem("currentMovieId")); // refresh
    } else {
      alert("Failed to submit reply.");
    }
  }
  
  function startEditComment(commentId, oldComment) {
    const commentBox = document.querySelector(`.comment-box[data-id="${commentId}"]`);
    const currentText = oldComment;
  
    commentBox.innerHTML = `
    <div style="padding-left: 20px; margin-top: 10px; margin-bottom: 10px;">
    <textarea id="editInput" rows="3" style="width: calc(100% - 20px); padding: 8px; border-radius: 6px; border: none; resize: vertical; background-color: #1a1a1a; color: white;"></textarea>
    <div style="display: flex; gap: 10px; margin-top: 8px;">
      <span style="cursor: pointer; color: #f60;" onclick="submitEditComment(${commentId})">
        <i class="fas fa-save"></i> Save
      </span>
      <span style="cursor: pointer; color: #ccc;" onclick="fetchComments(${localStorage.getItem("currentMovieId")})">
        <i class="fas fa-xmark"></i> Cancel
      </span>
    </div>
  </div>
`;
    document.getElementById("editInput").value = currentText;
  }
  

async function submitEditComment(commentId) {
    const newComment = document.getElementById("editInput").value.trim();
    const username = localStorage.getItem("username");

    if (!newComment) return alert("Comment cannot be empty");

    try {
        const res = await fetch(`/api/comments/${commentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, comment: newComment })
        });

        const data = await res.json();

        if (res.ok) {
            fetchComments(localStorage.getItem("currentMovieId"));
        } else {
            alert(data.message || "Failed to update comment");
        }
    } catch (err) {
        console.error(err);
        alert("Error editing comment");
    }
}


async function submitComment() {
  const movieId = localStorage.getItem("currentMovieId");
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const comment = document.getElementById("commentInput").value.trim();
  const rating = parseInt(document.getElementById("ratingSelect").value);
  const emotion = document.getElementById("selectedEmotions").value; // 감정 값 추가

  if (!username || !token) return alert("Please log in first.");
  if (!comment && !rating) return alert("Please write a comment or give a rating.");

  const res = await fetch("/api/comments", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ movie_id: movieId, username, comment, rating, emotion }) // 감정 포함
  });

  const data = await res.json();
  if (res.ok) {
      document.getElementById("commentInput").value = "";
      document.getElementById("ratingSelect").value = "";
      document.getElementById("selectedEmotions").value = ""; // 감정 초기화
      document.querySelectorAll(".emotion-btn").forEach(btn => btn.classList.remove("selected")); // 버튼 상태 초기화
      fetchComments(movieId);
  } else {
      alert(data.message || "Failed to submit comment");
  }
}

async function deleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
        const res = await fetch(`/api/comments/${commentId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const text = await res.text(); // JSON이 아닐 수 있음
            throw new Error(text);
        }

        const data = await res.json();
        const movieId = localStorage.getItem("currentMovieId");
        fetchComments(movieId);

    } catch (err) {
        alert("Failed to delete comment: " + err.message);
    }
}

