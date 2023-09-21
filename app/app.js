const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const app = express();
const {
	HTTP_200,
	HTTP_400,
	HTTP_500,
	SPACEFLIGHT_API_URL,
	LIMIT,
	METAR_BASE_API_URL,
} = require('./constants');

/*
  ping service 
*/
app.get('/ping', (_, res) => {
	res.status(HTTP_200).send("I'm alive!");
});

/*
  metar service 
*/
app.get('/metar', async (req, res) => {
	try {
		let station = req.query.station;
		const response = await axios.get(
			`${METAR_BASE_API_URL}?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`
		);

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
});

/*
  spaceflight_news service 
*/
app.get('/spaceflight_news', async (_, res) => {
	try {
		const response = await axios.get(`${SPACEFLIGHT_API_URL}${LIMIT}`);

		news = response.data.results.map((article) => article.title);
		res.status(HTTP_200).send(news);
	} catch (err) {
		console.error(err);
		res.status(HTTP_500).send('Internal Server Error');
	}
});

const port = 3000;
app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
