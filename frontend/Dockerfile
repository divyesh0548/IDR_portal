# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Verify build output exists
RUN ls -la dist/ || (echo "Build failed: dist folder not found" && exit 1)

# Production stage
FROM node:20-alpine AS runner

# Install tzdata for timezone support and set timezone to IST
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Kolkata /etc/localtime && \
    echo "Asia/Kolkata" > /etc/timezone

# Install serve globally for static file serving
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist /app/dist

# Set working directory
WORKDIR /app

# Set timezone environment variable
ENV TZ=Asia/Kolkata

# Expose port 3000
EXPOSE 3000

# Start serve with SPA fallback
CMD ["serve", "-s", "dist", "-l", "3000"]

