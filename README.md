# midja-map
The map maker for the midja portal


So, to get started you need npm, then

* Install yo, bower, grunt `npm install -g yo bower grunt-cli`
* Install scaffolding `npm install -g generator-angular` (more info here http://yeoman.io/learning/index.html)

In the project directory
* Install node modules `npm install`
* Install bower packages `bower install`

Running locally
* Run `grunt serve`. It should open up the map maker in the browser. It uses a proxy to request data from the server.

Building
* Run `grunt build`. This will minify uglify and a bunch of other stuff to the files in `app/` and stick the output files in `dist/`.

Deploying
* Run `grunt gh-pages`. This will upload the files in `dist/` to the Github Pages branch of hte repo.

Building & Deploying
* Run `grunt deploy`. This includes the `grunt build` and `grunt gh-pages` steps.G
