const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');

const app = express();

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.get('/metar', async (req, res) => {
  try {
    let station = req.query.station;
    const response = await axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`);
    
    const parser = new XMLParser();
    const parsed = parser.parse(response.data);
    const metar = parsed.response.data.METAR;
    if (typeof metar === 'undefined') {
      res.status(400).send('Not METAR found for that station');
    }
    
    const decodedMetar = decode(parsed.response.data.METAR.raw_text);
    res.status(200).send(decodedMetar);
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal Server Error')
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
