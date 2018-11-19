---
layout: post
title:      "React Frontend Rails Backend Architecture"
date:       2018-11-19 00:33:01 +0000
permalink:  react_frontend_rails_backend_architecture
---


For my final project for Flatiron School I created a website with a Rails Backend and a React Frontend.  I decided to make a site that queries Songkick.com and Bandsintown.com.  Some bands I know use different services so instead of visiting two different sites I wanted have the results in a centralized location.  Eventually I want to add Facebook events in another column.  I guess you could say my idea is like the Kayak.com version of finding concerts.

Setting up the project wasn't too hard.  After reading this [blog post](https://www.fullstackreact.com/articles/how-to-get-create-react-app-to-work-with-your-rails-api/), I was able to get things up an running.  The general architecture of the site uses React with Redux, Redux-Thunk and ReactRouter.  React would manage cookies, send Ajax requests and Rails would authorize logins, sign ups, act as an API and save favorite artist queries.  At first I tried to use Rails to manage sessions but ultimately the easiest approach was to use the npm package [React-Cookie](https://www.npmjs.com/package/react-cookie) and let the front end set the cookie while the backend delt with authorization.  I also ran into some trouble with CORS:  [Cross Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).  At first I tried to solve the problem with a [Chrome plugin](https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi).  Ultimately after some research I realized that I needed to add some Rack middleware in my backend.  I noticed this in the rails-api gemfile:

```
# Use Rack CORS for handling Cross-Origin Resource Sharing (CORS), making cross-origin AJAX possible
gem 'rack-cors', require: 'rack/cors'
```
