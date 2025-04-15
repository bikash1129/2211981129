require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
const TIMEOUT = 500;

const windowStore = [];

const urls = {
  p: 'http://20.244.56.144/evaluation-service/primes',
  f: 'http://20.244.56.144/evaluation-service/fibo',
  e: 'http://20.244.56.144/evaluation-service/even',
  r: 'http://20.244.56.144/evaluation-service/rand'
};

async function getAccessToken() {
  if (process.env.API_TOKEN) {
    console.log('Using mock token for testing...');
    return process.env.API_TOKEN;
  }

  try {
    console.log('Requesting token from:', process.env.AUTH_URL);
    console.log('With clientID:', process.env.CLIENT_ID);

    const response = await axios.post(process.env.AUTH_URL, {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET
    });

    console.log('Token response:', response.data);

    return response.data.access_token || response.data.token;
  } catch (error) {
    console.error('Failed to get token:', error.response?.data || error.message);
    return null;
  }
}

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;

  if (!['p', 'f', 'e', 'r'].includes(numberid)) {
    return res.status(400).json({ error: 'Invalid number ID. Use p, f, e, or r.' });
  }

  const url = urls[numberid];
  const windowPrevState = [...windowStore];

  const token = await getAccessToken();
  if (!token) {
    return res.status(500).json({ error: 'Authentication failed. Token not obtained.' });
  }

  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let newNumbers = Array.isArray(response.data?.numbers) ? response.data.numbers : [];
    const windowSet = new Set(windowStore);
    newNumbers = newNumbers.filter(n => !windowSet.has(n));
    for (const num of newNumbers) {
      if (windowStore.length >= WINDOW_SIZE) windowStore.shift();
      windowStore.push(num);
    }

    const average = windowStore.length > 0
      ? parseFloat((windowStore.reduce((a, b) => a + b, 0) / windowStore.length).toFixed(2))
      : 0;

    res.json({
      windowPrevState,
      windowCurrState: [...windowStore],
      numbers: newNumbers,
      avg: average
    });

  } catch (error) {
    console.error(`Error fetching from ${url}:`, error.message);
    res.json({
      windowPrevState,
      windowCurrState: [...windowStore],
      numbers: [],
      avg: windowStore.length > 0
        ? parseFloat((windowStore.reduce((a, b) => a + b, 0) / windowStore.length).toFixed(2))
        : 0
    });
  }
});

app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
