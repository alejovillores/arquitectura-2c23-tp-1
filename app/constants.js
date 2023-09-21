/* HTTP CODE NUMBERS */
const HTTP_200 = 200;
const HTTP_400 = 400;
const HTTP_500 = 500;

/* EXTERNALS API URL  */
const SPACEFLIGHT_API_URL =
	'https://api.spaceflightnewsapi.net/v4/articles/?limit=';
const LIMIT = 5;

const METAR_BASE_API_URL =
	'https://www.aviationweather.gov/adds/dataserver_current/httpparam';

module.exports = {
	HTTP_200,
	HTTP_400,
	HTTP_500,
	SPACEFLIGHT_API_URL,
	LIMIT,
	METAR_BASE_API_URL,
};
