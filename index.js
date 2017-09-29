const dotenv = require('dotenv').config()
const fs = require('fs')
const Twitter = require('twitter')
const date = new Date()

// All keys and secrets should be in .env file
const secrets = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.API_SECRET,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.AT_SECRET
}

const client = new Twitter(secrets)

// Parameters sent to request followers, modify as necessary
const params = {
  screen_name: 'planamag',
  stringify_ids: 'true',
  count: '5000',
  cursor: '-1'
}

// If using writing to file, set file path here
const filePath = 'blockList.csv'

function getFollowers (p, list, callback, output) {
  console.log(`Fetching followers at ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`)
  client.get('followers/ids', p, function (err, res, body) {
    if (!err) {
      // If no error
      list = list.concat(res.ids)
      var remain = parseInt(body.headers['x-rate-limit-remaining'])
      var reset = body.headers['x-rate-limit-reset'] - Math.floor(date.getTime() / 1000) + 1
      if (res.next_cursor_str === '0') {
        // If last page of results, send list of ids to callback
        console.log('Found', list.length, 'users...')
        callback(list, [], output)
      } else {
        // Else set cursor to next page
        p.cursor = res.next_cursor_str
        if (remain === 0) {
          // About to hit limit, wait until reset time
          console.log('Hitting limit, waiting', reset, 'seconds...')
          setTimeout(function () {
            getFollowers(p, list)
          }, reset * 1000)
        } else {
          // Else make next request
          getFollowers(p, list)
        }
      }
    } else {
      // Else print error with parameters
      console.log('Error:', err)
      console.log('Error:', p)
    }
  })
}

function getUserObjects (ids, results, callback) {
  // Take out first 100 from list (endpoint has limit of 100 ids per call)
  var list = ids.splice(0, 100).join(',')
  // Create parameters
  var p = {
    user_id: list
  }
  client.post('users/lookup', p, function (err, res, body) {
    if (!err) {
      // If no error
      var filtered = []
      res.forEach(function (user) {
        // Iterate through users
        if (isBot(user)) {
          // If user is identified as bot, push id to filtered list
          filtered.push(user.id_str)
        }
      })
      results = results.concat(filtered)
      var remain = parseInt(body.headers['x-rate-limit-remaining'])
      var reset = body.headers['x-rate-limit-reset'] - Math.floor(date.getTime() / 1000) + 1
      if (ids.length < 1) {
        // All IDs requested, send list of ids to callback
        if (results.length > 0) {
          // If there are IDs to process, move to processing
          console.log('Blocking', results.length, 'users...')
          callback(results)
        } else {
          // No IDs to process, run again in 5 min
          console.log('No fake followers found, running again in 5 minutes')
          setTimeout(function () {
            getFollowers(params, [], getUserObjects, printToFile)
          }, 300000)
        }
      } else {
        // IDs remaining, keep requesting
        if (remain === 0) {
          // About to hit limit, wait to reset
          setTimeout(function () {
            getUserObjects(ids, results, callback)
          }, reset * 1000)
        } else {
          // Else make next request
          getUserObjects(ids, results, callback)
        }
      }
    } else {
      // Else print error with parameters
      console.log('Error:', err)
      console.log('Error:', p)
    }
  })
}

function isBot (user) {
  // Define conditions here
  var defaultPic = user.profile_image_url === 'http://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
  var fewFollowers = user.followers_count < 10
  var fewStatuses = user.statuses_count < 5

  // Put the conditions you want to check against into array
  var filters = [defaultPic, fewStatuses] // [defaultPic, fewStatuses, fewFollowers] if you want to include users with < 10 followers

  // Reduce into a final judgement, currently checks for all conditions to exist
  return filters.reduce(function (acc, i) {
    return acc && i
  }, true)
}

function printToFile (list) {
  var wstream = fs.createWriteStream(filePath)
  for (var i = 0; i < list.length; i++) {
    // Iterate through list, print each id on new line
    if (i !== list.length - 1) {
      wstream.write(`${list[i]}\n`)
    } else {
      // File cannot end with an empty line because it will crash Twitter's import mechanism
      wstream.write(`${list[i]}`)
    }
  }
  wstream.end()
  console.log(`Finished writing at ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}!\n`)
  // Run again in 5 min
  setTimeout(function () {
    getFollowers(params, [], getUserObjects, printToFile)
  }, 300000)
}

function blockUsers (list) {
  var p = {
    user_id: list.pop().id_str
  }
  client.post('blocks/create', p, function (err, res, body) {
    if (!err) {
      var remain = parseInt(body.headers['x-rate-limit-remaining'])
      var reset = body.headers['x-rate-limit-reset'] - Math.floor(date.getTime() / 1000) + 1
      if (list.length < 1) {
        console.log(`Finished blocking at ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}!\n`)
        // Run again in 5 min
        setTimeout(function () {
          getFollowers(params, [], getUserObjects, blockUsers)
        }, 300000)
      } else {
        // IDs remaining, keep blocking
        if (remain === 0) {
          // About to hit limit, wait to reset
          setTimeout(function () {
            blockUsers(list)
          }, reset * 1000)
        } else {
          // Else make next request
          blockUsers(list)
        }
      }
    } else {
      // Else print error with parameters
      console.log('Error:', err)
      console.log('Error:', p)
    }
  })
}

// Start the process
getFollowers(params, [], getUserObjects, printToFile)