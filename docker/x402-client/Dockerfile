FROM node:18-alpine

WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY index.ts ./

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
