---
layout: post
title:      "Javascript Context"
date:       2018-09-26 12:00:47 -0400
permalink:  javascript_context
---


The first thing to understand about 'context' in javascript is that it is not 'scope.'  Scope refers to variables and how and when they are declared and defined.  Context refers to the keyword 'this' and what it returns depending on where you see it inside your code.

In a global context the keyword 'this' will return the browser's window. 

```
this  // returns the Window object
```

If you see 'this' inside a function the keyword will also return the Window object.

```
function coolReturnBro() {
    return this;
}

coolReturnBro() // returns the Window object
```


Here is an example with an arrow funciton:

```
let testJawn = () => this

testJawn() // returns the Window object 
```

When an object is created in javascript ES6 the constructor function redefines 'this' and binds it to the object.

```
function NonCoolBro(){
    this.testingThis = this
}

let trump = new NonCoolBro
trump.testingThis // returns the NonCoolBro object
```

Here is an example with the class keyword:

```
class NonCoolBro {
   constructor() {
   this.testingThis = this
   }
}

let trump = new NonCoolBro
trump.testingThis // returns the NonCoolBro object
```

These also return the same results:

```
class NonCoolBro {
   constructor() {
    this.testThisFunction = function () {
	    return this
	   }
   }
}

let trump = new NonCoolBro
trump.testThisFunction() // returns the NonCoolBro object
```


```
class NonCoolBro {
   constructor() {
    this.testThisFunction = () => this
	   }
   }
}

let trump = new NonCoolBro
trump.testThisFunction() // returns the NonCoolBro object
```

There are some interesting behaviors to watch out for when one defining variables with functions.  The context can change depending on how the function is called.

```
function testFunct(){ return this }  

testFunct() // will return the Window object

let surprize = testFunct() 

surprize  // will return the Window object
```

Watch out if you don't specifically call the function!

```
function testFunct(){ return this }  

let surprize = testFunct  // if you don't specifically call the function

surprize  // returns the testFunct object
```

One thing to note is that there are some interesting behaviors when introducing the methods bind, call and apply.

```
let newJawn = {
 	test: function () { return this }   
}

newJawn.test() // will return the newJawn object
newJawn.test() === 'object'  //  see it's an object
```

What if we bind newJawn.test to the Window.  What will 'this' return?

```
let newJawn = {
 	test: function () { return this }   
}

newJawn.test.bind(Window)() // will return the Window Object
```

It can also be called like this

```
newJawn.test.call(Window)  // will return the Window Object

newJawn.test.apply(Window)  // will return the Window Object
```

