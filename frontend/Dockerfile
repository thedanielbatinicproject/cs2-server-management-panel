FROM node:18-alpine AS build
WORKDIR /app
COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
# Use relative URL - nginx will proxy /api to backend
ENV REACT_APP_API_URL=/api
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
