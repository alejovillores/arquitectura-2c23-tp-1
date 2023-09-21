const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const app = express();
const { HTTP_200, HTTP_400, HTTP_500 } = require('./constants');

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.get('/metar', async (req, res) => {
  try {
    let station = req.query.station;
    const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`);
    
    const parser = new XMLParser();
    const parsed = parser.parse(response.data);
    if (!parsed?.response?.data?.METAR?.raw_text) {
        res.status(HTTP_400).send('Not METAR found for that station');
    } else {
      const metar = decode(parsed.response.data.METAR.raw_text);
      res.status(HTTP_200).send(metar);
    }
  } catch (err) {
    console.error(err)
    res.status(HTTP_500).send('Internal Server Error')
  }
});

app.get('/spaceflight-news', async (req, res) => {
  try {
    let limit = req.query.limit;
    const response = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${limit}`);
    
    news = []
    response.data.results.forEach((article) => {
      news.push(article.title);
    });
    
    res.status(HTTP_200).send(news);
  } catch (err) {
    console.error(err)
    res.status(HTTP_500).send('Internal Server Error')
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
