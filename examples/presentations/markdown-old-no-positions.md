# Markdown-Impress

-----------------------------
## What is it
*markdown-impress* is a tool to convert markdown to impress page.

-----------------------------
## How to install
+ Firstly you should install [nodejs](http://nodejs.org)
+ Then install it use `$ npm install -g markdown-impress`

-----------------------------
## Markdown format
+ use `------` to separate each slide
+ use comment to set impress attr, such as `<!-- x=0 y=0 rotate=0 -->`
+ [this page](http://steel1990.github.io/markdown-impress/) is made by *markdown-impress* use [this markdown](https://raw.githubusercontent.com/steel1990/markdown-impress/master/README.md).

-----------------------------
## How To Use
![How to use mtoi](./img/icon.png)

-------------------------------
## Use in your code

    var fs = require('fs');
    var mtoi = require('markdown-impress');
    var content = mtoi('file.md');
    fs.writeFileSync('file.html', content);
