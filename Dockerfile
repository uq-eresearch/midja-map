FROM nginx:alpine
COPY dist/ /var/www/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
