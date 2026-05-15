FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy all files
COPY . /

# Install root dependencies (including workspaces)
RUN npm ci --omit=dev --silent || npm install --no-audit --no-fund --silent

# Install server dependencies explicitly
RUN cd /usr/src/app/server && npm ci --omit=dev --silent || npm install --no-audit --no-fund --silent

# Build the React app
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the combined server which serves API and static files
CMD ["node", "server/server.js"]
