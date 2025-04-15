const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;
const BASE_URL = 'http://20.244.56.144/evaluation-service';

app.get('/posts', async (req, res) => {
  try {
    const usersRes = await axios.get(`${BASE_URL}/users`);
    const users = usersRes.data.users;

    const userPostData = await Promise.all(
      Object.entries(users).map(async ([userId, userName]) => {
        try {
          const postsRes = await axios.get(`${BASE_URL}/users/${userId}/posts`);
          const posts = postsRes.data.posts || [];

          const postsWithComments = await Promise.all(
            posts.map(async (post) => {
              try {
                const commentsRes = await axios.get(`${BASE_URL}/posts/${post.id}/comments`);
                return {
                  id: post.id,
                  content: post.content,
                  comments: commentsRes.data.comments || []
                };
              } catch (err) {
                return { id: post.id, content: post.content, comments: [] };
              }
            })
          );

          return {
            userId: parseInt(userId),
            userName,
            posts: postsWithComments
          };
        } catch (err) {
          return { userId: parseInt(userId), userName, posts: [] };
        }
      })
    );

    res.json(userPostData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});