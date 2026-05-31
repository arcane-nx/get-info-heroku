FROM node:18-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install clean production dependencies
RUN npm install

# Copy the rest of your server code
COPY . .

# Expose the port your server listens on
EXPOSE 3000

# Run your native Node.js start command
CMD ["npm", "start"]
