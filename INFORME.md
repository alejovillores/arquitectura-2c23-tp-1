# TP1

## Integrantes

- [Capón Blanquer, Mateo](https://github.com/mateocapon)
- [Dituro, Celeste](https://github.com/celedituro)
- [Gomez, Joaquin](https://github.com/joaqogomez)
- [Villores, Alejo](https://github.com/alejovillores)

## Ejecución del programa

1. Ejecutar `docker-compose up -d [--build]` para descargar las imagenes y levantar los contenedores, con el flag ``--build`` vuelve a construir la imagen declarada en el Dockerfile.
2. Ejecutar `docker-compose stop` para detener la ejecución de los contenedores.
3. Ejecutar `docker-compose down [-v]` para remover los contenedores, la red y si el flag ``-v`` se encuentra, borra los volumenes creados.

### Importante! 
> **Recuerde que cada vez que cambie de rama, al levantar el docker, debe hacerlo utilizando el  flag `--build ` para poder construir el contenedor acorde a la branch**

## Tácticas

Hemos optado por implementar diversas estrategias en ramas separadas de nuestro repositorio. Estos son los nombres de las ramas y las tácticas que contienen:

- ``load_balancer:`` Esta rama incorpora la estrategia de Balanceador de Carga.
- ``rate_limiting:`` En esta rama se encuentra la estrategia de límite de velocidad utilizando NGINX.
- ``caching:`` La rama "caching" contiene la estrategia de almacenamiento en caché con Redis.

Esta organización nos permite mantener un control claro sobre las estrategias implementadas en cada rama del repositorio y facilita la colaboración y el seguimiento de las diferentes tácticas utilizadas en nuestro proyecto.

### Load Balancer

Ejecutar el docker compose con el siguiente parámetro para escalar el servicio.
```bash
docker compose up -d --scale node=3
```

Como segunda alternativa, se puede cambiar el archivo `docker-compose.yml` en el servicio node agregandole un numero a escalar. La desventaja de esto es que se debe modificar el numero cuando se desea probar diferentes replicas.

```yml
    node:
        build: ./app
        links:
            - redis
        scale: <n>
 ```

### Rate Limiting
El archivo de configuración de NGINX se ha actualizado para incluir la configuración de limitación de velocidad (rate limiting). 

```nginx
upstream api {
    server arquitectura-2c23-tp-1-node-1:3000;
}

# Limitamos el número de solicitudes a un máximo de 15 por segundo por IP.
# Se almacenan las últimas 10Mb de registros para alrededor de 160,000 IPs.
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=15r/s;

server {
    listen 80;

    location /api/ {
        # El valor "burst" define la cola de solicitudes adicionales permitidas más allá de la velocidad definida.
        # Utilizamos "nodelay" para que los clientes no perciban que la API se vuelve más lenta.
        limit_req zone=mylimit burst=20 nodelay;

        proxy_pass http://api/;
    }
}
```

### Caching

Para ciertos endpoints, hemos implementado una estrategia de "lazy-caching". En esta estrategia, después de la primera solicitud realizada por el usuario, almacenamos en caché las respuestas en función de diferentes condiciones específicas de las APIs.

En otras palabras, hemos aplicado dos enfoques de caché distintos:

1. **Caché Basado en Tiempo:** Para algunas APIs, hemos implementado un sistema de caché que almacena las respuestas durante un período de tiempo específico. Esta decisión fue tomada en colaboración con el equipo y se basa en las necesidades y características de cada API.

2. **Caché con Offset para /quotes:** En el caso de la URL `/quotes`, hemos adoptado una estrategia diferente. Utilizamos un "offset" dentro de una lista que contiene 20 citas. Este offset avanza con cada solicitud, y una vez que alcanza el límite, se reinicia y se solicitan otras 20 citas nuevas. Estas nuevas 20 citas se almacenan en caché, y el proceso se repite.

Esta estrategia de caché "lazy" nos permite optimizar el rendimiento al reducir la necesidad de realizar solicitudes frecuentes al servidor para los mismos datos. Cada enfoque de caché se elige cuidadosamente en función de los requisitos específicos de cada API, lo que mejora la eficiencia y la velocidad de respuesta de nuestro sistema.

## Métricas

Dado que el trabajo práctico aborda diversos casos, se han definido diversas métricas para evaluar cómo responde la API a diferentes volúmenes de solicitudes. Para lograr esto, se llevaron a cabo distintos escenarios y se obtuvieron métricas que serán analizadas posteriormente.

Los endpoints de nuestra API tienen una performance variada. Desde ya, el llamado a PING es mucho más performante que el llamado a METAR, por ejemplo, porque este último necesita hacer un request a una API externa. Además, cada una de las APIs externas tienen sus restricciones características. Es por esto que definimos para cada endpoint PING, QUOTE, METAR Y SPACEFLIGHT NEWS, un archivo de configuración del test de Artillery diferente.

Todos los archivos de configuración tienen una estructura similar, con intervalos de igual tiempo, pero con un arrivalRate distinto según la performance de cada endpoint.

Todos los tests tienen 4 fases principales. Una primera fase que aumenta la cantidad de requests por segundo hasta un valor bajo. Luego, se mantienen las consultas por 30 segundos a ese rate. A continuación se vuelve a agregar carga hasta llegar a un valor que exige a la aplicación. Se conserva este valor por otros 30 segundos.
Agregamos una última fase de pocos segundos para hacer un cool down de los requests, de tal modo que se pueda visualizar el escenario de prueba. 

A continuación mostramos los resultados obtenidos de cada uno de los endpoints definidos diferenciados por la táctica utilizada. 

### Caso Base

Este es el escenario principal, en el cual no se ha aplicado ninguna técnica para mejorar el rendimiento o la seguridad.

**Vista Components & Connectors**

<img width="455" alt="image" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/8fce4ac9-b3ee-4b5d-9c79-f9e41bc532c9">

El load balancer recibe solicitudes, por medio de Artillery o de un navegador web, y se las envia al servidor Node. Dependiendo de qué tipo de solicitud recibe este servidor, consulta o no a las apis externas. Las métricas obtenidas a partir del load test realizado con Artillery se almancenan en la base de datos de Graphite.

#### Ping

Se puede observar como varían las diferentes etapas del escenario correspondiente en el que todas las peticiones son procesadas de manera satisfactoria con un máximo de 100 solicitudes

<img width="952" alt="ping-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/ping.png">

A su vez, se puede ver que el Response Time tiene una media de 13 ms y un valor máximo de 98.5ms

#### Metar

En el caso base del endpoint metar, se puede observar que todas las peticiones son procesadas de manera satisfactoria con un máximo de 50 solicitudes

<img width="936" alt="metar-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/metar.png">
<img width="939" alt="metar-resources" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/metar-m.png">

A su vez, se puede ver que el Response Time tiene una media de 94.1 ms y un valor máximo de 552ms

#### Quote
En el caso base del endpoint quote, se puede observar que todas las peticiones son procesadas de manera satisfactoria con un máximo de 50 solicitudes

<img width="945" alt="quote-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/quote-13-sobre-259-http500.png">
<img width="943" alt="quote-resources" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/quote-m.png">

A su vez, se puede ver que el Response Time tiene una media de 617ms y un valor máximo de 1.8s

#### Spaceflight News

En el caso base del endpoint Spaceflight News, se puede observar un maximo de 250 solicitudes. En este endpoint podemos observar que hubieron varios errores que corresponden a errores 500 por parte del servidor y errores por timeout.

<img width="950" alt="spacenews-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/space-41-con-http500-148-con-timeout-sobre-866.png">
<img width="936" alt="spacenews-resources" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-basic/space-m.png">

A su vez, se puede ver que el Response Time tiene una media de 3.26s y un valor máximo de 9.81s

### Caché

Recopilamos las métricas de los puntos finales en los que hemos implementado la estrategia de almacenamiento en caché.\
Estos son: `/metar`, `/quote` y `/spaceflight_news`.

**Vista Components & Connectors**

<img width="383" alt="image" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/a36d2f46-7268-4ad7-b34e-96c3392cdc5e">

El load balancer recibe solicitudes, por medio de Artillery o de un navegador web, y se las envia al servidor Node. Dependiendo de qué tipo de solicitud recibe este servidor, consulta o no a las apis externas y guarda la respuesta a la consulta en la base de datos en memoria de Redis. Las métricas obtenidas a partir del load test realizado con Artillery se almancenan en la base de datos de Graphite.

#### Metar
<img width="942" alt="metar-main-cache" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-cache/metar.png">
<img width="938" alt="metar-resources-cache" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-cache/metar-res.png">

#### Quote
<img width="944" alt="quote-main-cache" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-cache/quote.png">
<img width="941" alt="quote-resources-cache" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-cache/quote-res.png">

#### Spaceflight News
<img width="942" alt="space-main-cache" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-cache/space.png">
<img width="944" alt="space-resources-cache" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-cache/space.res.png">

### Rate limiting

**Vista Components & Connectors**

<img width="455" alt="image" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/8fce4ac9-b3ee-4b5d-9c79-f9e41bc532c9">

Es la misma vista que la del caso base: El load balancer recibe solicitudes, por medio de Artillery o de un navegador web, y se las envia al servidor Node. Dependiendo de qué tipo de solicitud recibe este servidor, consulta o no a las apis externas. Las métricas obtenidas a partir del load test realizado con Artillery se almancenan en la base de datos de Graphite.

#### Ping
<img width="942" alt="ping-main-rateLimit" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/rate_limit/ping.png">

#### Metar
<img width="942" alt="metar-main-rateLimit" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/rate_limit/metar-98req-con-400-sobre-263.png">

#### Quote
<img width="944" alt="quote-main-rateLimit" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/rate_limit/quote-29HTTP500-7Timeout-sobre-266req.png">

#### Spaceflight News
<img width="942" alt="space-main-rateLimit" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/rate_limit/space-221HTTP503-sobre-852req.png">

### Load Balancer

**Vista Components & Connectors**

<img width="361" alt="image" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/fe4b4a62-83d4-4ca6-9c00-381e9426194b">

El load balancer recibe solicitudes, por medio de Artillery o de un navegador web, y se las envia a una de las 3 instancias que hay del servidor Node. Dependiendo de qué tipo de solicitud recibe cada servidor Node, consulta o no a las apis externas. Las métricas obtenidas a partir del load test realizado con Artillery se almancenan en la base de datos de Graphite.

#### Ping
<img width="942" alt="ping-main-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/ping.jpeg">
<img width="942" alt="ping-resources-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/ping-mem.jpeg">

#### Metar
<img width="942" alt="metar-main-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/metar.jpeg">
<img width="942" alt="metar-resources-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/metar-m.jpeg">

#### Quote
<img width="944" alt="quote-main-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/quote-22-sobre-239-paquetes-caidos-http500.jpeg">
<img width="944" alt="quote-resources-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/quote-m.jpeg">

#### Spaceflight News
<img width="942" alt="space-main-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/space-38-TIMEOUT-809OK.jpeg">
<img width="942" alt="space-resources-loadBalancer" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/resultados-load-balancer/space-m.jpeg">

## Response time Api Gateway vs Api en caso base

### Todas
<img width="942" alt="space-resources-durations" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/api-durations/all.png">

### Metar

En la imagen siguiente, se observa que los tiempos de respuesta de la API externa `/metar` parecen ser más rápidos en comparación con los tiempos de respuesta de la API interna. La diferencia más significativa se evidencia a las `15:17:00`, donde la discrepancia en milisegundos es aproximadamente de 10 ms.

<img width="942" alt="meta-resources-durations" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/api-durations/metar.png">

### Quote

Para el endpont de `/qoute` sucede algo similar, lo cual tiene total sentido que asi sea. Se puede ver que el response time de la api externa es menor que la api interna. Se ve que la mayor diferencia se da entre los minutos `15:21:15` y `15:21:45`

<img width="942" alt="qoute-resources-durations" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/api-durations/quote.png">

### Spaceflight News

Algo particular se dio con la ruta `/spaceflight_news` que no tuvo diferencia entre la api externa y la api interna.

<img width="942" alt="space-resources-durations" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/blob/main/results/api-durations/spaceflight_news.png">