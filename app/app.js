const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const app = express();
const StatsD = require('hot-shots')
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

const statsd_client = new StatsD({
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
    const elapsed = performance.now() - start;
    // Usamos Gauge porque timing no nos anduvo.
    statsd_client.gauge('response_time.api.ping', elapsed);
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
        const elapsed_ext = performance.now() - ext_start
        const parser = new XMLParser();
        const parsed = parser.parse(response.data);
        if (!parsed?.response?.data?.METAR?.raw_text) {
            res.status(HTTP_400).send('Not METAR found for that station');
        } else {
            const metar = decode(parsed.response.data.METAR.raw_text);
            res.status(HTTP_200).send(metar);
            const elapsed = performance.now() - start;
            statsd_client.gauge('response_time.ext.metar', elapsed_ext);
            statsd_client.gauge('response_time.api.metar', elapsed);
        }
    } catch (err) {
        console.error(err);
        res.status(HTTP_500).send('Internal Server Error');
    }
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
        const elapsed_ext = performance.now() - ext_start;
        
        news = response.data.results.map((article) => article.title);
        res.status(HTTP_200).send(news);
        const elapsed = performance.now() - start;
        statsd_client.gauge('response_time.ext.spaceflight_news', elapsed_ext);
        statsd_client.gauge('response_time.api.spaceflight_news', elapsed);
    } catch (err) {
        console.error(err);
        res.status(HTTP_500).send('Internal Server Error');
    }
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
        const elapsed_ext = performance.now() - ext_start
        quote = response.data[0];
        
        res.status(HTTP_200).send({"quote": quote.content,"author": quote.author});
        const elapsed = performance.now() - start;
        statsd_client.gauge('response_time.ext.quote', elapsed_ext);
        statsd_client.gauge('response_time.api.quote', elapsed);
    } catch (err) {
        console.error(err);
        res.status(HTTP_500).send('Internal Server Error');
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
