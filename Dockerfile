FROM nginx:alpine
# Ensure you've run `grunt build`
COPY dist/ /var/www/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
