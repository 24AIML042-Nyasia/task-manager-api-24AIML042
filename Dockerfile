FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package files first so npm install is cached unless dependencies change
COPY package*.json ./

# Install dependencies inside the container environment
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the API server port
EXPOSE 5000

# Command to launch Express backend
CMD ["node", "index.js"]
