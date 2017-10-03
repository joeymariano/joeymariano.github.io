---
layout: post
title:      "Triangle Detector"
date:       2017-10-03 22:00:12 +0000
permalink:  triangle_detector
---

I had a great time trying to figure out a decent way to detect equilateral, isosceles, and scalene triangles.  I decided on creating three arrays.  The first array was the original side lengths collected from object initialization and the following arrays were rotated versions of the original.

```
def initialize(side_one, side_two, side_three)
  @all_sides = [side_one, side_two, side_three]
  @rotate_one = @all_sides.rotate
  @rotate_two = @all_sides.rotate(2)
end
```

This allowed me to test the sides against eachother using ruby's .each_index enumerator.  .each_index returns the index position of the array.  I could then use the position output to check side lengths against each of the three arrays i had initalized.

```
# check scalene
@all_sides.each_index do |index|
  if @all_sides[index] != @rotate_one[index] && @all_sides[index] != @rotate_two[index]
    result = :scalene
  end
end
```

The first thing i tried to resolve, before triangle type detection, was error detection.  The sum of the lengths of any two sides of a triangle always exceeds the length of the third side. This is a principle known as the triangle inequality.  I used this idea to detect invalid triangles.

```
# check validity
@all_sides.each_index do |index|
  if @all_sides[index] + @rotate_one[index] <= @rotate_two[index]
    check_inequality = true
  end
end

if @all_sides[0] <= 0 || @all_sides[1] <= 0 || @all_sides[2] <= 0 || check_inequality == true
  begin
   raise TriangleError
  end
else
 result
end
```

My completed Triangle Object:

```
class Triangle
  def initialize(side_one, side_two, side_three)
    @all_sides = [side_one, side_two, side_three]
    @rotate_one = @all_sides.rotate
    @rotate_two = @all_sides.rotate(2)
  end

  def kind
    result = nil
    check_inequality = false

    # check equilateral
    if @all_sides[0] == @all_sides[1] && @all_sides[0] == @all_sides[2]
      result = :equilateral
    end

    # check scalene
    @all_sides.each_index do |index|
      if @all_sides[index] != @rotate_one[index] && @all_sides[index] != @rotate_two[index]
        result = :scalene
      end
    end

    # check isosceles
    @all_sides.each_index do |index|
      if @all_sides[index] == @rotate_one[index] && @all_sides[index] != @rotate_two[index]
        result = :isosceles
      end
    end

    # check validity
    @all_sides.each_index do |index|
      if @all_sides[index] + @rotate_one[index] <= @rotate_two[index]
        check_inequality = true
      end
    end

    if @all_sides[0] <= 0 || @all_sides[1] <= 0 || @all_sides[2] <= 0 || check_inequality == true
      begin
       raise TriangleError
      end
    else
     result
    end
  end # end kind method

end # end class

class TriangleError < StandardError
end
```
