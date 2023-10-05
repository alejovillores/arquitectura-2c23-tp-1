const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const app = express();
const StatsD = require('node-statsd');
const { performance } = require('perf_hooks');
const {
    HTTP_200,
    HTTP_400,
    HTTP_500,
    SPACEFLIGHT_API_URL,
    LIMIT,
    METAR_BASE_API_URL,
    QUOTE_BASE_API_URL,
} = require('./constants');

statsd_client = new StatsD({
    "host": "graphite",
    "port": 8125,
});


/*
    Ping Service 
*/
app.get('/ping', (_, res) => {
    const start = performance.now();
    console.log('Get Ping Request')
    res.status(HTTP_200).send("I'm alive!");
    const end = performance.now();
    const elapsed = end - start;
    statsd_client.timing('ping.response_time', elapsed);
});

/*
    Metar Service 
*/
app.get('/metar', async (req, res) => {
    const start = performance.now();
    try {
        console.log('Get Metar Request')
        let station = req.query.station;
        const ext_start = performance.now();
        const response = await axios.get(
            `${METAR_BASE_API_URL}?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`
        );
        statsd_client.timing('metar.ext.response_time', performance.now() - ext_start);
        const parser = new XMLParser();
        const parsed = parser.parse(response.data);
        if (!parsed?.response?.data?.METAR?.raw_text) {
            res.status(HTTP_400).send('Not METAR found for that station');
        } else {
            const metar = decode(parsed.response.data.METAR.raw_text);
            res.status(HTTP_200).send(metar);
        }
    } catch (err) {
        console.error(err);
        res.status(HTTP_500).send('Internal Server Error');
    }
    const elapsed = performance.now() - start;
    statsd_client.timing('metar.response_time', elapsed);
});

/*
    Spaceflight News Service 
*/
app.get('/spaceflight_news', async (_, res) => {
    const start = performance.now();    
    try {
        console.log('Get Spaceflight News Request')
        const ext_start = performance.now();
        const response = await axios.get(`${SPACEFLIGHT_API_URL}${LIMIT}`);
        statsd_client.timing('spaceflight_news.ext.response_time', performance.now() - ext_start);
        
        news = response.data.results.map((article) => article.title);
        res.status(HTTP_200).send(news);
    } catch (err) {
        console.error(err);
        res.status(HTTP_500).send('Internal Server Error');
    }
    const elapsed = performance.now() - start;
    statsd_client.timing('spaceflight_news.response_time', elapsed);
});

/*
    Quotes Service 
*/
app.get('/quote', async (_, res) => {
    const start = performance.now();
    try {
        console.log('Get Quote Request')
        const ext_start = performance.now();
        const response = await axios.get(`${QUOTE_BASE_API_URL}`);
        statsd_client.timing('quote.ext.response_time', performance.now() - ext_start);

        quote = response.data[0];
        
        res.status(HTTP_200).send({"quote": quote.content,"author": quote.author});
    } catch (err) {
        console.error(err);
        res.status(HTTP_500).send('Internal Server Error');
    }
    const elapsed = performance.now() - start;
    statsd_client.timing('quote.response_time', elapsed);
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
