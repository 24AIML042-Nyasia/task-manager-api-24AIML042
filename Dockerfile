FROM node:18

WORKDIR /app

# Copy package files first so npm install is cached unless dependencies change
COPY package*.json ./

RUN npm install

# Copy the rest of the source code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
