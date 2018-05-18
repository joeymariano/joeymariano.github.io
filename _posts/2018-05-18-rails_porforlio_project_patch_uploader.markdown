---
layout: post
title:      "Rails Porforlio Project:  Patch Uploader"
date:       2018-05-18 19:22:20 +0000
permalink:  rails_porforlio_project_patch_uploader
---


My final Ruby on Rails project is done.  The project is a social media platform where chiptune / tracker musicians can share instruments they make.  There are a few sites that are meant for sharing songs but I always wanted a site where composers and sound designers could share sound patches or instruments.  I've been primarily using the tracker Deflemask to make Sega Genesis style music for the last few years:

[Example of a song I made in Deflemask](https://www.youtube.com/watch?v=J8MfQLm-4GU)

During this time i used the program GensKmod to rip instrument patches from existing Sega Genesis ROMS:

[GensKmod Emulator](https://segaretro.org/Gens_KMod)

In other words, I stole some classic instruments from existing Sega Genesis soundtracks and I also created a lot of my own patches and tricks for the sound design.  I know a few other musicians who make some great Sega Genesis music.  I always want to get new ideas for sound design.  I have a unending appetite for new sounds.  So I wanted to facilitate more creativity in this are of music creation by letting people share sound design ideas more freely.

## Associations

My Patch Uploader site features a few interacting Ruby Objects:

* Users (have many Patches)
* Patches  (belong to Users and have many categories through patch categories)
* Categories (have many patches through patch categories)
* Patch Categories (uses a join table to facilitate patches having many categories and vice versa)

The idea is that users can upload patches and categorize them.  Other people can view the patches, their descriptions, download them and use them in their songs.  This is facilitated by Active Record's association methods and a join table called Patch Categories.

## Uploading Files

I used the carrier-wave gem to store and organize files.  Right now when a user uploads a file the gem's method stores the file in the public folder and organizes them in a logical manner.  The url of the file is then added to the Patch's object and stored in the database.  Carrier-wave was very easy to implement.   In order to upload files you create an uploader instance with the command:

``` rails g uploader <name>```

The uploader is then mounted to a Model using the syntax:

```mount_uploader :file, FileUploader```

Finally, in the view's form_for method a helper is needed:

```<%= f.file_field :file %>```

The carrier wave gem also give you access to a url method.  This allows downloading the file:

```<%= link_to 'Download', @patch.file.url %>```

## Nested Routes

In order to organize everything properly I used nested routes for the patches.  Patches belong to a User so therefor the url should look like:  /users/1/patches/1  or  /users/1/patches/new  etc.

```
Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root :to => 'welcome#index'

  resources :users, only: [:index, :show, :new, :create] do
    resources :patches, only: [:new, :create, :show, :edit, :update]
    get 'user/:id/patches/delete', to: 'patches#destroy', as: 'destroy_patch'
  end

  get '/patches', to: 'patches#index'

  get '/login', to: 'sessions#new'

  get '/logout', to: 'sessions#destroy'

  resources :sessions, only: [:create]

  resources :categories, only: [:index, :show, :new, :create]

  get '/auth/twitter/callback' => 'sessions#create'
end
```

You can see here that patches are nested underneath the user resources.  However, in order to list all of the patches the index view is not nested underneath the user.  The user view takes care of listing all of the user's patches.  I wanted to make that patches#index public so musicians who weren't loggeed in could see all of the patches / instruments uploaded.

## Helper Methods

Two helper methods were important to keep the views clean:

```
module UsersHelper
  def logged_in?
    session[:user_id]
  end

  def current_user
    if !session[:user_id]
      return nil
    else
      User.find(session[:user_id])
    end
  end
end
```

These are neccessary in order to detect if people are logged in.  The views display different information depending on whether a user is logged in and whether or not the user is currently viewing their own profile page.  An example of this is the welcome page:

```
<% if !logged_in? %>
  <p>Create an account, upload music tracker patches, download other people's patches.</p>
  <p><%= link_to('Log in / Sign up with Twitter', '/auth/twitter/') %> OR Use the normal stuff:</p>
  <h2><%= link_to 'Sign Up', new_user_path %></h2>
  <h2><%= link_to 'Log In', login_path %></h2>
<% end %>

<% if logged_in? %>
  <h2>NEWEST USER: <%= link_to User.newest_user.username, users_path(User.newest_user) %></h2>
  <h2>NEWEST Patch: <%= link_to Patch.newest_patch.name, patches_path(Patch.newest_patch) %></h2>
<% end %>
```

Here you can see that the homepage will display links to logins if the user is not logged in and if they are it displays the newest user and patch.









