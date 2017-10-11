# removefakefollowers

## How to Use
1) Clone to working directory
2) Run `npm install` to install dependencies (If you do not have Node.js or NPM installed you will need to install them)
3) Create a `.env` file to store your API credentials
4) Set options in `index.js`
5) Run `npm start` to start the program

Blocking unwanted users is the default behavior, no file will be created if this option is selected. Alternatively, if you'd rather use Twitter's importing functions, the appropriate output function should be set in the options of `index.js`. 

I recommend importing CSVs if you expect to block more than 1k users at a given time.

If you print to file, a file will be created if it does not yet exists and will be overwrite the file if it does. You must take this list to your Account Settings and import the list of ids to block manually.

Currently users with a default profile picture, less than 10 followers, and less than 5 tweets are considered fake. If you would like to use a different set of parameters, modify the `isBot` function in `index.js`.