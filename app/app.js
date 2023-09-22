const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const app = express();
const {
	HTTP_200,
	HTTP_301,
	HTTP_400,
	HTTP_500,
	SPACEFLIGHT_API_URL,
	LIMIT,
	METAR_BASE_API_URL,
	REDIS_URL,
} = require('./constants');

const redis = require('redis');
const createClient = redis.createClient;

const client = createClient();

init_redis = async () => {
	try {
		await client.connect({
			url: `${REDIS_URL}`,
		});
		console.log('db connected');
	} catch (error) {
		client.on('error', (err) => console.log('Redis Client Error', err));
	}
};

process.on('SIGINT', async () => {
	console.log('finishing connection!');
	await client.disconnect();
	process.exit();
});

app.get('/', (_, res) => {
	res.status(HTTP_301).redirect('/ping');
});

/*
  ping service 
*/
app.get('/ping', async (_, res) => {
	res.status(HTTP_200).send(`I'm alive!, the stored value is ${value}`);
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
	const savedData = await client.get('spaceflight_news');
	if (savedData == null) {
		try {
			console.log('news are not in cache');

			const response = await axios.get(`${SPACEFLIGHT_API_URL}${LIMIT}`);
			let news = response.data.results.map((article) => article.title);
			await client.set(
				'spaceflight_news',
				JSON.stringify({
					news: news,
				})
			);
			res.status(HTTP_200).send(news);
		} catch (error) {
			console.error(err);
			res.status(HTTP_500).send('Internal Server Error');
		}
	} else {
		console.log('news are in cache');
		let news = JSON.parse(savedData).news;
		res.status(HTTP_200).send(news);
	}
});

const port = 3000;
app.listen(port, () => {
	init_redis();
	console.log(`Server listening on port ${port}`);
});
