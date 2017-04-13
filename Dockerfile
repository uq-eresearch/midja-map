FROM nginx:alpine

# Ensure you've run `grunt build`
COPY dist/ /usr/share/nginx/html/
