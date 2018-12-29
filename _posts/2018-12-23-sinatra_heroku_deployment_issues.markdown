---
layout: post
title:      "Sinatra Heroku Deployment Issues"
date:       2018-12-23 18:47:35 -0500
permalink:  sinatra_heroku_deployment_issues
---


I created a simple website using the Ruby based Sinatra framework for my electronic music project.  I developed it around the same time I was learning the framework at Flatiron School.  To get started I copy pasted a project that was working and used it as a template for my site.  Everything was fine when I first deployed it to Heroku.  At that time i embedded an iframe to display my upcoming concerts.  I always hated not being able to control the CSS of the iframe in an easy manner.  I created a hack to try an interject some css in the songkick.com widget:

```
<a href="https://www.songkick.com/artists/8980439" class="songkick-widget" data-theme="light" data-detect-style="true"  data-background-color="transparent">Nmlstyl tour dates</a>
<link href="css/style.css" rel="stylesheet">
<link href="css/responsive.css" rel="stylesheet">
<script src="//widget.songkick.com/8980439/widget.js"></script>
```

In the end that worked, however I had lots of issues changing the font.  I couldn't get the layout to look seamless either.  Editing another site's CSS was very tricky.  Recently I updated the above code to this in my erb file:

```
<h4>UPCOMING SHOWS</h4>
  <% if @events %>
    <% @events.each do |event| %>
      <ul>
        <li><a href='<%= event['uri'].downcase %>'>songkick.com link</a>
        <li><%= event['displayName'].downcase %></li>
        <li>city: <%= event['location']['city'].downcase %></li>
        <li>venue: <a href="<%= event['venue']['uri'] %>"><%= event['venue']['displayName'].downcase %></a></li>
      </ul>
    <% end %>
  <% else %>
    <ul>
      <li>no shows have been announced.</li>
    </ul>
  <% end %>
```

In my controller I added an http request using Ruby's built in Net:Http Class and then loaded the view.

```
get '/' do
  url = 'https://api.songkick.com/api/3.0/artists/8980439/calendar.json?apikey=' + ENV['SONGKICK_API_KEY']
  uri = URI(url)
  response = Net::HTTP.get(uri)
  result = JSON.parse(response)
  @events = result['resultsPage']['results']['event']
  erb :'root'
end
```

The trouble came when I tried to deploy my code in production mode to Sinatra.  I beleive the error was in my Rack configuration.  For some reason there were RackMethod::Override and Rack::Static Classes copied into the project from the begining.  They were making my application crash only when deployed to Heroku.  Locally everything was fine.  RackMethod::Override is used to support more than just GET and POST requests.  RackMethod::Override adds the ability to perform PATCH, UPDATE, and DELETE requests.  I removed that part because this website wasn't a CRUD application.  It's a single page that queries Songkick.com for concert listings before loading up.  The Rack::Static middleware intercepts requests for static files (javascript files, images, stylesheets, etc) based on the url prefixes or route mappings passed in the options, and serves them using a Rack::File object. 'This allows a Rack stack to serve both static and dynamic content.' Rack::Static definition from [RubyDoc.info](https://www.rubydoc.info/gems/rack/Rack/Static)

I was not giving Rack::Static any object and so perhaps that and or both of these useless Rack configurations were confusing Heroku.  I was tipped off by this Heroku article:  [Static Sites Ruby](https://devcenter.heroku.com/articles/static-sites-ruby) The article states:  'Static sites are sites that don’t contain any dynamic server-side functionality or application logic. Examples include brochure sites made up completely of HTML and CSS or even interactive client-side games built in Flash that don’t interact with a server component. Though these sites only require a web-server to deliver their content to users it’s still useful to use a platform like Heroku to quickly provision and deploy to such infrastructure.'  So in the end i beleive the Rack::Static method was stopping the Net::Http Class from be able to perform it's task and the app would crash.  I learned quite a bit from this infuriating bug.
