---
layout: post
title:      "Top Demos CLI APP"
date:       2017-10-24 01:30:25 -0400
permalink:  top_demos_cli_app
---


One of my favorite sites is Pouet.net.  It's a database for demoscene groups to catalog their demos and rankings in competitions, aka demo parties.  The Demoscene has been alive and thriving since the advent of the personal computer although, demo parties came about in the 1990's.  Now there are major international competitions.  The community grew out of the video game hacking community and the idea of injecting a cracktro (cracked intro) into to pirated C64, ZX Spectrum, and Amiga games.  Now the scene is less illegal and more interested in pushing hardware to it's limits.  It's a way for programmers to show off.

My Command Line Interface app is a program that scrapes Pouet.net.  It returns the top demos of the month and various information about them.  I enjoy watching demos on youtube so an important thing for me to accomplish was to have the youtube links front and center.  Using Ruby and Nokogiri i was able to grab all the information i needed.  Here is the Scraper Class I created:

```
class Scraper

  def initialize
    doc = Nokogiri::HTML(open("http://pouet.net/index.php"))
    create_demos(doc)
  end

  def create_demos(doc)
    title = nil
    group = nil
    url = nil
    type = nil
    platform = nil

    doc.css('#pouetbox_topmonth li').each do |demo|
      title = demo.css('span.prod').text
      group = demo.css('span.group a').text
      url = "http://pouet.net/" + demo.at_css('span.prod a')['href']
      type = demo.css('span.typeiconlist').text.chomp
      platform = demo.css('span.platformiconlist').text.chomp
      additional_info = get_frm_demos_pg(url)
      file_url = additional_info[0]
      youtube = additional_info[1]
      Demo.new(title, group, url, type, platform, youtube, file_url)
    end
  end

  def get_frm_demos_pg(url)
    result = []
    flag = true
    demo_doc = Nokogiri::HTML(open(url))

    demo_doc.css('#links ul li').each do |link|
      inquiry = link.at('a').attr('href')

      if flag == true
        result << inquiry
        flag = false
      end

      if inquiry.include?('youtu')
         result << inquiry
      end
    end
    result
    # result[0] returns file_url
    # result[1] returns youtube link
  end

end # end class
```

This class creates 10 Demos from the front page of Pouet.net.  It also collects attributes:  demo group, pouet url for the demo, type of demo, platform the demo runs on, the url of the file if you want to download it, and the youtube link.  You can see that the two functions create_demos and get_frm_demos_pg work together to collect the attributes.  create demos collects the information from the index page of pouet.net and get_frm_demos_pg scrapes the indivual demo page.  By using css selectors with Nokogiri I was able to get very specific and send all the attributes to my Demo instances.  Each Demo is saved upon initialization into the Demo.all array.

```
class Demo
  attr_reader :title, :group, :url, :type, :platform, :youtube, :file_url
  @@all = []

  def initialize(title, group, url, type, platform, youtube, file_url)
    @title = title
    @group = group
    @url = url
    @type = type
    @platform = platform
    @youtube = youtube
    @file_url = file_url
    @@all << self
  end

  def self.all
    @@all
  end

end
```

When the controller class Controller.call is called the interface starts:

```
  def call
    Scraper.new
    puts " "
    puts "*///// TOP DEMOS of the month FROM Pouet.net /////*"
    list_demos
    ask
  end # end call
```

The ask method sets off a chain of events to check for input after every action ie.  either listing the demos or getting more information:

```
  def ask
    puts "Type exit to leave."
    puts "Type list to list the demos again."
    puts "For more information type the demo's number."

    input = gets.strip

    numbers = [*(1..10)]
    numbers.collect! {|n| n.to_s}

    if !valid_input?(input, numbers)
      puts " "
      puts "Please enter a valid command."
      puts " "
      ask
    elsif input == 'list'
      list_demos
      ask
    elsif numbers.include?(input)
      more_info(input)
      ask
    else
      #exit program
    end
  end
```





