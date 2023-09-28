const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const app = express();
const {
	HTTP_200,
	HTTP_400,
	HTTP_500,
	LIMIT,
	OFFSET,
	REDIS_URL,
	METAR_TOLERANCE,
	SPACEFLIGHT_TOLERANCE,
	SPACEFLIGHT_API_URL,
	METAR_BASE_API_URL,
	QUOTE_BASE_API_URL,
} = require('./constants');

const { createClient } = require('redis');

const client = createClient({
	url: REDIS_URL
  });

init_redis = async () => {
	try {
		await client.connect();
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

/* Utils functions */
async function getValueFromCache(key) {
	const result = await client.get(key);
	return result != null ? JSON.parse(result) : result;
}

function outdatedData(oldTimestamp, tolerance) {
	let now = Date.now();
	let secondsDiff = Math.floor(Math.abs(now - oldTimestamp) / 1000);
	console.log(`The time difference is : ${secondsDiff} secs`);
	return secondsDiff > tolerance;
}

function parseMetarResponse(data) {
	const parser = new XMLParser();
	const parsed = parser.parse(data);
	return parsed?.response?.data?.METAR?.raw_text;
}

/*
	Ping Service 
*/
app.get('/ping', async (_, res) => {
	res.status(HTTP_200).send(`I'm alive!`);
});

/*
	Metar Service 
*/
app.get('/metar', async (req, res) => {
	if (req.query.station) {
		let station = req.query.station;
		let savedData = await getValueFromCache(station);
		if (
			savedData === null ||
			outdatedData(savedData.timestamp, METAR_TOLERANCE)
		) {
			try {
				console.log('Sending request to spaceflight api');

				const response = await axios.get(
					`${METAR_BASE_API_URL}?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`
				);
				const info = parseMetarResponse(response.data);
				if (info) {
					const metar = decode(info);
					await client.set(
						station,
						JSON.stringify({
							station: metar,
							timestamp: Date.now(),
						})
					);
					res.status(HTTP_200).send(metar);
				} else {
					res.status(HTTP_400).send('Not METAR found for that station');
				}
			} catch (err) {
				console.error(err);
				res.status(HTTP_500).send('Internal Server Error');
			}
		} else {
			console.log('Data already in cache');
			res.status(HTTP_200).send(savedData.station);
		}
	} else {
		res.status(HTTP_400).send('No station supplied');
	}
});

/*
	Spaceflight News Service 
*/
app.get('/spaceflight_news', async (_, res) => {
	const savedData = await getValueFromCache('spaceflight_news');
	if (
		savedData === null ||
		outdatedData(savedData.timestamp, SPACEFLIGHT_TOLERANCE)
	) {
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

/*
	Quotes Service 
*/
app.get('/quote', async (_, res) => {
	const qoutesSaved = await getValueFromCache('quotes');
	const qouteOffset = await client.get('quotes-offset');
	if (qoutesSaved === null || parseInt(qouteOffset) === OFFSET + 1) {
		try {
			console.log('No quotes saved in memory, sending requests');
			const response = await axios.get(`${QUOTE_BASE_API_URL}`);
			let qoutes = response.data.map((qoute) => {
				return {
					content: qoute.content,
					author: qoute.author,
				};
			});
			console.log(JSON.stringify(qoutes));
			await client.set(
				'quotes',
				JSON.stringify({
					quotes: qoutes,
				})
			);
			let initialOffset = 2;
			await client.set('quotes-offset', initialOffset);

			quote = qoutes[0];
			res.status(HTTP_200).send(quote);
		} catch (err) {
			console.error(err);
			res.status(HTTP_500).send('Internal Server Error');
		}
	} else {
		console.log('Qoutes saved in memory');
		let offset = parseInt(qouteOffset);
		let quote = qoutesSaved.quotes[offset - 1];
		await client.set('quotes-offset', offset + 1);
		res.status(HTTP_200).send(quote);
	}
});

const port = 3000;
app.listen(port, () => {
	init_redis();
	console.log(`Server listening on port ${port}`);
});
