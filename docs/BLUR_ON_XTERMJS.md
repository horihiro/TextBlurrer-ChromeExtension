# How to blur text on Xterm.js
[![](https://github.com/xtermjs/xterm.js/raw/master/logo-full.png)](https://xtermjs.org/)

Xterm.js is a front-end component that lets applications bring fully-featured terminals to their users in the browser[^1]

[^1]: https://github.com/xtermjs/xterm.js/blob/master/README.md

Xterm.js has some types of renderer as followings.
  - WebGL
  - Canvas
  - DOM

From point of view of the rendering performance, WebGL renderer is most recommended.
But Text Blurrer cannot blur text rendered by WebGL renderer and Canvas renderer because they draw text on HTML Canvas.

If you want to blur text on Xterm.js-base terminal, you should check which type of renderer is used to render text on the terminal and if the application using Xterm.js has a option to switch the renderer type of Xterm.js

> [!NOTE]
> Switching to DOM renderer for Xterm.js might cause performance issue of the terminal rendering.

> [!NOTE]
> DOM renderer seems to renders one line in the terminal as one `div` element. 
> So when long text is splitted to two lines because of the terminal width, making complicated regular expression is needed in order to blur the text as one keyword.  

## GitHub Codespaces
The terminal on GitHub Codespaces is based on Xterm.js.

Though the default renderer is WebGL renderer, it has a option about the terminal rendering.  
By setting `terminal.integrated.gpuAcceleration` to `off`, DOM renderer can be enabled and text on the terminal can be blurred.
![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/3165d94c-38ac-48e9-b4db-6bad845f153b)

Example: realtime blurring output of `az account show` and `az sp create-for-rbac`

https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/06264b16-cca3-4350-9680-25c556ced988

## Azure Cloud Shell
It seem that there is no option to switch rendering option, so it's difficult to blur text on Azure Cloud Shell currently.