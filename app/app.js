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
	ALLOWED_SECONDS,
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

async function cache(key) {
	const result = await client.get(key);
	return result != null ? JSON.parse(result) : result;
}

/*
ping service 
*/
app.get('/ping', async (_, res) => {
	res.status(HTTP_200).send(`I'm alive!, the stored value is ${value}`);
});

app.get('/', (_, res) => {
	res.status(HTTP_301).redirect('/ping');
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

function outdatedData(oldTimestamp) {
	let now = Date.now();
	let secondsDiff = Math.floor(Math.abs(now - oldTimestamp) / 1000);
	console.log(`The time difference is : ${secondsDiff} secs`);
	return secondsDiff > ALLOWED_SECONDS;
}

app.get('/spaceflight_news', async (_, res) => {
	const savedData = await cache('spaceflight_news');
	if (savedData == null || outdatedData(savedData.timestamp)) {
		try {
			console.log('Sending request to spaceflight api');
			const response = await axios.get(`${SPACEFLIGHT_API_URL}${LIMIT}`);
			let news = response.data.results.map((article) => article.title);
			await client.set(
				'spaceflight_news',
				JSON.stringify({
					news: news,
					timestamp: Date.now(),
				})
			);
			res.status(HTTP_200).send(news);
		} catch (error) {
			console.error(err);
			res.status(HTTP_500).send('Internal Server Error');
		}
	} else {
		console.log('News are in cache');
		let news = savedData.news;
		res.status(HTTP_200).send(news);
	}
});

const port = 3000;
app.listen(port, () => {
	init_redis();
	console.log(`Server listening on port ${port}`);
});
