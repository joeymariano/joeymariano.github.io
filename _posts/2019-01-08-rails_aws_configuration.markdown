---
layout: post
title:      "Rails AWS Configuration"
date:       2019-01-08 18:47:35 -0500
permalink:  rails-aws-configuration
---

Trying to figure out how to use the carrierwave gem with rails (on Heroku) to upload files to AWS turned out to be a difficult task.  Most of the problems I ran into had nothing to do with code but how permissions were set up on my Amazon S3 bucket.  My carrierwave.rb initializer looked like this:

```
CarrierWave.configure do |config|

  if Rails.env.production?
    config.fog_provider = 'fog/aws'                        # required
    config.fog_credentials = {
      provider:              'AWS',                        # required
      aws_access_key_id:     ENV["AWS_ACCESS_KEY"],        # required
      aws_secret_access_key: ENV["AWS_SECRET_KEY"],        # required
      region: ENV["S3_REGION"]
    }
    config.fog_directory  = ENV["AWS_BUCKET"]              # required
  else
    config.permissions = 0666
    config.directory_permissions = 0777
    config.storage = :file
  end

end
```

...and my FileUploader class:

```
class FileUploader < CarrierWave::Uploader::Base

  if Rails.env.production?
    storage :fog
  else
    storage :file
  end

  def store_dir
    "public/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  def extension_whitelist
    %w(y12 dmp tfi bin fti)
  end

end
```

and in my Gemfile:

```
gem 'carrierwave'
gem 'fog-aws'
```

In dev mode I stored the files locally in the public folder but in production mode i needed to use :fog instead of :file.  That's why you see a lot of checks to Rails.env ...to check if we're in dev or production mode.  The problems came when I keep getting this error in my Heroku logs.  (heroku logs --tail to continually stream logs)

```
Excon::Errors::Forbidden (Expected(200) <=> Actual(403 Forbidden)
```

After resolving that my code was rock solid (I read several key blogs on the issue), I had a hunch that Forbidden meant there was a permissions error.  In the AWS IAM console I made sure that my user had access to the bucket I was using but it turns out that wasn't enough.  The permission on the public folder in the bucket needed to be actually set to public.  Just because the folder was named public didn't mean anything.  It needed to be changed to public access.
