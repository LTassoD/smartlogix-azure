FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL base de la API. En Azure el frontend usa rutas same-origin (/api)
# porque nginx hace de proxy hacia el gateway, por lo que queda vacío.
ARG VITE_API_BASE_URL=
ARG VITE_API_USE_DEV_PROXY=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_USE_DEV_PROXY=$VITE_API_USE_DEV_PROXY

RUN npm run build

FROM nginx:1.27-alpine

# Usuario no root para nginx
RUN addgroup -S smartlogix && adduser -S -G smartlogix smartlogix \
    && chown -R smartlogix:smartlogix /var/cache/nginx /var/run /etc/nginx /usr/share/nginx/html

# La plantilla permite expandir SMARTLOGIX_GATEWAY_URL al arrancar
# (proxy same-origin hacia el API Gateway en Azure).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

COPY --from=build --chown=smartlogix:smartlogix /app/dist /usr/share/nginx/html

USER smartlogix
EXPOSE 80

CMD ["/start-nginx.sh"]
