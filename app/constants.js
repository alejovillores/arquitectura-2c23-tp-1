/* HTTP CODE NUMBERS */
const HTTP_200 = 200;
const HTTP_400 = 400;
const HTTP_500 = 500;

/* DB URL */
REDIS_URL = 'redis://redis:6379';

/* EXTERNALS API URL  */
const SPACEFLIGHT_API_URL =
	'https://api.spaceflightnewsapi.net/v4/articles/?limit=';

const LIMIT = 5;
const SPACEFLIGHT_TOLERANCE = 30; // 30 secs

const METAR_BASE_API_URL =
	'https://www.aviationweather.gov/adds/dataserver_current/httpparam';

const METAR_TOLERANCE = 3600; // one hour
const QUOTE_BASE_API_URL = 'https://api.quotable.io/quotes/random?limit=20';
const OFFSET = 20;

module.exports = {
	HTTP_200,
	HTTP_400,
	HTTP_500,
	SPACEFLIGHT_API_URL,
	LIMIT,
	OFFSET,
	METAR_BASE_API_URL,
	REDIS_URL,
	SPACEFLIGHT_TOLERANCE,
	METAR_TOLERANCE,
	QUOTE_BASE_API_URL,
};
