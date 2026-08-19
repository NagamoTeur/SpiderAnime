FROM nginx:alpine

# Remove default Nginx site configs to prevent 404 conflicts
RUN rm -rf /etc/nginx/conf.d/*

# Copy web application assets to Nginx default html directory
COPY . /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
