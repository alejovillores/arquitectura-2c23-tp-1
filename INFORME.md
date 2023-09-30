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

### Caso Base
#### Ping
<img width="952" alt="ping-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/eaec1f8a-53c2-4b29-b4b5-fbc72fd2747f">
<img width="941" alt="ping-main-response-time" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/8dbf07ae-0d92-4a14-9e70-7b221355342f">
<img width="948" alt="ping-main-resources" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/fe7fea80-1c79-4370-a588-4b12a860d474">

#### Metar
<img width="936" alt="metar-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/fc913d6e-3ef6-43d5-b824-72c9fcce2e16">
<img width="939" alt="metar-response-time-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/a9beedfe-6d00-46a7-8ee5-efe3c7450669">
<img width="946" alt="metar-resources-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/4d970b48-0ad3-4bef-96ef-887ed0cca11b">

#### Quote
<img width="945" alt="quote-main" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/4497f1af-667d-47d4-ba79-76e36e3c228e">
<img width="943" alt="quote-main-response-time" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/645fbbe5-d58a-4010-ba06-e9c142b85300">
<img width="937" alt="quote-main-resources" src="https://github.com/alejovillores/arquitectura-2c23-tp-1/assets/67125933/112eb6f7-4c17-4e93-9e6c-4ac56c86758b">


