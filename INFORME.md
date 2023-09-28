# TP1

## Integrantes

- Capón Blanquer, Mateo
- Dituro, Celeste
- Gomez, Joaquin
- Villores, Alejo

## Ejecución del programa

1. Ejecutar `docker-compose up -d` para descargar las imagenes y levantar los contenedores.
2. Ejecutar `docker-compose stop` para detener la ejecución de los contenedores.

## Tácticas
Decidimos implementar distintas tácticas en ramas del repositorio.
Los nombres de las ramas son:
* load_balancer: Incluye la táctica de Load Balancer.
* feature-caching: Incluye la táctica de caché con Redis.
* rate_limiting: Incluye la táctica de rate limiting usando nginx.

## Load Balancer

Ejecutar el docker compose con el siguiente parámetro para escalar el servicio.
```bash
docker compose up -d --scale node=3
```

## Rate Limiting
Se modifica el archivo de configuración de nginx, con la configuración del rate limiting.

