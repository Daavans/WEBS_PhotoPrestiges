FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p /uploads/photos /uploads/thumbnails
EXPOSE 3003
CMD ["node", "src/index.js"]
