FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_API_USE_DEV_PROXY=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_USE_DEV_PROXY=$VITE_API_USE_DEV_PROXY

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

