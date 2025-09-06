FROM node:24

RUN mkdir -p /app
WORKDIR /app

RUN npm install -g web-ext

CMD ["web-ext" "build"]