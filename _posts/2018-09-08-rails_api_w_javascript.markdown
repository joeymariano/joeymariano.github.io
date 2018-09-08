---
layout: post
title:      "Rails API w/ Javascript"
date:       2018-09-08 20:27:02 +0000
permalink:  rails_api_w_javascript
---

Using the Active Model Serializers gem and jquery's ajax methods I was able to add some extra functionality to my Rails app.  The site lets users upload electronic music instruments (a 'patch') and I wanted to add comments to the patches show page without refreshing the page .  Along with adding comments I wanted to add some pagination to the patches index page so users can scroll through recent uploads.

I ran into some trouble when trying to access a Patch's creator but I realised that the active model serializer gem has some gret functionality.

```
class PatchSerializer < ActiveModel::Serializer
  attributes :id, :name, :file, :game, :original, :user_id, :user

  has_many :comments
end
```

I just needed to add the :user symbol to the included attributes in the serializer model.  Trying to daisy chain ajax calls caused some unexpected errors.  At first I tried to make two ajax calls:  First to the Patch and then to the User with the user_id but that was easily avoided by including the user just like I would do in the ruby code.

```
@patch.user
```

I also translated the ruby object into a javascript object (during the done() method of the ajax call) using this code:

``` 
class Patch {
    constructor(patchname, patch_id, username, user_id) {
      this.patchname = patchname
      this.patch_id = patch_id
      this.username = username
      this.user_id = user_id
      PATCHES.push(this)
    }
    createLi() {
      return `<li class="patch"><p>
      <a href="/users/${this.user_id}/patches/${this.patch_id}">${this.patchname}</a><br>
      Posted By: <a href="/users/${this.user_id}">${this.username}</a></p></li>`
    }
  }
```
	
	
The createLi() method allowed for a quick append to the #patches div element.
