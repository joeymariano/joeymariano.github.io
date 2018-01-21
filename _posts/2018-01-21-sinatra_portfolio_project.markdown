---
layout: post
title:      "Sinatra Portfolio Project"
date:       2018-01-21 23:50:03 +0000
permalink:  sinatra_portfolio_project
---


Coming up with my portfolio project for the Sinatra section of Flatiron School's online curriculum was easy.  I've had the idea for a long time to create a website that lets Musician's anonomously review venues that they've delt with.  It's a resource that is missing for professional musicians that tour.  I've personally had clubs rip me off or yank me around in my 31 year music career.  Things can get pretty dicey out there for us.

I decided to create three models for my project:  musicians, reviews and venues.  Each musician would have many reviews and each venue would also have many reviews.  This association was easy to acheive with Active Record.

```
require 'bcrypt'

class Musician < ActiveRecord::Base
  include Slug::InstanceMethods
  extend Slug::ClassMethods

  has_many :reviews
  has_many :venues, through: :reviews
  has_secure_password
end

class Review < ActiveRecord::Base
  belongs_to :musician
  belongs_to :venue
end

class Venue < ActiveRecord::Base
  has_many :reviews
  has_many :musicians, through: :reviews
end
```

Musicians needed a secure password so I made sure to use bcrypt's has_secure_password method in the musician model.   In my migrations I made the musicians and venues tables have a name and reviews have content.  Additionally the venues table needed a location.  This was achieved by making a few simple migrations with Rake.  ie. rake db:create_migration NAME=create_musicians.

After the models were set up I began work on the controllers.  I created four controllers:  ApplicationController, MusiciansController, ReviewsController, and VenuesController.  The smallest controllers only needed a few methods.  The ApplicationController just needed a get request for the root index and the VenuesController just needed a method to show the venues with their reviews.  The most complex controllers were the MusiciansController and the ReviewsController.  The MusiciansController handles the login, logout, creation and show pages for each user.  Likewise the ReviewsController handles creating, editing, deleting and showing all the reviews.  Simple CRUD actions were deployed.

There were two things that really tripped me up:  the use of flash messages and also how to impliment a link back the the user's homepage in the layout erb.  Although I learned how to the rackflash3 gem in school I had some issues getting it working.  I read some stack exchange posts and decided to go with sinatra-flash instead.  It seemed to work better and i did some reading on the flash.now method.  For the layout.erb i kept using the incorrect syntax with quotes:

This did not work:
```
<%= '&nbsp; &nbsp;<a href='/musicians/#{@musician.slug}'>Home</a>' if session[:id] %>
```

After some thinking i realized that the use of single quotes inside single quotes didn't really make sense:
```
<%= "&nbsp; &nbsp;<a href='/musicians/#{@musician.slug}'>Home</a>" if session[:id] %>
```

Now everything is working great and I'm excited to add some more details.
