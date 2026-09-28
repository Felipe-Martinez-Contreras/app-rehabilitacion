# Etapa 1: compila la app (el prebuild copia los wasm de MediaPipe a public/wasm/).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: sirve dist/ con nginx en el puerto 8080 (el que usa Cloud Run por defecto).
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
